from datetime import date, datetime, time
from typing import List

from fastapi import Depends, status
from odmantic import AIOEngine, ObjectId

from app.api.schemas.category import CategoryResponse
from app.api.schemas.daily_plan import (
    DailyPlanAllocationCreate,
    DailyPlanAllocationResponse,
    DailyPlanCreateRequest,
    DailyPlanResponse,
    DailyPlanUpdateRequest,
)
from app.api.schemas.task import TaskResponse as TaskResponseSchema
from app.api.schemas.time_window import TimeWindowResponse as TimeWindowResponseSchema
from app.core.exceptions import (
    CategoryNotFoundException,
    DailyPlanExistsException,
    DailyPlanNotFoundException,
    DailyPlanServiceException,
    NotOwnerException,
    TaskNotFoundException,
    TimeWindowNotFoundException,
)
from app.db.connection import get_database
from app.db.models.category import Category
from app.db.models.daily_plan import DailyPlan, DailyPlanAllocation
from app.db.models.task import Task
from app.db.models.time_window import TimeWindow


class DailyPlanService:
    def __init__(self, engine: AIOEngine = Depends(get_database)):
        self.engine = engine

    async def _validate_allocations(self, allocations_data: List[DailyPlanAllocationCreate], current_user_id: ObjectId):
        time_window_ids_in_request = [alloc.time_window_id for alloc in allocations_data]
        if len(time_window_ids_in_request) != len(set(time_window_ids_in_request)):
            raise DailyPlanServiceException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Duplicate time_window_ids found in allocations."
            )

        for alloc_data in allocations_data:
            time_window = await self.engine.find_one(
                TimeWindow,
                TimeWindow.id == alloc_data.time_window_id,
                TimeWindow.user == current_user_id,
                TimeWindow.is_deleted == False,  # noqa: E712
            )
            if not time_window:
                raise TimeWindowNotFoundException(time_window_id=alloc_data.time_window_id)

            task = await self.engine.find_one(
                Task,
                Task.id == alloc_data.task_id,
                Task.user_id == current_user_id,
                Task.is_deleted == False,  # noqa: E712
            )
            if not task:
                raise TaskNotFoundException(task_id=alloc_data.task_id)

    async def _build_daily_plan_response(self, daily_plan_model: DailyPlan) -> DailyPlanResponse:
        populated_allocations: List[DailyPlanAllocationResponse] = []

        if not daily_plan_model.allocations:
            return DailyPlanResponse(
                id=daily_plan_model.id,
                user_id=daily_plan_model.user_id,
                plan_date=daily_plan_model.plan_date.date(),
                allocations=[],
            )

        time_window_ids = list(set(alloc.time_window_id for alloc in daily_plan_model.allocations))
        task_ids = list(set(alloc.task_id for alloc in daily_plan_model.allocations))

        time_windows_db = await self.engine.find(
            TimeWindow, TimeWindow.id.in_(time_window_ids), TimeWindow.is_deleted == False  # noqa: E712
        )
        tasks_db = await self.engine.find(Task, Task.id.in_(task_ids), Task.is_deleted == False)  # noqa: E712

        time_windows_map = {tw.id: tw for tw in time_windows_db}
        tasks_map = {task.id: task for task in tasks_db}

        category_ids = set()
        for tw_id in time_window_ids:
            time_window = time_windows_map.get(tw_id)
            if time_window and time_window.category:
                category_ids.add(time_window.category)
        for task_id in task_ids:
            task = tasks_map.get(task_id)
            if task and task.category_id:
                category_ids.add(task.category_id)

        categories_db = await self.engine.find(Category, Category.id.in_(list(category_ids)))
        categories_map = {cat.id: cat for cat in categories_db}

        for allocation_model in daily_plan_model.allocations:
            time_window_model = time_windows_map.get(allocation_model.time_window_id)
            task_model = tasks_map.get(allocation_model.task_id)

            if not time_window_model:
                raise TimeWindowNotFoundException(time_window_id=allocation_model.time_window_id)
            if not task_model:
                raise TaskNotFoundException(task_id=allocation_model.task_id)

            tw_category_model = categories_map.get(time_window_model.category)
            if not tw_category_model:
                # This case should ideally not happen if data integrity is maintained
                # or if category is nullable and handled appropriately.
                # For now, raising an exception similar to original logic.
                raise CategoryNotFoundException(category_id=time_window_model.category)

            tw_response_data = time_window_model.model_dump()
            tw_response_data["category"] = CategoryResponse.model_validate(tw_category_model)
            time_window_response = TimeWindowResponseSchema.model_validate(tw_response_data)

            task_category_response = None
            if task_model.category_id:
                task_category_model = categories_map.get(task_model.category_id)
                if task_category_model:
                    task_category_response = CategoryResponse.model_validate(task_category_model)
                # else:
                # If task_category_model is None here, it means a category_id was present
                # but the category itself was not found or was soft-deleted.
                # Depending on requirements, could raise an error or proceed with None.
                # Current logic matches original: if category not found, response is None.

            task_response_data = task_model.model_dump()
            task_response_data["category"] = task_category_response
            task_response = TaskResponseSchema.model_validate(task_response_data)

            populated_allocations.append(
                DailyPlanAllocationResponse(time_window=time_window_response, task=task_response)
            )

        return DailyPlanResponse(
            id=daily_plan_model.id,
            user_id=daily_plan_model.user_id,
            plan_date=daily_plan_model.plan_date.date(),
            allocations=populated_allocations,
        )

    async def create_daily_plan(
        self, plan_data: DailyPlanCreateRequest, current_user_id: ObjectId
    ) -> DailyPlanResponse:
        # Convert date to datetime at midnight for DB operations
        plan_datetime = datetime.combine(plan_data.plan_date, time.min)

        existing_plan = await self.engine.find_one(
            DailyPlan, DailyPlan.user_id == current_user_id, DailyPlan.plan_date == plan_datetime
        )
        if existing_plan:
            raise DailyPlanExistsException(date_value=plan_data.plan_date)

        await self._validate_allocations(plan_data.allocations, current_user_id)

        allocations_models = [
            DailyPlanAllocation(time_window_id=alloc.time_window_id, task_id=alloc.task_id)
            for alloc in plan_data.allocations
        ]

        daily_plan = DailyPlan(user_id=current_user_id, plan_date=plan_datetime, allocations=allocations_models)
        await self.engine.save(daily_plan)
        return await self._build_daily_plan_response(daily_plan)

    async def get_daily_plan_by_date(self, plan_date: date, current_user_id: ObjectId) -> DailyPlanResponse:
        # Convert date to datetime at midnight for DB operations
        plan_datetime = datetime.combine(plan_date, time.min)
        daily_plan = await self.engine.find_one(
            DailyPlan, DailyPlan.user_id == current_user_id, DailyPlan.plan_date == plan_datetime
        )
        if not daily_plan:
            raise DailyPlanNotFoundException(plan_date=plan_date)
        return await self._build_daily_plan_response(daily_plan)

    async def get_daily_plan_by_id(self, plan_id: ObjectId, current_user_id: ObjectId) -> DailyPlanResponse:
        daily_plan = await self.engine.find_one(DailyPlan, DailyPlan.id == plan_id)
        if not daily_plan:
            raise DailyPlanNotFoundException(plan_id=plan_id)
        if daily_plan.user_id != current_user_id:
            raise NotOwnerException(resource="daily plan")
        return await self._build_daily_plan_response(daily_plan)

    async def update_daily_plan(
        self, plan_date: date, plan_data: DailyPlanUpdateRequest, current_user_id: ObjectId
    ) -> DailyPlanResponse:
        # Convert date to datetime at midnight for DB operations
        plan_datetime = datetime.combine(plan_date, time.min)
        daily_plan = await self.engine.find_one(
            DailyPlan, DailyPlan.user_id == current_user_id, DailyPlan.plan_date == plan_datetime
        )
        if not daily_plan:
            raise DailyPlanNotFoundException(plan_date=plan_date)

        update_fields = plan_data.model_dump(exclude_unset=True)

        if "allocations" in update_fields:
            # Parse list of dicts into List[DailyPlanAllocationCreate]
            new_allocations_data = [
                DailyPlanAllocationCreate(**alloc_dict) for alloc_dict in update_fields["allocations"]
            ]
            await self._validate_allocations(new_allocations_data, current_user_id)
            daily_plan.allocations = [
                DailyPlanAllocation(time_window_id=alloc.time_window_id, task_id=alloc.task_id)
                for alloc in new_allocations_data
            ]

        await self.engine.save(daily_plan)
        return await self._build_daily_plan_response(daily_plan)
