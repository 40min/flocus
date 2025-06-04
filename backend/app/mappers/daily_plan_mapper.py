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
            DailyPlanAllocation(
                name=alloc.name,
                category_id=alloc.category_id,
                start_time=alloc.start_time,
                end_time=alloc.end_time,
                task_ids=alloc.task_ids,  # Changed from task_id
            )
            for alloc in allocation_data
        ]

    @staticmethod
    def to_allocation_response(
        time_window_response: TimeWindowResponse, task_responses: List[TaskResponse]
    ) -> DailyPlanAllocationResponse:
        return DailyPlanAllocationResponse(time_window=time_window_response, tasks=task_responses)

    @staticmethod
    def to_response(
        daily_plan_model: DailyPlan, populated_allocations_responses: List[DailyPlanAllocationResponse]
    ) -> DailyPlanResponse:
        return DailyPlanResponse(
            id=daily_plan_model.id,
            user_id=daily_plan_model.user_id,
            plan_date=daily_plan_model.plan_date,
            allocations=populated_allocations_responses,
            reflection_content=daily_plan_model.reflection_content,
            notes_content=daily_plan_model.notes_content,
        )

    @staticmethod
    def to_model_for_create(schema: DailyPlanCreateRequest, user_id: ObjectId) -> DailyPlan:
        allocations_models = DailyPlanMapper.allocations_request_to_models(schema.allocations)
        return DailyPlan(
            user_id=user_id,
            plan_date=schema.plan_date,
            allocations=allocations_models,
            reflection_content=schema.reflection_content,
            notes_content=schema.notes_content,
        )
