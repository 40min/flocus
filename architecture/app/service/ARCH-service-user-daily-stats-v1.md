---
id: ARCH-service-user-daily-stats
title: "Service. User Daily Statistics"
type: service
layer: application
owner: '@backend-team'
version: v1
status: current
created: 2025-07-04
updated: 2025-07-08
tags: [statistics, backend, service]
depends_on: [ARCH-data-user-daily-stats]
referenced_by: [ARCH-api-user-daily-stats]
---
## Context
This service encapsulates all business logic for managing daily user statistics. It provides a clear separation of concerns, keeping statistical logic out of other services like `UserService` or `DailyPlanService`.

## Structure
A new service class `UserDailyStatsService` will be created in `backend/app/services/user_daily_stats_service.py`. It will contain methods for creating, updating, and retrieving daily statistics for a user.

Key methods include:
- `get_or_create_today(user_id)`: A helper that finds or creates (upserts) the statistics document for the user for the current day.
- `increment_time(user_id, seconds)`: Adds a specified number of seconds to the user's `total_seconds_spent` for the day.
- `increment_pomodoros(user_id)`: Increments the `pomodoros_completed` counter by one for the day.
- `get_today_stats(user_id)`: Retrieves the statistics document for the user for the current day.

## Behavior
The service will use an `upsert` pattern (via `get_or_create_today`) to ensure that a user's daily statistics document is automatically created on the first relevant event of the day (e.g., first time increment). Subsequent updates will use MongoDB's efficient `$inc` operator to increment counters, ensuring high performance and atomicity.

## Evolution
### Historical
- v1: Initial implementation.
