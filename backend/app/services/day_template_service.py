from typing import List, Optional

from fastapi import Depends
from odmantic import AIOEngine, ObjectId

from app.api.schemas.day_template import DayTemplateCreateRequest, DayTemplateUpdateRequest
from app.core.exceptions import (
    DayTemplateNameExistsException,
    DayTemplateNotFoundException,
    NotOwnerException,
    TimeWindowNotFoundException,
    UserNotFoundException,
)
from app.db.connection import get_database
from app.db.models.category import Category  # Added Category import
from app.db.models.day_template import DayTemplate
from app.db.models.time_window import TimeWindow
from app.db.models.user import User


class DayTemplateService:
    def __init__(self, engine: AIOEngine = Depends(get_database)):
        self.engine = engine

    async def _populate_day_template_relations(self, template: DayTemplate) -> DayTemplate:
        """
        Helper function to ensure all nested references needed for response serialization are populated.
        The `template` input is assumed to be a DayTemplate model instance, potentially with
        references (ObjectIds) in its `user` and `time_windows[...].category/user` fields.
        This function will replace those ObjectIds with actual fetched model instances.
        """
        # Ensure DayTemplate.user is a User instance
        if not isinstance(template.user, User):
            user_obj_id = template.user if isinstance(template.user, ObjectId) else ObjectId(str(template.user))
            fetched_user = await self.engine.find_one(User, User.id == user_obj_id)
            if not fetched_user:
                # This indicates a serious data integrity issue if a DayTemplate refers to a non-existent user.
                raise DayTemplateNotFoundException(template_id=template.id)  # Simplified error
            template.user = fetched_user

        populated_time_windows: List[TimeWindow] = []
        if template.time_windows:  # template.time_windows should be List[TimeWindow] or List[ObjectId] from DB
            for tw_ref_or_model in template.time_windows:
                tw_instance: Optional[TimeWindow] = None
                # Ensure tw_instance is a TimeWindow model instance
                if isinstance(tw_ref_or_model, ObjectId):
                    tw_instance = await self.engine.find_one(TimeWindow, TimeWindow.id == tw_ref_or_model)
                    if not tw_instance:
                        # Referenced TimeWindow not found
                        raise TimeWindowNotFoundException(time_window_id=str(tw_ref_or_model))
                elif isinstance(tw_ref_or_model, TimeWindow):
                    tw_instance = tw_ref_or_model  # It's already a TimeWindow model instance
                else:
                    # Should not happen if DayTemplate.time_windows is List[TimeWindow] or List[ObjectId]
                    raise TypeError(f"Unexpected type in template.time_windows: {type(tw_ref_or_model)}")

                # Ensure tw_instance.category is a Category instance
                if not isinstance(tw_instance.category, Category):
                    cat_obj_id = (
                        tw_instance.category
                        if isinstance(tw_instance.category, ObjectId)
                        else ObjectId(str(tw_instance.category))
                    )
                    fetched_category = await self.engine.find_one(Category, Category.id == cat_obj_id)
                    if not fetched_category:
                        raise TimeWindowNotFoundException(time_window_id=str(tw_instance.id))  # Simplified error
                    tw_instance.category = fetched_category

                # Ensure tw_instance.user is a User instance (for completeness)
                if not isinstance(tw_instance.user, User):
                    user_obj_id_for_tw = (
                        tw_instance.user if isinstance(tw_instance.user, ObjectId) else ObjectId(str(tw_instance.user))
                    )
                    fetched_user_for_tw = await self.engine.find_one(User, User.id == user_obj_id_for_tw)
                    if not fetched_user_for_tw:
                        raise UserNotFoundException(detail=f"User for TimeWindow {tw_instance.id} not found.")
                    tw_instance.user = fetched_user_for_tw

                populated_time_windows.append(tw_instance)
        template.time_windows = populated_time_windows
        return template

    async def create_day_template(
        self, template_data: DayTemplateCreateRequest, current_user_id: ObjectId
    ) -> DayTemplate:
        """
        Creates a new Day Template for the current user.
        """
        existing_template = await self.engine.find_one(
            DayTemplate,
            DayTemplate.name == template_data.name,
            DayTemplate.user == current_user_id,
        )
        if existing_template:
            raise DayTemplateNameExistsException(name=template_data.name)

        valid_time_windows: List[TimeWindow] = []
        if template_data.time_windows:
            # Fetch TimeWindow objects matching the provided IDs AND owned by the current user
            # These fetched_windows will have their 'category' and 'user' as ObjectIds (references)
            fetched_windows = await self.engine.find(
                TimeWindow,
                TimeWindow.id.in_(template_data.time_windows),
                TimeWindow.user == current_user_id,
            )
            if len(fetched_windows) != len(set(template_data.time_windows)):  # Use set for unique IDs
                found_ids = {tw.id for tw in fetched_windows}
                missing_ids = [str(tid) for tid in template_data.time_windows if tid not in found_ids]
                # Construct a more informative default message if needed, or modify the exception class
                raise TimeWindowNotFoundException(time_window_id=missing_ids[0])
            valid_time_windows = fetched_windows

        user_instance = await self.engine.find_one(User, User.id == current_user_id)
        if not user_instance:
            # This case should ideally be prevented by the auth dependency,
            # but as a safeguard:
            raise UserNotFoundException(detail="User not found for creating day template.")

        day_template = DayTemplate(
            name=template_data.name,
            description=template_data.description,
            time_windows=valid_time_windows,  # List of TimeWindow models (with refs for category/user)
            user=user_instance,  # Assign the fetched User model instance
        )
        await self.engine.save(day_template)
        # After saving, day_template.time_windows still has TimeWindow models with refs.
        # _populate_day_template_relations will fetch those nested refs.
        return await self._populate_day_template_relations(day_template)

    async def get_day_template_by_id(self, template_id: ObjectId, current_user_id: ObjectId) -> DayTemplate:
        """
        Fetches a single Day Template by its ID, ensuring ownership and populating relations.
        """
        day_template = await self.engine.find_one(DayTemplate, DayTemplate.id == template_id)
        if day_template is None:
            raise DayTemplateNotFoundException(template_id=template_id)

        # Ownership check: day_template.user is an ObjectId here
        db_user_ref = day_template.user
        db_user_id = db_user_ref.id if isinstance(db_user_ref, User) else db_user_ref

        if db_user_id != current_user_id:
            raise NotOwnerException(
                resource="day template",
                detail_override="Ownership check failed",
            )

        return await self._populate_day_template_relations(day_template)

    async def get_all_day_templates(self, current_user_id: ObjectId) -> List[DayTemplate]:
        """
        Fetches all Day Templates belonging to the current user, populating relations.
        """
        user_templates_models = await self.engine.find(DayTemplate, DayTemplate.user == current_user_id)
        populated_templates: List[DayTemplate] = []
        for template_model in user_templates_models:
            populated_templates.append(await self._populate_day_template_relations(template_model))
        return populated_templates

    async def update_day_template(
        self,
        template_id: ObjectId,
        template_data: DayTemplateUpdateRequest,
        current_user_id: ObjectId,
    ) -> DayTemplate:
        """
        Updates an existing Day Template, ensuring ownership and populating relations.
        """
        # Fetch the existing template. get_day_template_by_id now also populates.
        # However, we need the unpopulated one first for some checks, or be careful with modifications.
        # Let's fetch raw first, then populate before returning.
        day_template_raw = await self.engine.find_one(DayTemplate, DayTemplate.id == template_id)
        if day_template_raw is None:
            raise DayTemplateNotFoundException(template_id=template_id)
        db_user_ref_raw = day_template_raw.user
        db_user_id_raw = db_user_ref_raw.id if isinstance(db_user_ref_raw, User) else db_user_ref_raw

        if db_user_id_raw != current_user_id:  # day_template_raw.user is ObjectId
            raise NotOwnerException(
                resource="day template",
                detail_override="Ownership check failed",
            )

        update_fields = template_data.model_dump(exclude_unset=True)

        if "name" in update_fields and update_fields["name"] != day_template_raw.name:
            existing_template_check = await self.engine.find_one(
                DayTemplate,
                DayTemplate.name == update_fields["name"],
                DayTemplate.user == current_user_id,
            )
            if existing_template_check:
                raise DayTemplateNameExistsException(name=update_fields["name"])
            day_template_raw.name = update_fields["name"]

        if "description" in update_fields:
            day_template_raw.description = update_fields["description"]

        if "time_windows" in update_fields:
            new_time_window_ids = update_fields["time_windows"]
            valid_new_time_windows: List[TimeWindow] = []
            if new_time_window_ids:  # If the list is not empty
                fetched_new_windows = await self.engine.find(
                    TimeWindow,
                    TimeWindow.id.in_(new_time_window_ids),
                    TimeWindow.user == current_user_id,  # Ensure new TWs also belong to user
                )
                if len(fetched_new_windows) != len(set(new_time_window_ids)):
                    found_new_ids = {tw.id for tw in fetched_new_windows}
                    missing_new_ids = [str(tid) for tid in new_time_window_ids if tid not in found_new_ids]
                    # Construct a more informative default message if needed, or modify the exception class
                    raise TimeWindowNotFoundException(time_window_id=missing_new_ids[0])
                valid_new_time_windows = fetched_new_windows
            day_template_raw.time_windows = valid_new_time_windows  # Assigns list of TimeWindow models (with refs)

        await self.engine.save(day_template_raw)
        # After saving, day_template_raw has been updated. Now populate for response.
        return await self._populate_day_template_relations(day_template_raw)

    async def delete_day_template(self, template_id: ObjectId, current_user_id: ObjectId) -> bool:
        """
        Deletes a Day Template by its ID, ensuring ownership.

        Args:
            template_id: The ID of the day template to delete.
            current_user_id: The ID of the user attempting the deletion.

        Returns:
            True if the template was deleted successfully.

        Raises:
            DayTemplateNotFoundException: If the template with the given ID is not found.
            NotOwnerException: If the template does not belong to the current user.
        """
        # Fetch the template first, includes ownership check
        day_template = await self.get_day_template_by_id(template_id, current_user_id)

        # Delete the template
        await self.engine.delete(day_template)
        return True
