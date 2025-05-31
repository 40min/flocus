# from datetime import date, datetime, time
# from typing import List, Optional

# from fastapi import Depends, status
# from odmantic import AIOEngine, ObjectId

# from app.api.schemas.daily_plan import (
#     DailyPlanAllocationCreate,
#     DailyPlanAllocationResponse,
#     DailyPlanCreateRequest,
#     DailyPlanResponse,
#     DailyPlanUpdateRequest,
# )
# from app.core.exceptions import (
#     CategoryNotFoundException,
#     DailyPlanExistsException,
#     DailyPlanNotFoundException,
#     DailyPlanServiceException,
#     NotOwnerException,
#     TaskNotFoundException,
#     TimeWindowNotFoundException,
# )
# from app.db.connection import get_database
# from app.db.models.category import Category
# from app.db.models.daily_plan import DailyPlan
# from app.db.models.task import Task
# from app.db.models.time_window import TimeWindow
# from app.mappers.daily_plan_mapper import DailyPlanMapper
# from app.mappers.task_mapper import TaskMapper
# from app.mappers.time_window_mapper import TimeWindowMapper


# class DailyPlanService:
#     def __init__(self, engine: AIOEngine = Depends(get_database)):
#         self.engine = engine

#     async def _validate_allocations(self, allocations_data: List[DailyPlanAllocationCreate],
# current_user_id: ObjectId):
#         time_window_ids_in_request = [alloc.time_window_id for alloc in allocations_data]
#         if len(time_window_ids_in_request) != len(set(time_window_ids_in_request)):
#             raise DailyPlanServiceException(
#                 status_code=status.HTTP_400_BAD_REQUEST, detail="Duplicate time_window_ids found in allocations."
#             )

#         for alloc_data in allocations_data:
#             time_window = await self.engine.find_one(
#                 TimeWindow,
#                 TimeWindow.id == alloc_data.time_window_id,
#                 TimeWindow.user == current_user_id,
#                 TimeWindow.is_deleted == False,  # noqa: E712
#             )
#             if not time_window:
#                 raise TimeWindowNotFoundException(time_window_id=alloc_data.time_window_id)

#             task = await self.engine.find_one(
#                 Task,
#                 Task.id == alloc_data.task_id,
#                 Task.user_id == current_user_id,
#                 Task.is_deleted == False,  # noqa: E712
#             )
#             if not task:
#                 raise TaskNotFoundException(task_id=alloc_data.task_id)

#     async def _build_daily_plan_response(self, daily_plan_model: DailyPlan) -> DailyPlanResponse:
#         populated_allocation_responses: List[DailyPlanAllocationResponse] = []

#         if not daily_plan_model.allocations:
#             return DailyPlanMapper.to_response(daily_plan_model, [])

#         # Batch fetch related models
#         time_window_ids: List[ObjectId] = list(set(alloc.time_window_id for alloc in daily_plan_model.allocations))
#         task_ids: List[ObjectId] = list(set(alloc.task_id for alloc in daily_plan_model.allocations))

#         time_windows_db = await self.engine.find(
#             TimeWindow, TimeWindow.id.in_(time_window_ids), TimeWindow.is_deleted == False  # noqa: E712
#         )
#         tasks_db = await self.engine.find(Task, Task.id.in_(task_ids), Task.is_deleted == False)  # noqa: E712

#         time_windows_map = {tw.id: tw for tw in time_windows_db}
#         tasks_map = {task.id: task for task in tasks_db}

#         # Collect category IDs needed for TimeWindows and Tasks
#         category_ids_for_tw = {
#             tw.category for tw_id in time_window_ids if (tw := time_windows_map.get(tw_id)) and tw.category
#         }
#         category_ids_for_tasks = {
#             task.category_id for task_id in task_ids if (task := tasks_map.get(task_id)) and task.category_id
#         }
#         all_category_ids = list(category_ids_for_tw.union(category_ids_for_tasks))

#         categories_db = await self.engine.find(Category, Category.id.in_(all_category_ids))
#         categories_map = {cat.id: cat for cat in categories_db}

#         for allocation_model in daily_plan_model.allocations:
#             time_window_model = time_windows_map.get(allocation_model.time_window_id)
#             task_model = tasks_map.get(allocation_model.task_id)

#             if not time_window_model:
#                 raise TimeWindowNotFoundException(time_window_id=allocation_model.time_window_id)
#             if not task_model:
#                 raise TaskNotFoundException(task_id=allocation_model.task_id)

#             # Create TimeWindowResponse using TimeWindowMapper
#             tw_category_model = categories_map.get(time_window_model.category)
#             if not tw_category_model:  # Category for TimeWindow is mandatory
#                 raise CategoryNotFoundException(
#                     category_id=time_window_model.category,
#                     detail=f"Category for TimeWindow {time_window_model.id} not found or not active.",
#                 )
#             time_window_response = TimeWindowMapper.to_response(time_window_model, tw_category_model)

#             # Create TaskResponse using TaskMapper
#             task_category_model: Optional[Category] = None
#             if task_model.category_id:
#                 task_category_model = categories_map.get(task_model.category_id)
#             task_response = TaskMapper.to_response(task_model, task_category_model)

#             # Create DailyPlanAllocationResponse using DailyPlanMapper
#             allocation_resp = DailyPlanMapper.to_allocation_response(time_window_response, task_response)
#             populated_allocation_responses.append(allocation_resp)

#         return DailyPlanMapper.to_response(daily_plan_model, populated_allocation_responses)

#     async def create_daily_plan(
#         self, plan_data: DailyPlanCreateRequest, current_user_id: ObjectId
#     ) -> DailyPlanResponse:
#         # Convert date to datetime at midnight for DB operations
#         plan_datetime = datetime.combine(plan_data.plan_date, time.min)
#         existing_plan = await self.engine.find_one(
#             DailyPlan, DailyPlan.user_id == current_user_id, DailyPlan.plan_date == plan_datetime
#         )
#         if existing_plan:
#             raise DailyPlanExistsException(date_value=plan_data.plan_date)
#         await self._validate_allocations(plan_data.allocations, current_user_id)

#         daily_plan = DailyPlanMapper.to_model_for_create(schema=plan_data, user_id=current_user_id)
#         # Ensure plan_datetime from mapper is used for the model, if not already handled by mapper
#         # DailyPlanMapper.to_model_for_create already sets plan_date to plan_datetime
#         await self.engine.save(daily_plan)
#         return await self._build_daily_plan_response(daily_plan)

#     async def get_daily_plan_by_date(self, plan_date: date, current_user_id: ObjectId) -> DailyPlanResponse:
#         # Convert date to datetime at midnight for DB operations
#         plan_datetime = datetime.combine(plan_date, time.min)
#         daily_plan = await self.engine.find_one(
#             DailyPlan, DailyPlan.user_id == current_user_id, DailyPlan.plan_date == plan_datetime
#         )
#         if not daily_plan:
#             raise DailyPlanNotFoundException(plan_date=plan_date)
#         return await self._build_daily_plan_response(daily_plan)

#     async def get_daily_plan_by_id(self, plan_id: ObjectId, current_user_id: ObjectId) -> DailyPlanResponse:
#         daily_plan = await self.engine.find_one(DailyPlan, DailyPlan.id == plan_id)
#         if not daily_plan:
#             raise DailyPlanNotFoundException(plan_id=plan_id)
#         if daily_plan.user_id != current_user_id:
#             raise NotOwnerException(resource="daily plan")
#         return await self._build_daily_plan_response(daily_plan)

#     async def get_daily_plan_by_date_internal(self, plan_date: date, current_user_id: ObjectId) -> DailyPlan:
#         """
#         Internal method to fetch a daily plan by date, returning the model instance.
#         Raises DailyPlanNotFoundException if not found.
#         """
#         plan_datetime = datetime.combine(plan_date, time.min)
#         daily_plan = await self.engine.find_one(
#             DailyPlan, DailyPlan.user_id == current_user_id, DailyPlan.plan_date == plan_datetime
#         )
#         if not daily_plan:
#             raise DailyPlanNotFoundException(plan_date=plan_date)
#         return daily_plan

#     async def update_daily_plan(
#         self, plan_id: ObjectId, plan_data: DailyPlanUpdateRequest, current_user_id: ObjectId
#     ) -> DailyPlanResponse:
#         daily_plan = await self.engine.find_one(
#             DailyPlan, DailyPlan.id == plan_id, DailyPlan.user_id == current_user_id
#         )
#         if not daily_plan:
#             raise DailyPlanNotFoundException(plan_id=plan_id)

#         # If plan_data.allocations is provided (it's Optional[List[DailyPlanAllocationCreate]])
#         if plan_data.allocations is not None:
#             await self._validate_allocations(plan_data.allocations, current_user_id)
#             daily_plan.allocations = DailyPlanMapper.allocations_request_to_models(
#                 allocation_data=plan_data.allocations
#             )
#         await self.engine.save(daily_plan)
#         return await self._build_daily_plan_response(daily_plan)
