---
id: TASK-2025-020
title: "Tests: Update SharedTimerContext Tests for Notifications"
status: done
priority: high
type: chore
estimate: 4h
assignee:
created: 2025-07-13
updated: 2025-07-13
parents: [TASK-2025-015]
arch_refs: [ARCH-feature-os-notifications]
audit_log:
  - {date: 2025-07-13, user: "@Robotic-SSE-AI", action: "implemented feature and set status to done"}
  - {date: 2025-07-13, user: "@AI-DocArchitect", action: "created with status backlog"}
---
## Description
Update the unit tests for `SharedTimerContext` to verify that it correctly orchestrates notifications based on user preferences and the current timer state.

## Acceptance Criteria
- Tests are added to `frontend/src/context/SharedTimerContext.test.tsx`.
- `useAuth` and `notificationService` are mocked within the test environment.
- Assert that `showNotification` is called with the correct message when a timer ends and settings are enabled.
- Assert that `showNotification` is **not** called when settings are disabled or browser permission is denied.

## Definition of Done
- All new and existing tests for `SharedTimerContext` are passing.
