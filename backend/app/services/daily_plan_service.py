from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import Depends, HTTPException, status
from odmantic import AIOEngine, ObjectId, query

from app.api.schemas.daily_plan import DailyPlanCreateRequest  # Takes TimeWindowCreateRequest
from app.api.schemas.daily_plan import DailyPlanUpdateRequest  # Takes TimeWindowCreateRequest
from app.api.schemas.daily_plan import PopulatedTimeWindowResponse  # Wrapper response schema for a time window item
from app.api.schemas.daily_plan import TimeWindowCreateRequest  # Flat input schema for a time window
from app.api.schemas.daily_plan import DailyPlanResponse
from app.api.schemas.task import TaskResponse
from app.api.schemas.time_window import TimeWindowResponse as TimeWindowModelResponse
from app.core.exceptions import DailyPlanNotFoundException, TaskCategoryMismatchException
from app.db.connection import get_database
from app.db.models.category import Category
from app.db.models.daily_plan import DailyPlan, SelfReflection
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

        await self.engine.save(daily_plan_model)
        return await self._map_plan_to_response(daily_plan_model, current_user_id)

    async def update_daily_plan(
        self, plan_id: ObjectId, daily_plan_update_request: DailyPlanUpdateRequest, current_user_id: ObjectId
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

        if "notes_content" in update_data:
            daily_plan.notes_content = daily_plan_update_request.notes_content
        if "self_reflection" in update_data and daily_plan_update_request.self_reflection is not None:
            if daily_plan.self_reflection is None:
                daily_plan.self_reflection = SelfReflection()

            reflection_update_data = daily_plan_update_request.self_reflection.model_dump(exclude_unset=True)
            for key, value in reflection_update_data.items():
                setattr(daily_plan.self_reflection, key, value)
        if "reviewed" in update_data:

            # Only update if the value is explicitly True or False, not None
            if daily_plan_update_request.reviewed is not None:
                daily_plan.reviewed = daily_plan_update_request.reviewed

        await self.engine.save(daily_plan)

        return await self._map_plan_to_response(daily_plan, current_user_id)

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
