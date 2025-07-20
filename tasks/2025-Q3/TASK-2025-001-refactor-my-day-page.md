---
id: TASK-2025-001
title: "Refactor MyDay Page Logic and UI Overhaul"
status: done
priority: high
type: feature
estimate: XL
assignee: '@frontend-team'
created: 2025-07-19
updated: 2025-07-20
children: [TASK-2025-002, TASK-2025-003, TASK-2025-004]
arch_refs: [ARCH-feature-my-day-conditional-view, ARCH-data-model-daily-plan, ARCH-api-daily-plan, ARCH-ui-self-reflection-component]
audit_log:
  - {date: 2025-07-20, user: "@Robotic-SSE-AI", action: "implemented feature and set status to done"}
  - {date: 2025-07-19, user: "@AI-DocArchitect", action: "created with status backlog"}
---
## Description
This epic outlines the refactoring of the `MyDay` page to introduce a new, state-driven user experience. The logic will conditionally display content based on the existence of a daily plan for today or the previous day. This refactoring also involves removing the `reviewed` field from the `DailyPlan` entity across the full stack and streamlining the UI for self-reflection and plan creation.

## Acceptance Criteria
- The `reviewed` field is completely removed from the backend and frontend.
- The `MyDay` page implements a three-state view: today's plan, previous day review, or new plan prompt.
- The self-reflection process is integrated into the plan creation flow after reviewing a previous day.
- The `SelfReflectionComponent` is refactored into a controlled component.

## Definition of Done
- All child tasks are completed.
- Backend and frontend tests are updated and passing.
- The new user flow is implemented and verified.

## Notes
This is a significant refactoring that will improve user experience and code maintainability. It is broken down into three main phases, represented by child tasks.
