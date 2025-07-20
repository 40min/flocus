---
id: ARCH-api-daily-plan
title: "API. Daily Plan Endpoints"
type: component
layer: presentation
owner: '@backend-team'
version: v1
status: current
created: 2025-07-19
updated: 2025-07-19
tags: [daily-plan, api, backend]
depends_on: [ARCH-service-llm]
referenced_by: []
---
## Context
This component provides the API endpoints for creating, retrieving, and updating a user's daily plans. It serves as the primary interface for the frontend to manage daily schedules and reflections.

## Structure
The endpoints are defined in `backend/app/api/endpoints/daily_plans.py`.

Key endpoints:
- `POST /`: Create a new daily plan.
- `GET /today`: Get the daily plan for the current day.
- `GET /prev-day`: Get the daily plan for the last working day before today.
- `GET /id/{plan_id}`: Get a daily plan by its ID.
- `PUT /{plan_id}`: Update an existing daily plan, including its time windows, tasks, and self-reflection.
- `POST /llm/improve-reflection`: An LLM-powered endpoint to improve reflection text.

## Behavior
The API handles the validation of incoming data, such as ensuring time windows do not overlap and that tasks assigned to a time window have a matching category. The `PUT` endpoint currently accepts a `reviewed` field in its payload.

## Evolution
### Planned
- The `PUT /{plan_id}` endpoint will be updated to remove the `reviewed` field from its request body and response. This change is part of a larger refactoring to streamline the daily review process on the frontend.

### Historical
- v1: Initial implementation of CRUD operations for daily plans and LLM integration for reflections.
