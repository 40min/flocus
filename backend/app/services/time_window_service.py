from typing import List

from fastapi import Depends
from odmantic import AIOEngine, ObjectId

from app.api.schemas.time_window import TimeWindowCreateRequest, TimeWindowResponse, TimeWindowUpdateRequest
from app.core.exceptions import InvalidTimeWindowTimesException  # Added
from app.core.exceptions import (
    CategoryNotFoundException,
    DayTemplateNotFoundException,
    NotOwnerException,
    TimeWindowNameExistsException,
    TimeWindowNotFoundException,
)
from app.db.connection import get_database
from app.db.models.category import Category
from app.db.models.day_template import DayTemplate
from app.db.models.time_window import TimeWindow
from app.mappers.time_window_mapper import TimeWindowMapper


class TimeWindowService:
    def __init__(self, engine: AIOEngine = Depends(get_database)):
        self.engine = engine

    async def create_time_window(
        self, time_window_data: TimeWindowCreateRequest, current_user_id: ObjectId
    ) -> TimeWindowResponse:
        # Validate category
        category = await self.engine.find_one(
            Category,
            Category.id == time_window_data.category,
            Category.is_deleted == False,  # noqa: E712
        )
        if not category:
            raise CategoryNotFoundException(
                category_id=str(time_window_data.category), detail="Active category not found."
            )
        if category.user != current_user_id:
            raise NotOwnerException(resource="category", detail_override="Category not owned by user.")

        # Validate day_template
        day_template = await self.engine.find_one(DayTemplate, DayTemplate.id == time_window_data.day_template_id)
        if not day_template:
            raise DayTemplateNotFoundException(template_id=str(time_window_data.day_template_id))
        if day_template.user != current_user_id:
            raise NotOwnerException(resource="day template", detail_override="Day template not owned by user.")

        # Check for existing active time window with the same name for this user
        # Name is usually UUID-based by default, but user can provide it.
        existing_tw_with_name = await self.engine.find_one(
            TimeWindow,
            TimeWindow.name == time_window_data.name,
            TimeWindow.user == current_user_id,
            TimeWindow.is_deleted == False,  # noqa: E712
        )
        if existing_tw_with_name:
            raise TimeWindowNameExistsException(name=time_window_data.name)

        time_window = TimeWindowMapper.to_model_for_create(schema=time_window_data, user_id=current_user_id)
        await self.engine.save(time_window)
        # The 'category' variable is already fetched and validated in this method.
        return TimeWindowMapper.to_response(time_window, category)

    async def get_time_window_by_id(self, time_window_id: ObjectId, current_user_id: ObjectId) -> TimeWindowResponse:
        time_window = await self.engine.find_one(
            TimeWindow, TimeWindow.id == time_window_id
        )  # Fetches regardless of is_deleted status
        if not time_window:
            raise TimeWindowNotFoundException(time_window_id=str(time_window_id))

        if time_window.user != current_user_id:
            raise NotOwnerException(resource="time window", detail_override="Not authorized to access this time window")

        category_model = await self.engine.find_one(
            Category,
            Category.id == time_window.category,
            Category.user == current_user_id,
            Category.is_deleted == False,  # noqa: E712
        )
        if not category_model:
            raise CategoryNotFoundException(
                detail=f"Category for TimeWindow {time_window.id} not found or not accessible."
            )

        return TimeWindowMapper.to_response(time_window, category_model)

    async def get_all_time_windows_for_user(self, current_user_id: ObjectId) -> List[TimeWindowResponse]:
        time_window_models = await self.engine.find(
            TimeWindow,
            TimeWindow.user == current_user_id,
            TimeWindow.is_deleted == False,  # noqa: E712
            sort=TimeWindow.start_time,
        )
        if not time_window_models:
            return []

        category_ids = list(set(tw.category for tw in time_window_models))
        categories_db = await self.engine.find(
            Category,
            Category.id.in_(category_ids),
            Category.user == current_user_id,
            Category.is_deleted == False,  # noqa: E712
        )
        categories_map = {cat.id: cat for cat in categories_db}

        response_list = []
        for tw_model in time_window_models:
            category_model = categories_map.get(tw_model.category)
            if not category_model:
                raise CategoryNotFoundException(
                    detail=f"Category for TimeWindow {tw_model.id} not found or not accessible."
                )
            response_list.append(TimeWindowMapper.to_response(tw_model, category_model))
        return response_list

    async def update_time_window(
        self,
        time_window_id: ObjectId,
        time_window_data: TimeWindowUpdateRequest,
        current_user_id: ObjectId,
    ) -> TimeWindowResponse:
        time_window = await self.engine.find_one(
            TimeWindow,
            TimeWindow.id == time_window_id,
            TimeWindow.is_deleted == False,  # noqa: E712
        )
        if not time_window:
            raise TimeWindowNotFoundException(time_window_id=str(time_window_id))

        if time_window.user != current_user_id:
            raise NotOwnerException(resource="time window", detail_override="Not authorized to update this time window")

        update_data = time_window_data.model_dump(exclude_unset=True)

        # Determine the category to use for the response and for validation.
        # Default to the current category of the time_window.
        category_for_response_model = await self.engine.find_one(
            Category,
            Category.id == time_window.category,
            Category.user == current_user_id,
            Category.is_deleted == False,  # noqa: E712
        )
        if not category_for_response_model:  # Should not happen if data is consistent
            raise CategoryNotFoundException(
                detail=f"Original category for TimeWindow {time_window.id} not found or not accessible."
            )

        if "name" in update_data and update_data["name"] != time_window.name:
            name_conflict_check = await self.engine.find_one(
                TimeWindow,
                TimeWindow.name == update_data["name"],
                TimeWindow.user == current_user_id,
                TimeWindow.id != time_window_id,
                TimeWindow.is_deleted == False,  # noqa: E712
            )
            if name_conflict_check:
                raise TimeWindowNameExistsException(name=update_data["name"])

        if "category" in update_data:
            new_category_id = update_data["category"]
            validated_new_category = await self.engine.find_one(
                Category, Category.id == new_category_id, Category.is_deleted == False  # noqa: E712
            )
            if not validated_new_category:
                raise CategoryNotFoundException(
                    category_id=str(new_category_id), detail="Active category for update not found."
                )
            if validated_new_category.user != current_user_id:
                raise NotOwnerException(resource="category", detail_override="New category not owned by user.")
            category_for_response_model = validated_new_category  # Use the new category for response

        # Check start_time and end_time consistency if both are provided or one is provided and other exists
        merged_start_time = update_data.get("start_time", time_window.start_time)
        merged_end_time = update_data.get("end_time", time_window.end_time)

        if merged_end_time <= merged_start_time:
            # This validation is also in Pydantic model, but good to have defense in depth
            # or if only one is updated, check against the existing value.
            raise InvalidTimeWindowTimesException()

        time_window = TimeWindowMapper.to_model_for_update(time_window, time_window_data)

        await self.engine.save(time_window)
        return TimeWindowMapper.to_response(time_window, category_for_response_model)

    async def delete_time_window(self, time_window_id: ObjectId, current_user_id: ObjectId) -> bool:
        time_window = await self.engine.find_one(
            TimeWindow, TimeWindow.id == time_window_id
        )  # Fetches regardless of is_deleted status
        if not time_window:
            raise TimeWindowNotFoundException(time_window_id=str(time_window_id))

        if time_window.user != current_user_id:
            raise NotOwnerException(resource="time window", detail_override="Not authorized to delete this time window")

        if not time_window.is_deleted:
            time_window.is_deleted = True
            await self.engine.save(time_window)
        # Note: This does not remove the time_window_id from any DayTemplate.time_windows list.
        # This could lead to dangling references if not handled elsewhere or by design.
        return True
