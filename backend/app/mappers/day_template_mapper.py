from typing import Dict, List

from odmantic import ObjectId

from app.api.schemas.category import CategoryResponse
from app.api.schemas.day_template import DayTemplateCreateRequest, DayTemplateResponse
from app.api.schemas.time_window import TimeWindowResponse
from app.db.models.day_template import DayTemplate, EmbeddedTimeWindowSchema


class DayTemplateMapper:
    @staticmethod
    def to_response(
        template_model: DayTemplate, categories_map: Dict[ObjectId, CategoryResponse]
    ) -> DayTemplateResponse:
        """
        Maps a DayTemplate model and a pre-fetched map of its relevant categories
        to a DayTemplateResponse schema.
        """
        time_window_responses: List[TimeWindowResponse] = []
        for embedded_tw in template_model.time_windows:
            category_resp = categories_map.get(embedded_tw.category_id)
            if not category_resp:
                # This case implies an issue upstream (service layer should ensure categories are provided)
                # or data inconsistency. For robustness, create a placeholder or raise an error.
                # Following the previous logic of creating a placeholder for now:
                category_resp = CategoryResponse(
                    id=embedded_tw.category_id,
                    name="Unknown/Missing Category",
                    user=template_model.user_id,  # Use alias 'user' to populate 'user_id'
                    is_deleted=True,
                )

            time_window_responses.append(
                TimeWindowResponse(
                    name=embedded_tw.name,
                    start_time=embedded_tw.start_time,
                    end_time=embedded_tw.end_time,
                    category=category_resp,
                )
            )

        return DayTemplateResponse(
            id=template_model.id,
            name=template_model.name,
            description=template_model.description,
            user_id=template_model.user_id,
            time_windows=time_window_responses,
        )

    @staticmethod
    def to_response_list(
        templates: List[DayTemplate], all_categories_map: Dict[ObjectId, CategoryResponse]
    ) -> List[DayTemplateResponse]:
        """
        Maps a list of DayTemplate models to a list of DayTemplateResponse schemas,
        using a pre-fetched map of all relevant categories.
        """
        # This simplified version assumes all_categories_map contains all categories
        # for all time windows in all templates. A more granular approach might be needed
        # if categories are specific per template and not globally available.
        # For this example, we pass the full map to each to_response call.
        return [DayTemplateMapper.to_response(template, all_categories_map) for template in templates]

    @staticmethod
    def to_model_for_create(schema: DayTemplateCreateRequest, user_id: ObjectId) -> DayTemplate:
        """
        Maps a DayTemplateCreateRequest schema to a DayTemplate model instance
        ready for creation. Assumes category_ids in schema.time_windows are validated
        by the service layer.
        """
        embedded_time_windows: List[EmbeddedTimeWindowSchema] = []
        for tw_input_schema in schema.time_windows:
            embedded_time_windows.append(
                EmbeddedTimeWindowSchema(
                    name=tw_input_schema.name,
                    start_time=tw_input_schema.start_time,
                    end_time=tw_input_schema.end_time,
                    category_id=tw_input_schema.category_id,
                )
            )

        return DayTemplate(
            name=schema.name,
            description=schema.description,
            user_id=user_id,
            time_windows=embedded_time_windows,
        )
