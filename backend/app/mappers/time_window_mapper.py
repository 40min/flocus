from odmantic import ObjectId

from app.api.schemas.category import CategoryResponse
from app.api.schemas.time_window import TimeWindowCreateRequest, TimeWindowResponse
from app.db.models.category import Category
from app.db.models.time_window import TimeWindow


class TimeWindowMapper:
    @staticmethod
    def to_response(time_window: TimeWindow, category_model: Category) -> TimeWindowResponse:
        category_response = CategoryResponse.model_validate(category_model)

        return TimeWindowResponse(
            id=time_window.id,
            name=time_window.name,
            start_time=time_window.start_time,
            end_time=time_window.end_time,
            category=category_response,
            day_template_id=time_window.day_template_id,
            user_id=time_window.user,
            is_deleted=time_window.is_deleted,
        )

    @staticmethod
    def to_model_for_create(schema: TimeWindowCreateRequest, user_id: ObjectId) -> TimeWindow:
        time_window_data = schema.model_dump()
        return TimeWindow(
            **time_window_data,
            user=user_id,
            is_deleted=False,
        )
