from datetime import datetime, time
from typing import List

from odmantic import ObjectId

from app.api.schemas.daily_plan import (
    DailyPlanAllocationCreate,
    DailyPlanAllocationResponse,
    DailyPlanCreateRequest,
    DailyPlanResponse,
)
from app.api.schemas.task import TaskResponse
from app.api.schemas.time_window import TimeWindowResponse
from app.db.models.daily_plan import DailyPlan, DailyPlanAllocation


class DailyPlanMapper:
    @staticmethod
    def allocations_request_to_models(allocation_data: List[DailyPlanAllocationCreate]) -> List[DailyPlanAllocation]:
        return [
            DailyPlanAllocation(time_window_id=alloc.time_window_id, task_id=alloc.task_id) for alloc in allocation_data
        ]

    @staticmethod
    def to_allocation_response(
        time_window_response: TimeWindowResponse, task_response: TaskResponse
    ) -> DailyPlanAllocationResponse:
        return DailyPlanAllocationResponse(time_window=time_window_response, task=task_response)

    @staticmethod
    def to_response(
        daily_plan_model: DailyPlan, populated_allocations_responses: List[DailyPlanAllocationResponse]
    ) -> DailyPlanResponse:
        return DailyPlanResponse(
            id=daily_plan_model.id,
            user_id=daily_plan_model.user_id,
            plan_date=daily_plan_model.plan_date.date(),  # Convert datetime to date
            allocations=populated_allocations_responses,
        )

    @staticmethod
    def to_model_for_create(schema: DailyPlanCreateRequest, user_id: ObjectId) -> DailyPlan:
        plan_datetime = datetime.combine(schema.plan_date, time.min)
        allocations_models = DailyPlanMapper.allocations_request_to_models(schema.allocations)
        return DailyPlan(user_id=user_id, plan_date=plan_datetime, allocations=allocations_models)
