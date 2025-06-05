from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import Depends, HTTPException, status
from odmantic import AIOEngine, ObjectId

from app.api.schemas.category import CategoryResponse
from app.api.schemas.daily_plan import (
    DailyPlanAllocationCreate,
    DailyPlanAllocationResponse,
    DailyPlanCreateRequest,
    DailyPlanResponse,
    DailyPlanReviewRequest,
    DailyPlanUpdateRequest,
)
from app.api.schemas.task import TaskResponse
from app.api.schemas.time_window import TimeWindowResponse
from app.db.connection import get_database
from app.db.models.category import Category
from app.db.models.daily_plan import DailyPlan
from app.mappers.daily_plan_mapper import DailyPlanMapper
from app.mappers.task_mapper import TaskMapper
from app.services.category_service import CategoryService
from app.services.task_service import TaskService


class DailyPlanService:
    def __init__(
        self,
        engine: AIOEngine = Depends(get_database),
        task_service: TaskService = Depends(TaskService),
        daily_plan_mapper: DailyPlanMapper = Depends(DailyPlanMapper),
        task_mapper: TaskMapper = Depends(TaskMapper),
        category_service: CategoryService = Depends(CategoryService),
    ):
        self.engine = engine
        self.task_service = task_service
        self.daily_plan_mapper = daily_plan_mapper
        self.task_mapper = task_mapper
        self.category_service = category_service

    async def _validate_allocation_categories(
        self,
        allocations_data: List[DailyPlanAllocationCreate],
        current_user_id: ObjectId,
    ):
        """
        Validates that all categories referenced in allocations exist and belong to the current user.
        Relies on CategoryService to raise appropriate exceptions (NotFound, NotOwner).
        """
        if not allocations_data:
            return
        for allocation_data in allocations_data:
            # This will raise CategoryNotFoundException or NotOwnerException if applicable
            await self.category_service.get_category_by_id(allocation_data.category_id, current_user_id)

    async def _validate_task_categories_for_allocations(
        self,
        allocations_data: List[DailyPlanAllocationCreate],
        current_user_id: ObjectId,
    ):
        for allocation_data in allocations_data:
            if not allocation_data.task_ids:
                continue

            tasks = await self.task_service.get_tasks_by_ids(
                task_ids=allocation_data.task_ids, current_user_id=current_user_id
            )
            tasks_dict = {task.id: task for task in tasks}

            for task_id in allocation_data.task_ids:
                task = tasks_dict.get(task_id)
                if not task:
                    # This implies a data integrity issue or task not found,
                    # which should be handled by get_tasks_by_ids or is a different error.
                    # For category validation, we assume task exists if ID is provided.
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Task with ID {task_id} not found for user.",
                    )

                if task.category_id is not None and task.category_id != allocation_data.category_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Task category does not match Time Window category.",
                    )

    async def _map_plan_to_response(self, plan: DailyPlan, current_user_id: ObjectId) -> DailyPlanResponse:
        response_allocations: List[DailyPlanAllocationResponse] = []
        for alloc_db in plan.allocations:  # These are DailyPlanAllocation instances
            # Fetch CategoryResponse
            category_resp: CategoryResponse = await self.category_service.get_category_by_id(
                alloc_db.category_id, current_user_id
            )
            # Construct TimeWindowResponse
            time_window_resp = TimeWindowResponse(
                id=ObjectId(),  # Placeholder ID for ad-hoc time window
                name=alloc_db.name,
                start_time=alloc_db.start_time,
                end_time=alloc_db.end_time,
                category=category_resp,
            )

            tasks_resp: List[TaskResponse] = []
            if alloc_db.task_ids:
                task_models = await self.task_service.get_tasks_by_ids(alloc_db.task_ids, current_user_id)
                for task_model in task_models:
                    category_model_for_task: Optional[Category] = None
                    if task_model.category_id:
                        # Assuming CategoryService has a method to get Category model by ID
                        # This might need adjustment based on actual CategoryService implementation
                        # For now, let's assume it can fetch the model directly or we fetch it here.
                        category_model_for_task = await self.engine.find_one(
                            Category, Category.id == task_model.category_id
                        )
                    tasks_resp.append(self.task_mapper.to_response(task_model, category_model_for_task))

            allocation_resp = self.daily_plan_mapper.to_allocation_response(
                time_window_response=time_window_resp, task_responses=tasks_resp
            )
            response_allocations.append(allocation_resp)

        return self.daily_plan_mapper.to_response(
            daily_plan_model=plan, populated_allocations_responses=response_allocations
        )

    async def create_daily_plan(
        self, plan_data: DailyPlanCreateRequest, current_user_id: ObjectId
    ) -> DailyPlanResponse:
        # Check for existing plan for the same date and user
        # Check for existing plan for the same date and user
        existing_plan = await self.engine.find_one(
            DailyPlan, (DailyPlan.plan_date == plan_data.plan_date) & (DailyPlan.user_id == current_user_id)
        )
        if existing_plan:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A daily plan for this date already exists.",
            )

        if plan_data.allocations:
            await self._validate_allocation_categories(plan_data.allocations, current_user_id)
            await self._validate_task_categories_for_allocations(plan_data.allocations, current_user_id)

        daily_plan_model = self.daily_plan_mapper.to_model_for_create(plan_data, current_user_id)

        await self.engine.save(daily_plan_model)
        return await self._map_plan_to_response(daily_plan_model, current_user_id)

    async def update_daily_plan(
        self, plan_id: ObjectId, daily_plan_update_request: DailyPlanUpdateRequest, current_user_id: ObjectId
    ) -> DailyPlanResponse:
        daily_plan = await self.engine.find_one(
            DailyPlan, (DailyPlan.id == plan_id) & (DailyPlan.user_id == current_user_id)
        )
        if not daily_plan:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Daily plan not found")

        update_data = daily_plan_update_request.model_dump(exclude_unset=True)

        if "allocations" in update_data:
            if daily_plan_update_request.allocations is not None:
                await self._validate_allocation_categories(daily_plan_update_request.allocations, current_user_id)
                await self._validate_task_categories_for_allocations(
                    daily_plan_update_request.allocations, current_user_id
                )
                daily_plan.allocations = self.daily_plan_mapper.allocations_request_to_models(
                    daily_plan_update_request.allocations
                )
            else:
                daily_plan.allocations = []

        if "reflection_content" in update_data:
            daily_plan.reflection_content = daily_plan_update_request.reflection_content
        if "notes_content" in update_data:
            daily_plan.notes_content = daily_plan_update_request.notes_content

        await self.engine.save(daily_plan)
        return await self._map_plan_to_response(daily_plan, current_user_id)

    async def get_daily_plan_by_date_internal(self, plan_date: datetime, current_user_id: ObjectId) -> DailyPlan:
        # To compare only the date part, query for plans within the 24-hour range of the given date
        start_of_day = datetime(plan_date.year, plan_date.month, plan_date.day, 0, 0, 0)
        end_of_day = datetime(plan_date.year, plan_date.month, plan_date.day, 23, 59, 59, 999999)
        plan = await self.engine.find_one(
            DailyPlan,
            (DailyPlan.plan_date >= start_of_day)
            & (DailyPlan.plan_date <= end_of_day)
            & (DailyPlan.user_id == current_user_id),
        )
        if not plan:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Daily plan not found for this date.")
        return plan

    async def get_daily_plan_by_id(self, plan_id: ObjectId, current_user_id: ObjectId) -> DailyPlanResponse:
        plan = await self.engine.find_one(DailyPlan, (DailyPlan.id == plan_id) & (DailyPlan.user_id == current_user_id))
        if not plan:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Daily plan not found by ID.")
        return await self._map_plan_to_response(plan, current_user_id)

    async def get_daily_plan_by_date(self, plan_date: datetime, current_user_id: ObjectId) -> DailyPlanResponse:
        plan = await self.get_daily_plan_by_date_internal(plan_date, current_user_id)
        return await self._map_plan_to_response(plan, current_user_id)

    async def review_yesterday_daily_plan(
        self, review_data: DailyPlanReviewRequest, current_user_id: ObjectId
    ) -> DailyPlanResponse:
        yesterday_date = datetime.now(timezone.utc).date() - timedelta(days=1)
        # Convert date object to datetime for internal method
        yesterday_datetime = datetime(yesterday_date.year, yesterday_date.month, yesterday_date.day, 0, 0, 0)

        daily_plan = await self.get_daily_plan_by_date_internal(yesterday_datetime, current_user_id)

        daily_plan.reviewed = True
        if review_data.reflection_content is not None:
            daily_plan.reflection_content = review_data.reflection_content
        if review_data.notes_content is not None:
            daily_plan.notes_content = review_data.notes_content

        await self.engine.save(daily_plan)
        return await self._map_plan_to_response(daily_plan, current_user_id)

    async def get_yesterday_daily_plan(self, current_user_id: ObjectId) -> DailyPlanResponse:
        yesterday_date = datetime.now(timezone.utc).date() - timedelta(days=1)
        # Convert date object to datetime for internal method
        yesterday_datetime = datetime(yesterday_date.year, yesterday_date.month, yesterday_date.day, 0, 0, 0)

        plan = await self.get_daily_plan_by_date_internal(yesterday_datetime, current_user_id)
        return await self._map_plan_to_response(plan, current_user_id)
