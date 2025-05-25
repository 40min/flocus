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

    async def _build_time_window_response(self, time_window_model: TimeWindow) -> TimeWindowResponse:
        category_model = await self.engine.find_one(Category, Category.id == time_window_model.category)
        if not category_model:
            raise CategoryNotFoundException(
                detail=f"Category for TimeWindow {time_window_model.id} not found."
            )  # Should be caught earlier by validation

        return TimeWindowMapper.to_response(time_window_model, category_model)

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
        return await self._build_time_window_response(time_window)

    async def get_time_window_by_id(self, time_window_id: ObjectId, current_user_id: ObjectId) -> TimeWindowResponse:
        time_window = await self.engine.find_one(
            TimeWindow, TimeWindow.id == time_window_id
        )  # Fetches regardless of is_deleted status
        if not time_window:
            raise TimeWindowNotFoundException(time_window_id=str(time_window_id))

        if time_window.user != current_user_id:
            raise NotOwnerException(resource="time window", detail_override="Not authorized to access this time window")

        return await self._build_time_window_response(time_window)

    async def get_all_time_windows_for_user(self, current_user_id: ObjectId) -> List[TimeWindowResponse]:
        time_windows_models = await self.engine.find(
            TimeWindow,
            TimeWindow.user == current_user_id,
            TimeWindow.is_deleted == False,  # noqa: E712
        )
        return [await self._build_time_window_response(tw) for tw in time_windows_models]

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
            category = await self.engine.find_one(
                Category, Category.id == new_category_id, Category.is_deleted == False  # noqa: E712
            )
            if not category:
                raise CategoryNotFoundException(
                    category_id=str(new_category_id), detail="Active category for update not found."
                )
            if category.user != current_user_id:
                raise NotOwnerException(resource="category", detail_override="New category not owned by user.")

        if "day_template_id" in update_data:
            new_day_template_id = update_data["day_template_id"]
            day_template = await self.engine.find_one(DayTemplate, DayTemplate.id == new_day_template_id)
            if not day_template:
                raise DayTemplateNotFoundException(template_id=str(new_day_template_id))
            if day_template.user != current_user_id:
                raise NotOwnerException(resource="day template", detail_override="New day template not owned by user.")

        # Check start_time and end_time consistency if both are provided or one is provided and other exists
        merged_start_time = update_data.get("start_time", time_window.start_time)
        merged_end_time = update_data.get("end_time", time_window.end_time)

        if merged_end_time <= merged_start_time:
            # This validation is also in Pydantic model, but good to have defense in depth
            # or if only one is updated, check against the existing value.
            raise InvalidTimeWindowTimesException()

        for field, value in update_data.items():
            setattr(time_window, field, value)

        await self.engine.save(time_window)
        return await self._build_time_window_response(time_window)

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
