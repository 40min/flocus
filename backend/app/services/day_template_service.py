from typing import List

from fastapi import Depends
from odmantic import AIOEngine, ObjectId

from app.api.schemas.day_template import DayTemplateCreateRequest, DayTemplateUpdateRequest
from app.core.exceptions import NotOwnerException  # Add this import
from app.core.exceptions import (
    DayTemplateNameExistsException,
    DayTemplateNotFoundException,
    TimeWindowNotFoundException,
)
from app.db.connection import get_database
from app.db.models.day_template import DayTemplate
from app.db.models.time_window import TimeWindow


class DayTemplateService:
    def __init__(self, engine: AIOEngine = Depends(get_database)):
        self.engine = engine

    async def create_day_template(
        self, template_data: DayTemplateCreateRequest, current_user_id: ObjectId
    ) -> DayTemplate:
        """
        Creates a new Day Template for the current user.

        Args:
            template_data: The data for the new day template.
            current_user_id: The ID of the user creating the template.

        Returns:
            The created DayTemplate object.

        Raises:
            DayTemplateNameExistsException: If a template with the same name already exists.
            TimeWindowNotFoundException: If any of the provided time_window_ids do not exist.
        """
        # Check if template name already exists for this user
        existing_template = await self.engine.find_one(
            DayTemplate,
            DayTemplate.name == template_data.name,
            DayTemplate.user.id == current_user_id,  # Changed to user.id
        )
        if existing_template:
            raise DayTemplateNameExistsException(name=template_data.name)

        # Validate time_window_ids
        valid_time_windows: List[TimeWindow] = []
        if template_data.time_windows:
            # Fetch TimeWindow objects matching the provided IDs AND owned by the current user
            fetched_windows = await self.engine.find(
                TimeWindow,
                TimeWindow.id.in_(template_data.time_windows),
                TimeWindow.user.id == current_user_id,  # Changed to user.id
            )
            # Check if all provided IDs were found and belong to the user
            if len(fetched_windows) != len(template_data.time_windows):
                # Identify which IDs were missing or didn't belong to the user
                found_ids = {tw.id for tw in fetched_windows}
                missing_ids = [str(tid) for tid in template_data.time_windows if tid not in found_ids]
                # Raise exception for the first missing ID found
                raise TimeWindowNotFoundException(time_window_id=missing_ids[0])
            valid_time_windows = fetched_windows

        # Create the DayTemplate instance
        day_template = DayTemplate(
            name=template_data.name,
            description=template_data.description,
            time_windows=valid_time_windows,  # Assign validated TimeWindow objects
            user=current_user_id,  # Assign user object/ID directly
        )

        # Save the new day template to the database
        await self.engine.save(day_template)
        return day_template

    async def get_day_template_by_id(self, template_id: ObjectId, current_user_id: ObjectId) -> DayTemplate:
        """
        Fetches a single Day Template by its ID, ensuring ownership.

        Args:
            template_id: The ID of the day template to fetch.
            current_user_id: The ID of the user requesting the template.

        Returns:
            The fetched DayTemplate object.

        Raises:
            DayTemplateNotFoundException: If no template with the given ID is found.
            NotOwnerException: If the template does not belong to the current user.
        """
        day_template = await self.engine.find_one(DayTemplate, DayTemplate.id == template_id)
        if day_template is None:
            raise DayTemplateNotFoundException(template_id=template_id)
        if day_template.user.id != current_user_id:  # Changed to user.id
            raise NotOwnerException(resource="day template")
        # TODO: Consider fetching referenced TimeWindows and Categories if needed for the response schema
        # This might require additional queries or using odmantic's fetch features if available/applicable.
        # For now, returning the template with references.
        return day_template

    async def get_all_day_templates(self, current_user_id: ObjectId) -> List[DayTemplate]:
        """
        Fetches all Day Templates belonging to the current user.

            current_user_id: The ID of the user requesting the templates.

        Returns:
            A list of DayTemplate objects belonging to the user.
        """
        # TODO: Consider pagination for large datasets
        user_templates = await self.engine.find(
            DayTemplate, DayTemplate.user.id == current_user_id  # Changed to user.id
        )
        # TODO: Consider fetching referenced TimeWindows/Categories if needed for response schema
        return user_templates

    async def update_day_template(
        self,
        template_id: ObjectId,
        template_data: DayTemplateUpdateRequest,
        current_user_id: ObjectId,  # Add current_user_id parameter
    ) -> DayTemplate:
        """
        Updates an existing Day Template, ensuring ownership.

        Args:
            template_id: The ID of the day template to update.
            template_data: The data to update the template with.
            current_user_id: The ID of the user attempting the update.

        Returns:
            The updated DayTemplate object.

        Raises:
            DayTemplateNotFoundException: If the template with the given ID is not found.
            DayTemplateNameExistsException: If the new name conflicts with an existing template.
            TimeWindowNotFoundException: If any provided time_window_ids do not exist or belong to another user.
            NotOwnerException: If the template does not belong to the current user.
        """
        # Fetch the existing template, includes ownership check
        day_template = await self.get_day_template_by_id(template_id, current_user_id)

        # Check for name conflict if name is being updated (within the same user's templates)
        if template_data.name is not None and template_data.name != day_template.name:
            existing_template = await self.engine.find_one(
                DayTemplate,
                DayTemplate.name == template_data.name,
                DayTemplate.user.id == current_user_id,  # Changed to user.id
            )
            if existing_template:
                raise DayTemplateNameExistsException(name=template_data.name)
            day_template.name = template_data.name

        # Update description if provided
        if template_data.description is not None:
            day_template.description = template_data.description

        # Validate and update time_windows if provided
        if template_data.time_windows is not None:
            valid_time_windows: List[TimeWindow] = []
            if template_data.time_windows:  # If the list is not empty
                # Fetch TimeWindow objects matching the provided IDs AND owned by the current user
                fetched_windows = await self.engine.find(
                    TimeWindow,
                    TimeWindow.id.in_(template_data.time_windows),
                    TimeWindow.user.id == current_user_id,  # Changed to user.id
                )
                # Check if all provided IDs were found and belong to the user
                if len(fetched_windows) != len(template_data.time_windows):
                    found_ids = {tw.id for tw in fetched_windows}
                    missing_ids = [str(tid) for tid in template_data.time_windows if tid not in found_ids]
                    # Raise exception for the first missing/unowned ID found
                    raise TimeWindowNotFoundException(time_window_id=missing_ids[0])
                valid_time_windows = fetched_windows
            # Assign the validated list (could be empty if input was [])
            day_template.time_windows = valid_time_windows

        # Save the updated template
        await self.engine.save(day_template)
        return day_template

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
