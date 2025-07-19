---
id: TASK-2025-019
title: "Integration: Trigger Notification in SharedTimerContext"
status: done
priority: high
type: feature
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
Integrate the notification trigger into `SharedTimerContext` to fire notifications at the precise moment a timer or break session completes.

## Acceptance Criteria
- `SharedTimerContext.tsx` imports `useAuth` and `notificationService`.
- The `switchToNextMode` function is updated to check `user.preferences.system_notifications_enabled` and `Notification.permission`.
- A call to `notificationService.showNotification` is made with a context-aware message (e.g., mentioning the completed task).

## Definition of Done
- The notification logic is correctly implemented within `SharedTimerContext`.
