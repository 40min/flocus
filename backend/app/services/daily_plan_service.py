from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import Depends, HTTPException, status
from odmantic import AIOEngine, ObjectId, query

from app.api.schemas.daily_plan import DailyPlanCreateRequest  # Takes TimeWindowCreateRequest
from app.api.schemas.daily_plan import DailyPlanUpdateRequest  # Takes TimeWindowCreateRequest
from app.api.schemas.daily_plan import PopulatedTimeWindowResponse  # Wrapper response schema for a time window item
from app.api.schemas.daily_plan import TimeWindowCreateRequest  # Flat input schema for a time window
from app.api.schemas.daily_plan import CarryOverTimeWindowRequest, DailyPlanResponse, PlanApprovalResponse
from app.api.schemas.task import TaskResponse, TaskStatus
from app.api.schemas.time_window import TimeWindowResponse as TimeWindowModelResponse
from app.core.exceptions import DailyPlanNotFoundException, TaskCategoryMismatchException
from app.db.connection import get_database
from app.db.models.category import Category
from app.db.models.daily_plan import DailyPlan, SelfReflection, TimeWindow
from app.db.models.task import Task
from app.mappers.category_mapper import CategoryMapper
from app.mappers.daily_plan_mapper import DailyPlanMapper
from app.mappers.task_mapper import TaskMapper
from app.services.category_service import CategoryService
from app.services.task_service import TaskService
from app.services.user_daily_stats_service import get_utc_today_start


class DailyPlanService:
    def __init__(
        self,
        engine: AIOEngine = Depends(get_database),
        task_service: TaskService = Depends(TaskService),
        task_mapper: TaskMapper = Depends(TaskMapper),
        category_service: CategoryService = Depends(CategoryService),
    ):
        self.engine = engine
        self.task_service = task_service
        self.task_mapper = task_mapper
        self.category_service = category_service

    async def _validate_time_window_categories(
        self,
        time_windows_data: List[TimeWindowCreateRequest],
        current_user_id: ObjectId,
    ):
        """
        Validates that all categories referenced in time windows exist and belong to the current user.
        Relies on CategoryService to raise appropriate exceptions (NotFound, NotOwner).
        """
        if not time_windows_data:
            return
        for time_window_data in time_windows_data:
            # This will raise CategoryNotFoundException or NotOwnerException if applicable
            await self.category_service.get_category_by_id(time_window_data.category_id, current_user_id)

    async def _validate_task_categories_for_time_windows(
        self,
        time_windows_data: List[TimeWindowCreateRequest],
        current_user_id: ObjectId,
    ):
        for time_window_data in time_windows_data:
            if not time_window_data.task_ids:
                continue

            tasks = await self.task_service.get_tasks_by_ids(
                task_ids=time_window_data.task_ids, current_user_id=current_user_id
            )
            tasks_dict = {task.id: task for task in tasks}

            for task_id in time_window_data.task_ids:
                task = tasks_dict.get(task_id)
                if not task:
                    # This implies a data integrity issue or task not found,
                    # which should be handled by get_tasks_by_ids or is a different error.
                    # For category validation, we assume task exists if ID is provided.
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Task with ID {task_id} not found for user.",
                    )

                if task.category_id is not None and task.category_id != time_window_data.category_id:
                    raise TaskCategoryMismatchException(detail="Task category does not match Time Window category.")

    async def _map_plan_to_response(self, plan: DailyPlan, current_user_id: ObjectId) -> DailyPlanResponse:
        # 1. Gather all unique IDs from the plan
        tw_category_ids = set()
        all_task_ids = set()
        for tw in plan.time_windows:
            tw_category_ids.add(tw.category_id)
            all_task_ids.update(tw.task_ids)

        # 2. Batch fetch all tasks
        task_models: List[Task] = []
        if all_task_ids:
            task_models = await self.engine.find(
                Task,
                Task.id.in_(list(all_task_ids)),
                Task.user_id == current_user_id,
                Task.is_deleted == False,  # noqa: E712
            )
        task_category_ids = {task.category_id for task in task_models if task.category_id}

        # 3. Batch fetch all categories (for time windows and tasks)
        all_category_ids = tw_category_ids.union(task_category_ids)
        category_models: List[Category] = []
        if all_category_ids:
            category_models = await self.engine.find(
                Category, Category.id.in_(list(all_category_ids)), Category.user == current_user_id
            )

        # 4. Create in-memory maps for efficient lookup
        tasks_map: Dict[ObjectId, Task] = {task.id: task for task in task_models}
        categories_map: Dict[ObjectId, Category] = {cat.id: cat for cat in category_models}

        # 5. Build the response DTO using the maps
        response_time_windows: List[PopulatedTimeWindowResponse] = []
        for time_window_db in plan.time_windows:
            category_model = categories_map.get(time_window_db.category_id)
            if not category_model:
                # This indicates an orphaned or inaccessible category_id.
                # The old implementation would raise a 404/403 via get_category_by_id.
                # We will raise a generic error to signal a data integrity issue.
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Category with ID {time_window_db.category_id} not found or not accessible.",
                )

            category_resp = CategoryMapper.to_response(category_model)

            time_window_resp = TimeWindowModelResponse(
                id=ObjectId(),  # Placeholder ID for ad-hoc time window
                description=time_window_db.description,
                start_time=time_window_db.start_time,
                end_time=time_window_db.end_time,
                category=category_resp,
            )

            tasks_resp: List[TaskResponse] = []
            for task_id in time_window_db.task_ids:
                task_model = tasks_map.get(task_id)
                if task_model:
                    task_category_model = categories_map.get(task_model.category_id) if task_model.category_id else None
                    tasks_resp.append(self.task_mapper.to_response(task_model, task_category_model))

            final_time_window_resp = DailyPlanMapper.to_time_window_response(
                time_window_response=time_window_resp, task_responses=tasks_resp
            )
            response_time_windows.append(final_time_window_resp)

        # Ensure plan_date is timezone-aware (UTC) before mapping to response
        if plan.plan_date.tzinfo is None or plan.plan_date.tzinfo.utcoffset(plan.plan_date) is None:
            plan.plan_date = plan.plan_date.replace(tzinfo=timezone.utc)

        return DailyPlanMapper.to_response(daily_plan_model=plan, populated_time_window_responses=response_time_windows)

    async def create_daily_plan(
        self, plan_data: DailyPlanCreateRequest, current_user_id: ObjectId
    ) -> DailyPlanResponse:
        plan_date = plan_data.plan_date
        normalized_date_for_storage = datetime(
            plan_date.year, plan_date.month, plan_date.day, 0, 0, 0, tzinfo=timezone.utc
        )

        # Check for existing plan for the same date (normalized) and user
        existing_plan = await self.engine.find_one(
            DailyPlan, (DailyPlan.plan_date == normalized_date_for_storage) & (DailyPlan.user_id == current_user_id)
        )
        if existing_plan:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A daily plan for this date already exists.",
            )

        if plan_data.time_windows:
            await self._validate_time_window_categories(plan_data.time_windows, current_user_id)
            await self._validate_task_categories_for_time_windows(plan_data.time_windows, current_user_id)

        daily_plan_model = DailyPlanMapper.to_model_for_create(plan_data, current_user_id)
        daily_plan_model.plan_date = normalized_date_for_storage  # Ensure stored date is normalized UTC midnight
        daily_plan_model.reviewed = False  # Always set reviewed to False for new plans

        await self.engine.save(daily_plan_model)
        return await self._map_plan_to_response(daily_plan_model, current_user_id)

    async def update_daily_plan(
        self,
        plan_id: ObjectId,
        daily_plan_update_request: DailyPlanUpdateRequest,
        current_user_id: ObjectId,
        approve: bool = False,
    ) -> DailyPlanResponse:
        daily_plan = await self.engine.find_one(
            DailyPlan, (DailyPlan.id == plan_id) & (DailyPlan.user_id == current_user_id)
        )
        if not daily_plan:
            raise DailyPlanNotFoundException(plan_id=plan_id)

        update_data = daily_plan_update_request.model_dump(exclude_unset=True)

        if "time_windows" in update_data:
            if daily_plan_update_request.time_windows is not None:
                await self._validate_time_window_categories(daily_plan_update_request.time_windows, current_user_id)
                await self._validate_task_categories_for_time_windows(
                    daily_plan_update_request.time_windows, current_user_id
                )
                daily_plan.time_windows = DailyPlanMapper.time_windows_request_to_models(
                    daily_plan_update_request.time_windows
                )
            else:
                daily_plan.time_windows = []

        if "self_reflection" in update_data and daily_plan_update_request.self_reflection is not None:
            if daily_plan.self_reflection is None:
                daily_plan.self_reflection = SelfReflection(positive=None, negative=None, follow_up_notes=None)

            reflection_update_data = daily_plan_update_request.self_reflection.model_dump(exclude_unset=True)
            for key, value in reflection_update_data.items():
                setattr(daily_plan.self_reflection, key, value)

        # Reset reviewed flag to false when any updates are made (except during approval)
        if not approve:
            daily_plan.reviewed = False

        await self.engine.save(daily_plan)

        return await self._map_plan_to_response(daily_plan, current_user_id)

    async def approve_daily_plan(self, plan_id: ObjectId, current_user_id: ObjectId) -> PlanApprovalResponse:
        """
        Approve a daily plan by processing merges and validating for conflicts.

        Args:
            plan_id: ID of the daily plan to approve
            current_user_id: ID of the current user

        Returns:
            PlanApprovalResponse with plan data and merge information

        Raises:
            HTTPException: If plan not found, already reviewed, or conflicts exist
        """
        daily_plan = await self.engine.find_one(
            DailyPlan, (DailyPlan.id == plan_id) & (DailyPlan.user_id == current_user_id)
        )
        if not daily_plan:
            raise DailyPlanNotFoundException(plan_id=plan_id)

        if daily_plan.reviewed:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Daily plan is already reviewed and approved."
            )

        # Process time windows: merge same-category overlaps and detect conflicts
        processed_windows, merge_details, conflicts = self._process_and_validate_time_windows(daily_plan.time_windows)

        # If conflicts exist, return error with details
        if conflicts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "Cannot approve plan due to scheduling conflicts.", "conflicts": conflicts},
            )

        # Update plan with processed time windows and mark as reviewed
        daily_plan.time_windows = processed_windows
        daily_plan.reviewed = True

        await self.engine.save(daily_plan)

        # Create response
        plan_response = await self._map_plan_to_response(daily_plan, current_user_id)

        return PlanApprovalResponse(
            plan=plan_response, merged=len(merge_details) > 0, merge_details=merge_details if merge_details else None
        )

    async def get_daily_plan_by_date_internal(
        self, plan_date: datetime, current_user_id: ObjectId
    ) -> Optional[DailyPlan]:
        start_of_day = datetime(plan_date.year, plan_date.month, plan_date.day, 0, 0, 0, tzinfo=timezone.utc)
        end_of_day = datetime(plan_date.year, plan_date.month, plan_date.day, 23, 59, 59, 999999, tzinfo=timezone.utc)

        return await self.engine.find_one(
            DailyPlan,
            (DailyPlan.plan_date >= start_of_day)
            & (DailyPlan.plan_date <= end_of_day)
            & (DailyPlan.user_id == current_user_id),
        )

    async def get_daily_plan_by_id(self, plan_id: ObjectId, current_user_id: ObjectId) -> DailyPlanResponse:
        plan = await self.engine.find_one(DailyPlan, (DailyPlan.id == plan_id) & (DailyPlan.user_id == current_user_id))
        if not plan:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Daily plan not found by ID.")
        return await self._map_plan_to_response(plan, current_user_id)

    async def get_daily_plan_by_date(
        self, plan_date: datetime, current_user_id: ObjectId
    ) -> Optional[DailyPlanResponse]:
        plan = await self.get_daily_plan_by_date_internal(plan_date, current_user_id)
        return await self._map_plan_to_response(plan, current_user_id) if plan else None

    async def get_prev_day_daily_plan(self, current_user_id: ObjectId) -> Optional[DailyPlanResponse]:
        today_start_utc = get_utc_today_start()
        plan = await self.engine.find_one(
            DailyPlan,
            DailyPlan.user_id == current_user_id,
            DailyPlan.plan_date < today_start_utc,
            sort=query.desc(DailyPlan.plan_date),
        )
        return await self._map_plan_to_response(plan, current_user_id) if plan else None

    async def get_today_daily_plan(self, current_user_id: ObjectId) -> Optional[DailyPlanResponse]:
        today_date = datetime.now(timezone.utc).date()
        # Convert date object to datetime for internal method
        today_datetime = datetime(today_date.year, today_date.month, today_date.day, 0, 0, 0, tzinfo=timezone.utc)

        plan = await self.get_daily_plan_by_date_internal(today_datetime, current_user_id)
        return await self._map_plan_to_response(plan, current_user_id) if plan else None

    async def carry_over_time_window(
        self, carry_over_request: CarryOverTimeWindowRequest, current_user_id: ObjectId
    ) -> DailyPlanResponse:
        """
        Carry over a time window with its unfinished tasks to a target date.

        Args:
            carry_over_request: Request containing source plan ID, time window ID, and target date
            current_user_id: ID of the current user

        Returns:
            Updated source daily plan response

        Raises:
            HTTPException: If source plan not found, time window not found, or permission denied
        """
        # Get the source daily plan
        source_plan = await self.engine.find_one(
            DailyPlan, (DailyPlan.id == carry_over_request.source_plan_id) & (DailyPlan.user_id == current_user_id)
        )
        if not source_plan:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source daily plan not found.")

        # Find the time window to carry over
        time_window_to_carry = None
        time_window_index = None

        for i, tw in enumerate(source_plan.time_windows):
            # Generate stable identifier based on time window properties
            stable_id = f"{tw.category_id}_{tw.start_time}_{tw.end_time}"

            # Match by the stable identifier
            if carry_over_request.time_window_id == stable_id:
                time_window_to_carry = tw
                time_window_index = i
                break

        if time_window_to_carry is None or time_window_index is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Time window not found in the source daily plan."
            )

        # Get all tasks in the time window and filter out completed ones
        unfinished_task_ids = []
        if time_window_to_carry.task_ids:
            tasks = await self.task_service.get_tasks_by_ids(
                task_ids=time_window_to_carry.task_ids, current_user_id=current_user_id
            )
            unfinished_task_ids = [task.id for task in tasks if task.status != TaskStatus.DONE]

        # Create target datetime from target date
        target_datetime = datetime(
            carry_over_request.target_date.year,
            carry_over_request.target_date.month,
            carry_over_request.target_date.day,
            0,
            0,
            0,
            tzinfo=timezone.utc,
        )

        # Get or create target daily plan
        target_plan = await self.get_daily_plan_by_date_internal(target_datetime, current_user_id)

        if target_plan is None:
            # Create new daily plan for target date
            target_plan = DailyPlan(
                plan_date=target_datetime,
                user_id=current_user_id,
                time_windows=[],
                self_reflection=SelfReflection(positive=None, negative=None, follow_up_notes=None),
                reviewed=False,
            )

        # Create new time window for target plan with unfinished tasks only
        new_time_window = TimeWindow(
            description=time_window_to_carry.description,
            category_id=time_window_to_carry.category_id,
            start_time=time_window_to_carry.start_time,
            end_time=time_window_to_carry.end_time,
            task_ids=unfinished_task_ids,
        )

        # Add the new time window to target plan
        target_plan.time_windows.append(new_time_window)
        target_plan.reviewed = False  # Mark target plan as requiring review

        # Save target plan
        await self.engine.save(target_plan)

        # Remove the time window from source plan
        source_plan.time_windows.pop(time_window_index)
        await self.engine.save(source_plan)

        # Return updated source plan
        return await self._map_plan_to_response(source_plan, current_user_id)

    def _process_and_validate_time_windows(
        self, time_windows: List[TimeWindow]
    ) -> tuple[List[TimeWindow], List[str], List[str]]:
        """
        Process time windows by auto-merging same-category overlaps and detecting conflicts.

        Args:
            time_windows: List of time windows to process

        Returns:
            Tuple of (processed_time_windows, merge_details, conflicts)
        """
        if not time_windows:
            return [], [], []

        # Sort time windows by start time for processing
        sorted_windows = sorted(time_windows, key=lambda tw: tw.start_time)

        # Auto-merge overlapping same-category time windows
        merged_windows, merge_details = self._merge_overlapping_same_category(sorted_windows)

        # Detect conflicts between different categories
        conflicts = self._detect_category_conflicts(merged_windows)

        return merged_windows, merge_details, conflicts

    def _merge_overlapping_same_category(self, time_windows: List[TimeWindow]) -> tuple[List[TimeWindow], List[str]]:
        """
        Merge overlapping or adjacent time windows that have the same category.

        Args:
            time_windows: Sorted list of time windows by start_time

        Returns:
            Tuple of (merged_time_windows, merge_details)
        """
        if len(time_windows) <= 1:
            return time_windows, []

        merged_windows = []
        merge_details = []
        current_window = time_windows[0]

        for next_window in time_windows[1:]:
            # Check if windows overlap or are adjacent and have same category
            if (
                current_window.category_id == next_window.category_id
                and current_window.end_time >= next_window.start_time
            ):

                # Merge the windows
                merged_start = min(current_window.start_time, next_window.start_time)
                merged_end = max(current_window.end_time, next_window.end_time)

                # Combine task IDs from both windows (remove duplicates)
                combined_task_ids = list(set(current_window.task_ids + next_window.task_ids))

                # Combine descriptions if both exist
                merged_description = None
                if current_window.description and next_window.description:
                    merged_description = f"{current_window.description}; {next_window.description}"
                elif current_window.description:
                    merged_description = current_window.description
                elif next_window.description:
                    merged_description = next_window.description

                # Create merged window
                current_window = TimeWindow(
                    description=merged_description,
                    category_id=current_window.category_id,
                    start_time=merged_start,
                    end_time=merged_end,
                    task_ids=combined_task_ids,
                )

                # Add merge detail
                start_time_str = f"{merged_start // 60:02d}:{merged_start % 60:02d}"
                end_time_str = f"{merged_end // 60:02d}:{merged_end % 60:02d}"
                merge_details.append(f"Merged overlapping time windows into {start_time_str}-{end_time_str}")
            else:
                # No overlap or different category, add current window and move to next
                merged_windows.append(current_window)
                current_window = next_window

        # Add the last window
        merged_windows.append(current_window)

        return merged_windows, merge_details

    def _detect_category_conflicts(self, time_windows: List[TimeWindow]) -> List[str]:
        """
        Detect overlapping time windows with different categories.

        Args:
            time_windows: List of time windows to check for conflicts

        Returns:
            List of conflict descriptions
        """
        conflicts = []

        for i in range(len(time_windows)):
            for j in range(i + 1, len(time_windows)):
                window_a = time_windows[i]
                window_b = time_windows[j]

                # Check if windows overlap and have different categories
                if window_a.category_id != window_b.category_id and self._windows_overlap(window_a, window_b):

                    # Format time strings for conflict description
                    a_start = f"{window_a.start_time // 60:02d}:{window_a.start_time % 60:02d}"
                    a_end = f"{window_a.end_time // 60:02d}:{window_a.end_time % 60:02d}"
                    b_start = f"{window_b.start_time // 60:02d}:{window_b.start_time % 60:02d}"
                    b_end = f"{window_b.end_time // 60:02d}:{window_b.end_time % 60:02d}"

                    conflicts.append(
                        f"Time windows overlap: {a_start}-{a_end} and {b_start}-{b_end} have different categories"
                    )

        return conflicts

    def _windows_overlap(self, window_a: TimeWindow, window_b: TimeWindow) -> bool:
        """
        Check if two time windows overlap.

        Args:
            window_a: First time window
            window_b: Second time window

        Returns:
            True if windows overlap, False otherwise
        """
        return window_a.start_time < window_b.end_time and window_b.start_time < window_a.end_time
