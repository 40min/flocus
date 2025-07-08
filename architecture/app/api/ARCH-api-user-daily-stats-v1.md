---
id: ARCH-api-user-daily-stats
title: "API. User Daily Statistics Endpoints"
type: component
layer: presentation
owner: '@backend-team'
version: v1
status: planned
created: 2025-07-04
updated: 2025-07-04
tags: [statistics, backend, api]
depends_on: [ARCH-service-user-daily-stats]
referenced_by: []
---
## Context
These API endpoints expose the user's daily statistical data to the frontend. This allows tracking and displaying metrics such as total daily active time and completed pomodoros, which are independent of specific tasks.

## Structure
A new FastAPI router will be added at `/api/v1/daily-stats`. It will provide endpoints for fetching and incrementing daily statistics for the authenticated user.

The router will define the following API schemas:
*   `UserDailyStatsResponse`: The main response body for retrieving daily stats.
*   `IncrementTimeRequest`: The request body for adding seconds to the daily time spent.

## Behavior
The API will expose the following endpoints:

*   **`GET /today`**
    *   **Description:** Get the daily statistics for the currently authenticated user for today.
    *   **Response Body:** `UserDailyStatsResponse`
        ```json
        {
          "date": "2023-10-27T00:00:00Z",
          "total_seconds_spent": 3600,
          "pomodoros_completed": 4
        }
        ```

*   **`POST /today/increment-time`**
    *   **Description:** Add a number of seconds to the user's total time spent for the day.
    *   **Request Body:** `IncrementTimeRequest`
    *   **Response:** `204 No Content`

*   **`POST /today/increment-pomodoro`**
    *   **Description:** Increment the user's completed pomodoros for the day by one.
    *   **Request Body:** (empty)
    *   **Response:** `204 No Content`

## Evolution
### Planned
- Initial implementation as described.
