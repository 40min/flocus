---
id: TASK-2025-011
title: "UI: Display Task Status Icons in Daily Plan"
status: planned
priority: medium
type: feature
estimate: S
assignee: '@AI-DocArchitect'
created: 2025-07-08
updated: 2025-07-08
arch_refs: [ARCH-ui-assigned-task-balloon]
audit_log:
  - {date: 2025-07-08, user: "@AI-DocArchitect", action: "created with status done"}
---
## Description
The `TaskStatusBalloon` component, which displays tasks within the daily plan on the "My Day" page, was enhanced to show a visual indicator for the task's status. This provides users with an immediate visual cue about their progress on each task.

## Acceptance Criteria
- A status icon is displayed to the left of the task title inside each `TaskStatusBalloon`.
- The icon correctly reflects the task's status (`pending`, `in_progress`, `done`, `blocked`).
- Hovering over the status icon reveals a tooltip with the status text (e.g., "In Progress").
- The status-to-icon mapping logic is encapsulated for maintainability.
- Unit tests for `TaskStatusBalloon` are updated to verify the correct rendering of icons for all statuses.

## Definition of Done
*   The `TaskStatusIcon` component is created and integrated into `TaskStatusBalloon.tsx`.
*   The test suite in `TaskStatusBalloon.test.tsx` is updated and passes.
*   The `ARCH-ui-assigned-task-balloon-v1.md` architecture document is created.`
