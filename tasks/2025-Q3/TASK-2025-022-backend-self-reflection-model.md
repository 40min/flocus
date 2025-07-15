---
id: TASK-2025-022
title: "Backend: Core Refactoring for Self-Reflection Model"
status: ready
priority: high
type: feature
estimate: M
parents: [TASK-2025-021]
created: 2025-07-15
updated: 2025-07-15
arch_refs: [ARCH-data-daily-plan-self-reflection]
audit_log:
  - {date: 2025-07-15, user: "@AI-DocArchitect", action: "created with status ready"}
---
## Description
This task involves updating the backend data model and API contract to support the new structured `self_reflection` field. It replaces the old single-string `reflection_content` with a nested `SelfReflection` object.

## Acceptance Criteria
-   In `backend/app/db/models/daily_plan.py`, a new `SelfReflection(EmbeddedModel)` with `positive`, `negative`, `follow_up_notes` fields is created, and `DailyPlan` is updated to use it.
-   In `backend/app/api/schemas/daily_plan.py`, corresponding Pydantic schemas (`SelfReflectionSchema`, `SelfReflectionUpdateRequest`) are created and integrated into `DailyPlanResponse` and `DailyPlanUpdateRequest`.
-   `daily_plan_mapper.py` and `daily_plan_service.py` are updated to correctly handle the new nested structure.
-   Backend tests in `test_daily_plans.py` are updated to verify the creation and update of plans with the `self_reflection` object.

## Definition of Done
-   All specified backend files are updated and all related tests are passing.
