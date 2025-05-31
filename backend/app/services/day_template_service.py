from typing import Dict, List, Set

from fastapi import Depends, HTTPException, status
from odmantic import AIOEngine, ObjectId

from app.api.schemas.category import CategoryResponse
from app.api.schemas.day_template import DayTemplateCreateRequest, DayTemplateResponse, DayTemplateUpdateRequest
from app.db.connection import get_database
from app.db.models.day_template import DayTemplate, EmbeddedTimeWindowSchema

# from app.db.models.category import Category # No longer needed as CategoryService returns CategoryResponse
from app.mappers.day_template_mapper import DayTemplateMapper
from app.services.category_service import CategoryService


class DayTemplateService:
    def __init__(
        self,
        engine: AIOEngine = Depends(get_database),
        category_service: CategoryService = Depends(CategoryService),
    ):
        self.engine = engine
        self.category_service = category_service

    async def _fetch_and_map_categories(
        self, category_ids: Set[ObjectId], current_user_id: ObjectId
    ) -> Dict[ObjectId, CategoryResponse]:
        """
        Fetches categories by a set of IDs and returns a map of ObjectId to CategoryResponse.
        Ensures all requested categories are found and belong to the user.
        """
        if not category_ids:
            return {}

        category_list_ids = list(category_ids)
        fetched_category_responses = await self.category_service.get_categories_by_ids(
            category_ids=category_list_ids, current_user_id=current_user_id
        )

        # Validate that all requested categories were found
        if len(fetched_category_responses) != len(category_list_ids):
            found_ids = {cat.id for cat in fetched_category_responses}
            missing_ids = category_ids - found_ids
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"One or more categories not found or not accessible: {missing_ids}.",
            )

        return {cat.id: cat for cat in fetched_category_responses}

    async def create_day_template(
        self, template_data: DayTemplateCreateRequest, current_user_id: ObjectId
    ) -> DayTemplateResponse:
        # Check for existing template with the same name for this user
        existing_template_with_name = await self.engine.find_one(
            DayTemplate,
            DayTemplate.name == template_data.name,
            DayTemplate.user_id == current_user_id,
        )
        if existing_template_with_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A day template with the name '{template_data.name}' already exists.",
            )

        category_ids_in_request: Set[ObjectId] = {tw.category_id for tw in template_data.time_windows if tw.category_id}

        categories_map: Dict[ObjectId, CategoryResponse] = {}
        if category_ids_in_request:
            categories_map = await self._fetch_and_map_categories(category_ids_in_request, current_user_id)
            # _fetch_and_map_categories handles validation of existence and accessibility

        day_template_model = DayTemplateMapper.to_model_for_create(template_data, current_user_id)
        await self.engine.save(day_template_model)

        # The categories_map already contains all necessary CategoryResponse objects
        return DayTemplateMapper.to_response(day_template_model, categories_map)

    async def get_day_template_by_id_internal(
        self,
        template_id: ObjectId,
        current_user_id: ObjectId,
    ) -> DayTemplate:
        day_template = await self.engine.find_one(
            DayTemplate, DayTemplate.id == template_id, DayTemplate.user_id == current_user_id
        )
        if day_template is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DayTemplate not found")
        return day_template

    async def get_day_template_by_id(self, template_id: ObjectId, current_user_id: ObjectId) -> DayTemplateResponse:
        day_template_model = await self.get_day_template_by_id_internal(template_id, current_user_id)

        category_ids_in_template: Set[ObjectId] = {
            tw.category_id for tw in day_template_model.time_windows if tw.category_id
        }

        categories_map = await self._fetch_and_map_categories(category_ids_in_template, current_user_id)
        return DayTemplateMapper.to_response(day_template_model, categories_map)

    async def get_all_day_templates(self, current_user_id: ObjectId) -> List[DayTemplateResponse]:
        day_templates_models = await self.engine.find(DayTemplate, DayTemplate.user_id == current_user_id)
        if not day_templates_models:
            return []

        all_category_ids: Set[ObjectId] = set()
        for template in day_templates_models:
            for tw in template.time_windows:
                if tw.category_id:
                    all_category_ids.add(tw.category_id)

        all_categories_map = await self._fetch_and_map_categories(all_category_ids, current_user_id)
        return DayTemplateMapper.to_response_list(day_templates_models, all_categories_map)

    async def update_day_template(
        self, template_id: ObjectId, template_data: DayTemplateUpdateRequest, current_user_id: ObjectId
    ) -> DayTemplateResponse:
        day_template_model = await self.get_day_template_by_id_internal(template_id, current_user_id)
        update_fields = template_data.model_dump(exclude_unset=True)
        categories_map_for_response: Dict[ObjectId, CategoryResponse] = {}

        if "name" in update_fields:
            new_name = update_fields["name"]
            if new_name != day_template_model.name:  # Check if name is actually changing
                # Check for existing template with the new name for this user
                existing_template_with_name = await self.engine.find_one(
                    DayTemplate,
                    DayTemplate.name == new_name,
                    DayTemplate.user_id == current_user_id,
                    DayTemplate.id != template_id,  # Exclude the current template
                )
                if existing_template_with_name:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"A day template with the name '{new_name}' already exists.",
                    )
            day_template_model.name = new_name
        if "description" in update_fields:
            day_template_model.description = update_fields["description"]

        if "time_windows" in update_fields and update_fields["time_windows"] is not None:
            new_time_window_schemas: List[EmbeddedTimeWindowSchema] = []
            category_ids_in_update_payload: Set[ObjectId] = {
                ObjectId(tw_input_data["category_id"])  # Ensure ObjectId
                for tw_input_data in update_fields["time_windows"]
                if tw_input_data.get("category_id")
            }

            if category_ids_in_update_payload:
                # Fetch and validate categories from the update payload ONCE.
                # This map will be used for the response.
                categories_map_for_response = await self._fetch_and_map_categories(
                    category_ids_in_update_payload, current_user_id
                )  # This call also validates existence and accessibility

            # Construct new time windows using the (now validated) category IDs
            for tw_input_data in update_fields["time_windows"]:
                if (
                    "category_id" in tw_input_data
                ):  # Should always be true if category_ids_in_update_payload was populated
                    # We trust _fetch_and_map_categories to have validated these IDs
                    new_time_window_schemas.append(EmbeddedTimeWindowSchema(**tw_input_data))
            day_template_model.time_windows = new_time_window_schemas
        else:
            # Time windows are not being updated, so we need to fetch categories
            # for the existing time windows to populate the response.
            existing_category_ids: Set[ObjectId] = {
                tw.category_id for tw in day_template_model.time_windows if tw.category_id
            }
            if existing_category_ids:
                categories_map_for_response = await self._fetch_and_map_categories(
                    existing_category_ids, current_user_id
                )

        await self.engine.save(day_template_model)

        return DayTemplateMapper.to_response(day_template_model, categories_map_for_response)

    async def delete_day_template(self, template_id: ObjectId, current_user_id: ObjectId) -> None:
        day_template = await self.get_day_template_by_id_internal(template_id, current_user_id)
        await self.engine.delete(day_template)
