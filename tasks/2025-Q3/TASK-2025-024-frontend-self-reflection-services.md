---
id: TASK-2025-024
title: "Frontend: Data & Service Layer for Self-Reflection"
status: done
priority: medium
type: feature
estimate: S
parents: [TASK-2025-021]
created: 2025-07-15
updated: 2025-07-16
arch_refs: [ARCH-feature-self-reflection]
audit_log:
  - {date: 2025-07-16, user: "@Robotic-SSE-AI", action: "implemented feature and set status to done"}
  - {date: 2025-07-15, user: "@AI-DocArchitect", action: "created with status ready"}
---
## Description
Align frontend data structures and API services with the new backend API for the self-reflection feature.

## Acceptance Criteria
-   In `frontend/src/types/dailyPlan.ts`, a `SelfReflection` interface is defined and `DailyPlanResponse` is updated to use it, replacing `reflection_content`.
-   In `frontend/src/services/dailyPlanService.ts`, the `updateDailyPlan` function is updated to correctly send the `self_reflection` object.
-   A new function `getLlmReflectionSuggestion(text: string)` is added to `dailyPlanService.ts` to call the new `POST /llm/improve-reflection` endpoint.

## Definition of Done
-   All specified frontend service and type files are updated to reflect the new API contract.
