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
from app.db.models.day_template import DayTemplate  # Assumed existing import
from app.db.models.time_window import TimeWindow
from app.mappers.day_template_mapper import DayTemplateMapper
from app.mappers.time_window_mapper import TimeWindowMapper


class DayTemplateService:
    def __init__(self, engine: AIOEngine = Depends(get_database)):
        self.engine = engine

    async def _fetch_and_build_time_window_response_map(
        self, day_template_id: ObjectId, current_user_id: ObjectId
    ) -> Dict[ObjectId, TimeWindowResponse]:
        """
        Fetches TimeWindow models for a given DayTemplate ID and their related Category models,
        validates ownership and existence, and returns a map of TimeWindow ObjectId to TimeWindowResponse.
        """
        time_window_models_db = await self.engine.find(
            TimeWindow,
            TimeWindow.day_template_id == day_template_id,
            TimeWindow.user == current_user_id,
            TimeWindow.is_deleted == False,  # noqa: E712
        )

        if not time_window_models_db:
            return {}

        # All fetched time_window_models_db are guaranteed to belong to the user and are not deleted.
        # And they are all associated with the given day_template_id.

        time_windows_map_models = {tw.id: tw for tw in time_window_models_db}
        unique_tw_ids = list(time_windows_map_models.keys())  # Used later for iterating

        category_ids_for_tws = list(set(tw.category for tw in time_window_models_db if tw.category))
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
                TimeWindow.is_deleted == False,  # noqa: E712 Ensure only active TWs are linked
            )
            if len(fetched_windows) != len(set(template_data.time_windows)):
                found_ids = {tw.id for tw in fetched_windows}
                missing_ids = [str(tid) for tid in template_data.time_windows if tid not in found_ids]
                raise TimeWindowNotFoundException(time_window_id=missing_ids[0])
            # fetched_windows is now a list of TimeWindow models
            time_window_ids_for_template = [tw.id for tw in fetched_windows]  # Keep this for the mapper
        # else: template_data.time_windows is empty or None, so fetched_windows remains empty or unassigned
        # and time_window_ids_for_template remains empty.

        day_template_model = DayTemplateMapper.to_model_for_create(
            schema=template_data, user_id=current_user_id, validated_time_window_ids=time_window_ids_for_template
        )
        await self.engine.save(day_template_model)  # Save template to get its ID

        # Now, update day_template_id for each TimeWindow in fetched_windows (if any)
        if template_data.time_windows and fetched_windows:  # Ensure fetched_windows is populated
            for tw_model_to_link in fetched_windows:  # Iterate over the fetched models
                if tw_model_to_link.day_template_id != day_template_model.id:  # Avoid unnecessary save
                    tw_model_to_link.day_template_id = day_template_model.id
                    await self.engine.save(tw_model_to_link)

        # Now _fetch_and_build_time_window_response_map should find the linked TWs
        tw_response_map = await self._fetch_and_build_time_window_response_map(day_template_model.id, current_user_id)
        # The order of time_windows in day_template_model.time_windows is crucial.
        # This list was populated by DayTemplateMapper.to_model_for_create using validated_time_window_ids,
        # which in turn came from template_data.time_windows (after validation).
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

        # The method _fetch_and_build_time_window_response_map now fetches TWs by day_template_id.
        tw_response_map = await self._fetch_and_build_time_window_response_map(template_id, current_user_id)

        # day_template_model.time_windows should contain the ordered list of TW ObjectIds
        # if the user has specified an order. If not, the order from the DB fetch (via tw_response_map.keys())
        # will be somewhat arbitrary but consistent for that fetch.
        # We should respect the order in day_template_model.time_windows if it exists and is populated.
        # If day_template_model.time_windows is empty or not the source of truth for order,
        # then the order from tw_response_map.keys() (which is derived from DB query) will be used.
        # For consistency, let's use day_template_model.time_windows for ordering if available.
        # If day_template_model.time_windows is not populated (e.g. legacy data or design choice),
        # we might need to sort the time windows from tw_response_map by start_time or another field.

        # For now, let's assume day_template_model.time_windows holds the desired order of TW IDs.
        # If day_template_model.time_windows is empty, ordered_tw_responses will be empty.
        ordered_tw_responses = [
            tw_response_map[tw_id] for tw_id in day_template_model.time_windows if tw_id in tw_response_map
        ]
        # If day_template_model.time_windows is not the source of truth for order,
        # and we want to display all time windows associated with the template,
        # we might iterate through tw_response_map.values() directly, but order would be lost/arbitrary.
        # A common approach is to sort by start_time:
        # ordered_tw_responses = sorted(list(tw_response_map.values()), key=lambda tw: tw.start_time)
        # Given the existing structure, using day_template_model.time_windows for order seems intended.
        return DayTemplateMapper.to_response(day_template_model, ordered_tw_responses)

    async def get_all_day_templates(self, current_user_id: ObjectId) -> List[DayTemplateResponse]:
        user_templates_models = await self.engine.find(DayTemplate, DayTemplate.user == current_user_id)
        response_list: List[DayTemplateResponse] = []

        for template_model in user_templates_models:
            # For each template, fetch its associated time windows using the modified method
            tw_response_map_for_template = await self._fetch_and_build_time_window_response_map(
                template_model.id, current_user_id
            )
            # Order the time windows based on the template_model.time_windows list
            ordered_tw_responses = [
                tw_response_map_for_template[tw_id]
                for tw_id in template_model.time_windows
                if tw_id in tw_response_map_for_template
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
            new_tw_ids_from_payload = update_fields["time_windows"]  # List[ObjectId] or None

            if new_tw_ids_from_payload is not None:  # Payload explicitly provides time_windows (can be empty list)
                validated_new_tw_models_for_linking: List[TimeWindow] = []
                if new_tw_ids_from_payload:  # If the provided list is not empty, validate and fetch
                    fetched_tws_for_update = await self.engine.find(
                        TimeWindow,
                        TimeWindow.id.in_(new_tw_ids_from_payload),
                        TimeWindow.user == current_user_id,
                        TimeWindow.is_deleted == False,  # noqa: E712
                    )
                    if len(fetched_tws_for_update) != len(set(new_tw_ids_from_payload)):
                        found_ids = {tw.id for tw in fetched_tws_for_update}
                        missing_ids = [str(tid) for tid in new_tw_ids_from_payload if tid not in found_ids]
                        raise TimeWindowNotFoundException(time_window_id=missing_ids[0])
                    validated_new_tw_models_for_linking = fetched_tws_for_update

                new_tw_ids_to_link_set = {tw.id for tw in validated_new_tw_models_for_linking}

                # Dissociate TimeWindows no longer in the list
                currently_linked_tws_by_fk = await self.engine.find(
                    TimeWindow,
                    TimeWindow.day_template_id == day_template_raw_model.id,
                    TimeWindow.user == current_user_id,
                )
                for tw_model_to_check_unlink in currently_linked_tws_by_fk:
                    if tw_model_to_check_unlink.id not in new_tw_ids_to_link_set:
                        tw_model_to_check_unlink.day_template_id = None  # Or other logic for unlinking
                        await self.engine.save(tw_model_to_check_unlink)

                # Associate/Re-associate TimeWindows from the validated list
                for tw_model_to_link in validated_new_tw_models_for_linking:
                    if tw_model_to_link.day_template_id != day_template_raw_model.id:
                        tw_model_to_link.day_template_id = day_template_raw_model.id
                        await self.engine.save(tw_model_to_link)

                ordered_new_tw_ids = []
                temp_map_new_models = {m.id: m for m in validated_new_tw_models_for_linking}
                if (
                    new_tw_ids_from_payload
                ):  # if it was not [] or None leading to empty validated_new_tw_models_for_linking
                    for req_id in new_tw_ids_from_payload:
                        if req_id in temp_map_new_models:
                            ordered_new_tw_ids.append(req_id)
                day_template_raw_model.time_windows = ordered_new_tw_ids
           

        await self.engine.save(day_template_raw_model)  # Save DayTemplate with all changes

        tw_response_map = await self._fetch_and_build_time_window_response_map(
            day_template_raw_model.id, current_user_id  # This uses the ID of the template being updated
        )
        # Use the potentially updated day_template_raw_model.time_windows for ordering
        ordered_tw_responses = [
            tw_response_map[tw_id] for tw_id in day_template_raw_model.time_windows if tw_id in tw_response_map
        ]
        return DayTemplateMapper.to_response(day_template_raw_model, ordered_tw_responses)

    async def delete_day_template(self, template_id: ObjectId, current_user_id: ObjectId) -> None:
        day_template_model = await self.engine.find_one(DayTemplate, DayTemplate.id == template_id)
        if day_template_model is None:
            raise DayTemplateNotFoundException(template_id=template_id)
        if day_template_model.user != current_user_id:
            raise NotOwnerException(resource="day template", detail_override="Ownership check failed")

        # Soft-delete associated time windows
        time_windows_to_soft_delete = await self.engine.find(
            TimeWindow,
            (TimeWindow.day_template_id == template_id)
            & (TimeWindow.user == current_user_id)
            & (TimeWindow.is_deleted == False),  # noqa: E712
        )
        for tw in time_windows_to_soft_delete:
            tw.is_deleted = True
            await self.engine.save(tw)

        await self.engine.delete(day_template_model)
        # No return is needed as the endpoint expects a 204 No Content.
