---
id: ARCH-feature-task-time-tracking
title: "Feature. Task Time Tracking"
type: feature
layer: application
owner: '@backend-team'
version: v1
status: current
created: 2025-07-04
updated: 2025-07-04
tags: [tasks, statistics, backend]
depends_on: []
referenced_by: []
---
## Context
This feature provides the functionality to track the total time a user has actively worked on a specific task. This is a core metric for understanding personal productivity and task effort.

## Structure
The time tracking is implemented within the `Task` model and managed by the `TaskService`.
-   `Task` model (`backend/app/db/models/task.py`): Contains an embedded `TaskStatistics` document.
-   `TaskStatistics` embedded model: Contains the `lasts_min` field, which stores the total accumulated time in minutes. It also contains timestamps like `was_taken_at` and `was_stopped_at` to facilitate calculation.
-   `TaskService` (`backend/app/services/task_service.py`): The `update_task` method contains the logic to calculate and update the time spent.

## Behavior
When the status of a task is updated from `in_progress` to any other status (e.g., `pending`, `done`), the service calculates the time elapsed since the task was last marked as `in_progress` (using the `was_taken_at` timestamp). This duration is converted to minutes and added to the `lasts_min` field, accumulating the total time spent on the task. The `was_stopped_at` timestamp is also updated.

## Evolution
### Historical
- v1: Initial implementation as described. This functionality was confirmed to meet requirements during the "Backend Statistics Extension" planning.
