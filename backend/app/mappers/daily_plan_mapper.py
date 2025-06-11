from typing import List

from odmantic import ObjectId

from app.api.schemas.daily_plan import (
    DailyPlanCreateRequest,      # Flat input schema for creating a daily plan
    DailyPlanResponse,           # Response schema for a full daily plan
    PopulatedTimeWindowResponse, # Wrapper schema for a time window within a daily plan response (contains detailed TW and tasks)
    TimeWindowCreateRequest,     # Flat input schema for creating a single time window
)
from app.api.schemas.task import TaskResponse
from app.api.schemas.time_window import TimeWindowResponse as TimeWindowModelResponse # Detailed response for a single TW from its own schema file
from app.db.models.daily_plan import DailyPlan, TimeWindow


class DailyPlanMapper:
    @staticmethod
    def time_windows_request_to_models(time_window_data: List[TimeWindowCreateRequest]) -> List[TimeWindow]:
        return [
            TimeWindow(
                description=tw.description,
                category_id=tw.category_id,
                start_time=tw.start_time,
                end_time=tw.end_time,
                task_ids=tw.task_ids,
            )
            for tw in time_window_data
        ]

    @staticmethod
    def to_time_window_response(
        time_window_response: TimeWindowModelResponse, task_responses: List[TaskResponse]
    ) -> PopulatedTimeWindowResponse:  # Return the wrapper PopulatedTimeWindowResponse
        # This method constructs the PopulatedTimeWindowResponse (wrapper).
        # The 'time_window' field of this wrapper expects a TimeWindowModelResponse (ImportedTimeWindowResponse).
        # The original 'flat_time_window_data' logic was trying to create a *flat* schema
        # from the TimeWindowModelResponse, which is not what the wrapper PopulatedTimeWindowResponse needs
        # for its 'time_window' field. It needs the TimeWindowModelResponse directly.

        # The internal structure of PopulatedTimeWindowResponse is:
        #   time_window: ImportedTimeWindowResponse  (this is TimeWindowModelResponse)
        #   tasks: List[TaskResponse]

        # Therefore, we directly pass the time_window_response (which is a TimeWindowModelResponse)
        # to the 'time_window' field of PopulatedTimeWindowResponse.
        return PopulatedTimeWindowResponse(time_window=time_window_response, tasks=task_responses)

    @staticmethod
    def to_response(
        daily_plan_model: DailyPlan, populated_time_window_responses: List[PopulatedTimeWindowResponse]
    ) -> DailyPlanResponse:
        return DailyPlanResponse(
            id=daily_plan_model.id,
            user_id=daily_plan_model.user_id,
            plan_date=daily_plan_model.plan_date,
            time_windows=populated_time_window_responses,
            reflection_content=daily_plan_model.reflection_content,
            notes_content=daily_plan_model.notes_content,
            reviewed=daily_plan_model.reviewed,
        )

    @staticmethod
    def to_model_for_create(schema: DailyPlanCreateRequest, user_id: ObjectId) -> DailyPlan:
        time_window_models = DailyPlanMapper.time_windows_request_to_models(schema.time_windows)
        return DailyPlan(
            user_id=user_id,
            plan_date=schema.plan_date,
            time_windows=time_window_models,
            reflection_content=schema.reflection_content,
            notes_content=schema.notes_content,
        )
