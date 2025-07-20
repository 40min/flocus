---
id: TASK-2025-002
title: "Backend: Remove 'reviewed' field from DailyPlan"
status: done
priority: high
type: tech_debt
estimate: M
assignee: '@backend-team'
created: 2025-07-19
updated: 2025-07-20
parents: [TASK-2025-001]
arch_refs: [ARCH-data-model-daily-plan, ARCH-api-daily-plan]
audit_log:
  - {date: 2025-07-20, user: "@Robotic-SSE-AI", action: "implemented feature and set status to done"}
  - {date: 2025-07-19, user: "@AI-DocArchitect", action: "created with status backlog"}
---
## Description
This task covers the full-stack removal of the `reviewed` field from the `DailyPlan` entity on the backend. This simplifies the data model and API in preparation for the new state-driven UI on the `MyDay` page.

## Acceptance Criteria
- **Task 1.1: Update Database Model:** The `reviewed` field is removed from the `DailyPlan` model in `backend/app/db/models/daily_plan.py`.
- **Task 1.2: Update API Schemas:** The `reviewed` field is removed from `DailyPlanUpdateRequest` and `DailyPlanResponse` schemas in `backend/app/api/schemas/daily_plan.py`.
- **Task 1.3: Update Service Logic:** The `update_daily_plan` method in `backend/app/services/daily_plan_service.py` no longer handles the `reviewed` field.
- **Task 1.4: Update Backend Tests:** Tests in `backend/tests/api/endpoints/test_daily_plans.py` that rely on the `reviewed` field are updated or removed, and all tests pass.

## Definition of Done
- Code changes are implemented as per the acceptance criteria.
- All backend tests pass.

## Notes
This is a prerequisite for the frontend work.
