from typing import List

from fastapi import Depends
from odmantic import AIOEngine, ObjectId

from app.api.schemas.day_template import DayTemplateCreateRequest, DayTemplateResponse, DayTemplateUpdateRequest
from app.api.schemas.time_window import TimeWindowResponse
from app.core.exceptions import (
    CategoryNotFoundException,
    DayTemplateNameExistsException,
    DayTemplateNotFoundException,
    NotOwnerException,
    TimeWindowNotFoundException,
)
from app.db.connection import get_database
from app.db.models.category import Category
from app.db.models.day_template import DayTemplate
from app.db.models.time_window import TimeWindow

# User model import removed as it's not directly used for DayTemplateResponse construction here
# from app.db.models.user import User


class DayTemplateService:
    def __init__(self, engine: AIOEngine = Depends(get_database)):
        self.engine = engine

    async def _build_day_template_response(self, template_model: DayTemplate) -> DayTemplateResponse:
        """
        Constructs a DayTemplateResponse from a DayTemplate model instance,
        populating nested TimeWindowResponse objects with their related Category data.
        """
        populated_tw_responses: List[TimeWindowResponse] = []
        if template_model.time_windows:  # This is List[ObjectId] from DayTemplate model
            for tw_object_id in template_model.time_windows:
                tw_model = await self.engine.find_one(TimeWindow, TimeWindow.id == tw_object_id)
                if not tw_model:
                    raise TimeWindowNotFoundException(time_window_id=str(tw_object_id))

                category_model = await self.engine.find_one(Category, Category.id == tw_model.category)
                if not category_model:
                    raise CategoryNotFoundException(detail=f"Category for TimeWindow {tw_model.id} not found.")

                # Prepare data for TimeWindowResponse.model_validate()
                # It needs 'category' to be a Category model instance (or dict)
                # and other fields from tw_model.
                tw_data_for_response = tw_model.model_dump()
                tw_data_for_response["category"] = category_model
                # tw_model.user is ObjectId, TimeWindowResponse.user_id is ObjectId. This is fine.
                # If TimeWindowResponse expected a UserResponse for a 'user' field,
                # we'd need to fetch User model here too.

                populated_tw_responses.append(TimeWindowResponse.model_validate(tw_data_for_response))

        return DayTemplateResponse(
            id=template_model.id,
            name=template_model.name,
            description=template_model.description,
            user_id=template_model.user,
            time_windows=populated_tw_responses,
        )

    async def create_day_template(
        self, template_data: DayTemplateCreateRequest, current_user_id: ObjectId
    ) -> DayTemplateResponse:
        existing_template = await self.engine.find_one(
            DayTemplate,
            DayTemplate.name == template_data.name,
            DayTemplate.user == current_user_id,
        )
        if existing_template:
            raise DayTemplateNameExistsException(name=template_data.name)

        time_window_ids_for_template: List[ObjectId] = []
        if template_data.time_windows:
            fetched_windows = await self.engine.find(
                TimeWindow,
                TimeWindow.id.in_(template_data.time_windows),
                TimeWindow.user == current_user_id,
            )
            if len(fetched_windows) != len(set(template_data.time_windows)):
                found_ids = {tw.id for tw in fetched_windows}
                missing_ids = [str(tid) for tid in template_data.time_windows if tid not in found_ids]
                raise TimeWindowNotFoundException(time_window_id=missing_ids[0])
            time_window_ids_for_template = [tw.id for tw in fetched_windows]

        day_template_model = DayTemplate(
            name=template_data.name,
            description=template_data.description,
            time_windows=time_window_ids_for_template,
            user=current_user_id,
        )
        await self.engine.save(day_template_model)
        return await self._build_day_template_response(day_template_model)

    async def get_day_template_by_id(self, template_id: ObjectId, current_user_id: ObjectId) -> DayTemplateResponse:
        day_template_model = await self.engine.find_one(DayTemplate, DayTemplate.id == template_id)
        if day_template_model is None:
            raise DayTemplateNotFoundException(template_id=template_id)

        if day_template_model.user != current_user_id:
            raise NotOwnerException(
                resource="day template",
                detail_override="Ownership check failed",
            )
        return await self._build_day_template_response(day_template_model)

    async def get_all_day_templates(self, current_user_id: ObjectId) -> List[DayTemplateResponse]:
        user_templates_models = await self.engine.find(DayTemplate, DayTemplate.user == current_user_id)
        response_list: List[DayTemplateResponse] = []
        for template_model in user_templates_models:
            response_list.append(await self._build_day_template_response(template_model))
        return response_list

    async def update_day_template(
        self,
        template_id: ObjectId,
        template_data: DayTemplateUpdateRequest,
        current_user_id: ObjectId,
    ) -> DayTemplateResponse:
        day_template_raw_model = await self.engine.find_one(DayTemplate, DayTemplate.id == template_id)
        if day_template_raw_model is None:
            raise DayTemplateNotFoundException(template_id=template_id)

        if day_template_raw_model.user != current_user_id:
            raise NotOwnerException(
                resource="day template",
                detail_override="Ownership check failed",
            )

        update_fields = template_data.model_dump(exclude_unset=True)

        if "name" in update_fields and update_fields["name"] != day_template_raw_model.name:
            existing_template_check = await self.engine.find_one(
                DayTemplate,
                DayTemplate.name == update_fields["name"],
                DayTemplate.user == current_user_id,
            )
            if existing_template_check:
                raise DayTemplateNameExistsException(name=update_fields["name"])
            day_template_raw_model.name = update_fields["name"]

        if "description" in update_fields:
            day_template_raw_model.description = update_fields["description"]

        if "time_windows" in update_fields:
            new_time_window_object_ids = update_fields["time_windows"]
            if new_time_window_object_ids is not None:
                if new_time_window_object_ids:  # If list is not empty, validate IDs
                    fetched_new_windows = await self.engine.find(
                        TimeWindow,
                        TimeWindow.id.in_(new_time_window_object_ids),
                        TimeWindow.user == current_user_id,
                    )
                    if len(fetched_new_windows) != len(set(new_time_window_object_ids)):
                        found_new_ids = {tw.id for tw in fetched_new_windows}
                        missing_new_ids = [str(tid) for tid in new_time_window_object_ids if tid not in found_new_ids]
                        raise TimeWindowNotFoundException(time_window_id=missing_new_ids[0])
                    day_template_raw_model.time_windows = [tw.id for tw in fetched_new_windows]
                else:  # An empty list was provided, so clear the time_windows
                    day_template_raw_model.time_windows = []

        await self.engine.save(day_template_raw_model)
        return await self._build_day_template_response(day_template_raw_model)

    async def delete_day_template(self, template_id: ObjectId, current_user_id: ObjectId) -> bool:
        day_template_model = await self.engine.find_one(DayTemplate, DayTemplate.id == template_id)
        if day_template_model is None:
            raise DayTemplateNotFoundException(template_id=template_id)
        if day_template_model.user != current_user_id:
            raise NotOwnerException(resource="day template", detail_override="Ownership check failed")

        await self.engine.delete(day_template_model)  # engine.delete expects the model instance
        return True
