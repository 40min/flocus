from datetime import date, datetime, time
from typing import List, Optional

from fastapi import Depends
from odmantic import AIOEngine, ObjectId

from app.api.schemas.category import CategoryResponse  # Ensure this is imported
from app.api.schemas.daily_plan import (
    DailyPlanAllocationCreate,
    DailyPlanAllocationResponse,
    DailyPlanCreateRequest,
    DailyPlanResponse,
    DailyPlanUpdateRequest,
)
from app.api.schemas.time_window import TimeWindowResponse  # Ensure this is imported
from app.core.exceptions import (  # TimeWindowNotFoundException,
    CategoryNotFoundException,
    DailyPlanExistsException,
    DailyPlanNotFoundException,
    NotOwnerException,
    TaskNotFoundException,
)
from app.db.connection import get_database
from app.db.models.category import Category
from app.db.models.daily_plan import DailyPlan
from app.db.models.task import Task

# from app.db.models.time_window import TimeWindow
from app.mappers.daily_plan_mapper import DailyPlanMapper
from app.mappers.task_mapper import TaskMapper

# from app.mappers.time_window_mapper import TimeWindowMapper


class DailyPlanService:
    def __init__(self, engine: AIOEngine = Depends(get_database)):
        self.engine = engine

    async def _validate_allocations(self, allocations_data: List[DailyPlanAllocationCreate], current_user_id: ObjectId):
        for alloc_data in allocations_data:
            category = await self.engine.find_one(
                Category,
                Category.id == alloc_data.category_id,
                Category.user == current_user_id,  # Corrected from Category.user_id
                Category.is_deleted == False,  # noqa: E712
            )
            if not category:
                raise CategoryNotFoundException(
                    category_id=alloc_data.category_id, detail=f"Category for allocation '{alloc_data.name}' not found."
                )

            task = await self.engine.find_one(
                Task,
                Task.id == alloc_data.task_id,
                Task.user_id == current_user_id,
                Task.is_deleted == False,  # noqa: E712
            )
            if not task:
                raise TaskNotFoundException(task_id=alloc_data.task_id)

    async def _build_daily_plan_response(self, daily_plan_model: DailyPlan) -> DailyPlanResponse:
        populated_allocation_responses: List[DailyPlanAllocationResponse] = []

        if not daily_plan_model.allocations:
            return DailyPlanMapper.to_response(daily_plan_model, [])

        task_ids: List[ObjectId] = list(set(alloc.task_id for alloc in daily_plan_model.allocations))
        tasks_db = await self.engine.find(Task, Task.id.in_(task_ids), Task.is_deleted == False)  # noqa: E712
        tasks_map = {task.id: task for task in tasks_db}

        category_ids_for_tw = {alloc.category_id for alloc in daily_plan_model.allocations}
        category_ids_for_tasks = {
            task.category_id for task_id in task_ids if (task := tasks_map.get(task_id)) and task.category_id
        }
        all_category_ids = list(category_ids_for_tw.union(category_ids_for_tasks))

        categories_db = []
        if all_category_ids:
            categories_db = await self.engine.find(
                Category, Category.id.in_(all_category_ids), Category.is_deleted is False
            )  # noqa: E712
        categories_map = {cat.id: cat for cat in categories_db}

        for allocation_model in daily_plan_model.allocations:
            task_model = tasks_map.get(allocation_model.task_id)
            if not task_model:
                raise TaskNotFoundException(task_id=allocation_model.task_id)

            tw_category_model = categories_map.get(allocation_model.category_id)
            if not tw_category_model:
                raise CategoryNotFoundException(
                    category_id=allocation_model.category_id,
                    detail=f"Category for embedded time window '{allocation_model.name}' not found.",
                )

            # Construct CategoryResponse for the embedded time window
            # CategoryResponse fields: id, name, description, color, user (aliased from user_id), is_deleted
            tw_category_response = CategoryResponse(
                id=tw_category_model.id,
                name=tw_category_model.name,
                description=tw_category_model.description,
                color=tw_category_model.color,
                user=tw_category_model.user,  # Use .user from model, maps to user_id field with alias 'user'
                is_deleted=tw_category_model.is_deleted,
            )

            time_window_response = TimeWindowResponse(
                name=allocation_model.name,
                start_time=allocation_model.start_time,
                end_time=allocation_model.end_time,
                category=tw_category_response,  # Use the constructed CategoryResponse
            )

            task_category_model: Optional[Category] = None
            if task_model.category_id:
                task_category_model = categories_map.get(task_model.category_id)
            task_response = TaskMapper.to_response(task_model, task_category_model)

            allocation_resp = DailyPlanMapper.to_allocation_response(time_window_response, task_response)
            populated_allocation_responses.append(allocation_resp)

        return DailyPlanMapper.to_response(daily_plan_model, populated_allocation_responses)

    async def create_daily_plan(
        self, plan_data: DailyPlanCreateRequest, current_user_id: ObjectId
    ) -> DailyPlanResponse:
        plan_datetime = datetime.combine(plan_data.plan_date, time.min)
        existing_plan = await self.engine.find_one(
            DailyPlan, DailyPlan.user_id == current_user_id, DailyPlan.plan_date == plan_datetime
        )
        if existing_plan:
            raise DailyPlanExistsException(date_value=plan_data.plan_date)

        await self._validate_allocations(plan_data.allocations, current_user_id)

        daily_plan = DailyPlanMapper.to_model_for_create(schema=plan_data, user_id=current_user_id)
        await self.engine.save(daily_plan)
        return await self._build_daily_plan_response(daily_plan)

    async def get_daily_plan_by_date(self, plan_date: date, current_user_id: ObjectId) -> DailyPlanResponse:
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

    async def get_daily_plan_by_date_internal(self, plan_date: date, current_user_id: ObjectId) -> DailyPlan:
        plan_datetime = datetime.combine(plan_date, time.min)
        daily_plan = await self.engine.find_one(
            DailyPlan, DailyPlan.user_id == current_user_id, DailyPlan.plan_date == plan_datetime
        )
        if not daily_plan:
            raise DailyPlanNotFoundException(plan_date=plan_date)
        return daily_plan

    async def update_daily_plan(
        self, plan_id: ObjectId, plan_data: DailyPlanUpdateRequest, current_user_id: ObjectId
    ) -> DailyPlanResponse:
        daily_plan = await self.engine.find_one(
            DailyPlan, DailyPlan.id == plan_id, DailyPlan.user_id == current_user_id
        )
        if not daily_plan:
            raise DailyPlanNotFoundException(plan_id=plan_id)

        if plan_data.allocations is not None:
            await self._validate_allocations(plan_data.allocations, current_user_id)
            daily_plan.allocations = DailyPlanMapper.allocations_request_to_models(
                allocation_data=plan_data.allocations
            )
        await self.engine.save(daily_plan)
        return await self._build_daily_plan_response(daily_plan)
