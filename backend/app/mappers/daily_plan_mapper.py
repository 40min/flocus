from typing import List

from odmantic import ObjectId

from app.api.schemas.daily_plan import DailyPlanCreateRequest  # Flat input schema for creating a daily plan
from app.api.schemas.daily_plan import DailyPlanResponse  # Response schema for a full daily plan
from app.api.schemas.daily_plan import TimeWindowCreateRequest  # Flat input schema for creating a single time window
from app.api.schemas.daily_plan import PopulatedTimeWindowResponse
from app.api.schemas.daily_plan import SelfReflection as SchemaSelfReflection
from app.api.schemas.task import TaskResponse
from app.api.schemas.time_window import (
    TimeWindowResponse as TimeWindowModelResponse,  # Detailed response for a single TW from its own schema file
)
from app.db.models.daily_plan import DailyPlan
from app.db.models.daily_plan import SelfReflection as ModelSelfReflection
from app.db.models.daily_plan import TimeWindow


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

        self_reflection = (
            SchemaSelfReflection(**daily_plan_model.self_reflection.model_dump())
            if daily_plan_model.self_reflection
            else SchemaSelfReflection(positive=None, negative=None, follow_up_notes=None)
        )
        return DailyPlanResponse(
            id=daily_plan_model.id,
            user_id=daily_plan_model.user_id,
            plan_date=daily_plan_model.plan_date,
            self_reflection=self_reflection,
            time_windows=populated_time_window_responses,
        )

    @staticmethod
    def to_model_for_create(schema: DailyPlanCreateRequest, user_id: ObjectId) -> DailyPlan:

        time_window_models = DailyPlanMapper.time_windows_request_to_models(schema.time_windows)
        self_reflection = (
            ModelSelfReflection(**schema.self_reflection.model_dump())
            if schema.self_reflection
            else ModelSelfReflection(positive=None, negative=None, follow_up_notes=None)
        )
        return DailyPlan(
            user_id=user_id,
            plan_date=schema.plan_date,
            time_windows=time_window_models,
            self_reflection=self_reflection,
        )  # type: ignore
