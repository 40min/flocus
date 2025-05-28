from typing import Dict, List

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
from app.mappers.day_template_mapper import DayTemplateMapper
from app.mappers.time_window_mapper import TimeWindowMapper


class DayTemplateService:
    def __init__(self, engine: AIOEngine = Depends(get_database)):
        self.engine = engine

    async def _fetch_and_build_time_window_response_map(
        self, time_window_object_ids: List[ObjectId], current_user_id: ObjectId
    ) -> Dict[ObjectId, TimeWindowResponse]:
        """
        Fetches TimeWindow models and their related Category models for the given ObjectIds,
        validates ownership and existence, and returns a map of TimeWindow ObjectId to TimeWindowResponse.
        """
        if not time_window_object_ids:
            return {}

        unique_tw_ids = list(set(time_window_object_ids))

        time_window_models_db = await self.engine.find(
            TimeWindow,
            TimeWindow.id.in_(unique_tw_ids),
            TimeWindow.user == current_user_id,
            TimeWindow.is_deleted == False,  # noqa: E712
        )

        found_tw_ids_set = {tw.id for tw in time_window_models_db}
        for tw_id_to_check in unique_tw_ids:
            if tw_id_to_check not in found_tw_ids_set:
                raise TimeWindowNotFoundException(time_window_id=str(tw_id_to_check))

        time_windows_map_models = {tw.id: tw for tw in time_window_models_db}

        category_ids_for_tws = list(set(tw.category for tw in time_window_models_db))
        categories_db = []
        if category_ids_for_tws:
            categories_db = await self.engine.find(
                Category,
                Category.id.in_(category_ids_for_tws),
                Category.user == current_user_id,
                Category.is_deleted == False,  # noqa: E712
            )
        categories_map_models = {cat.id: cat for cat in categories_db}

        time_window_response_map: Dict[ObjectId, TimeWindowResponse] = {}
        for tw_id in unique_tw_ids:
            tw_model = time_windows_map_models[tw_id]
            category_model = categories_map_models.get(tw_model.category)
            if not category_model:
                raise CategoryNotFoundException(
                    detail=f"Category for TimeWindow {tw_model.id} not found or not accessible."
                )
            tw_response = TimeWindowMapper.to_response(tw_model, category_model)
            time_window_response_map[tw_id] = tw_response
        return time_window_response_map

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

        day_template_model = DayTemplateMapper.to_model_for_create(
            schema=template_data, user_id=current_user_id, validated_time_window_ids=time_window_ids_for_template
        )
        await self.engine.save(day_template_model)

        tw_response_map = await self._fetch_and_build_time_window_response_map(
            day_template_model.time_windows, current_user_id
        )
        ordered_tw_responses = [
            tw_response_map[tw_id] for tw_id in day_template_model.time_windows if tw_id in tw_response_map
        ]
        return DayTemplateMapper.to_response(day_template_model, ordered_tw_responses)

    async def get_day_template_by_id(self, template_id: ObjectId, current_user_id: ObjectId) -> DayTemplateResponse:
        day_template_model = await self.engine.find_one(DayTemplate, DayTemplate.id == template_id)
        if day_template_model is None:
            raise DayTemplateNotFoundException(template_id=template_id)

        if day_template_model.user != current_user_id:
            raise NotOwnerException(
                resource="day template",
                detail_override="Ownership check failed",
            )
        tw_response_map = await self._fetch_and_build_time_window_response_map(
            day_template_model.time_windows, current_user_id
        )
        ordered_tw_responses = [
            tw_response_map[tw_id] for tw_id in day_template_model.time_windows if tw_id in tw_response_map
        ]
        return DayTemplateMapper.to_response(day_template_model, ordered_tw_responses)

    async def get_all_day_templates(self, current_user_id: ObjectId) -> List[DayTemplateResponse]:
        user_templates_models = await self.engine.find(DayTemplate, DayTemplate.user == current_user_id)

        all_tw_ids_nested = [tm.time_windows for tm in user_templates_models if tm.time_windows]
        all_tw_ids_flat_unique = list(set(item for sublist in all_tw_ids_nested for item in sublist))

        tw_response_map: Dict[ObjectId, TimeWindowResponse] = {}
        if all_tw_ids_flat_unique:
            tw_response_map = await self._fetch_and_build_time_window_response_map(
                all_tw_ids_flat_unique, current_user_id
            )

        response_list: List[DayTemplateResponse] = []
        for template_model in user_templates_models:
            ordered_tw_responses = [
                tw_response_map[tw_id] for tw_id in template_model.time_windows if tw_id in tw_response_map
            ]
            response_list.append(DayTemplateMapper.to_response(template_model, ordered_tw_responses))
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
        tw_response_map = await self._fetch_and_build_time_window_response_map(
            day_template_raw_model.time_windows, current_user_id
        )
        ordered_tw_responses = [
            tw_response_map[tw_id] for tw_id in day_template_raw_model.time_windows if tw_id in tw_response_map
        ]
        return DayTemplateMapper.to_response(day_template_raw_model, ordered_tw_responses)

    async def delete_day_template(self, template_id: ObjectId, current_user_id: ObjectId) -> bool:
        day_template_model = await self.engine.find_one(DayTemplate, DayTemplate.id == template_id)
        if day_template_model is None:
            raise DayTemplateNotFoundException(template_id=template_id)
        if day_template_model.user != current_user_id:
            raise NotOwnerException(resource="day template", detail_override="Ownership check failed")

        await self.engine.delete(day_template_model)  # engine.delete expects the model instance
        return True
