from typing import List

from odmantic import ObjectId

from app.api.schemas.day_template import DayTemplateCreateRequest, DayTemplateResponse
from app.api.schemas.time_window import TimeWindowResponse
from app.db.models.day_template import DayTemplate


class DayTemplateMapper:
    @staticmethod
    def to_response(
        day_template_model: DayTemplate, time_window_responses: List[TimeWindowResponse]
    ) -> DayTemplateResponse:
        """
        Maps a DayTemplate model and its pre-fetched TimeWindowResponse list to a DayTemplateResponse schema.
        """
        return DayTemplateResponse(
            id=day_template_model.id,
            name=day_template_model.name,
            description=day_template_model.description,
            user_id=day_template_model.user,
            time_windows=time_window_responses,
        )

    @staticmethod
    def to_model_for_create(
        schema: DayTemplateCreateRequest, user_id: ObjectId, validated_time_window_ids: List[ObjectId]
    ) -> DayTemplate:
        return DayTemplate(
            name=schema.name, description=schema.description, time_windows=validated_time_window_ids, user=user_id
        )
