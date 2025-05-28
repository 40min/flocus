from odmantic import ObjectId

from app.api.schemas.category import CategoryResponse
from app.api.schemas.time_window import TimeWindowCreateRequest, TimeWindowResponse
from app.db.models.category import Category
from app.db.models.time_window import TimeWindow
from app.mappers.base_mapper import BaseMapper


class TimeWindowMapper(BaseMapper):
    @staticmethod
    # _model_class needs to be defined for BaseMapper inheritance to work correctly
    # However, staticmethods don't use 'cls', so we'll define _model_class at class level.
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

    _model_class = TimeWindow

    @classmethod
    def to_model_for_update(cls, time_window: TimeWindow, schema: TimeWindowCreateRequest) -> TimeWindow:
        """Updates a TimeWindow model with data from an update request schema."""
        update_data = schema.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if hasattr(time_window, field):  # Ensure field exists on the model
                # Apply TaskMapper-like logic to prevent setting required fields to None
                if field in cls._nullable_fields or (field in cls._non_nullable_fields and value is not None):
                    setattr(time_window, field, value)
                elif field in cls._non_nullable_fields and value is None:
                    # This case means the schema tried to set a required model field to None.
                    # The Pydantic model itself should raise validation error on save if this happens.
                    # The mapper follows TaskMapper's pattern of not setting it.
                    pass
        # TimeWindow model does not have an 'updated_at' field to set here
        return time_window
