---
id: TASK-2025-017
title: "Tests: Add Unit Tests for NotificationService"
status: backlog
priority: high
type: chore
estimate: 4h
assignee:
created: 2025-07-13
updated: 2025-07-13
parents: [TASK-2025-015]
arch_refs: [ARCH-service-notification]
audit_log:
  - {date: 2025-07-13, user: "@AI-DocArchitect", action: "created with status backlog"}
---
## Description
Add unit tests for the new `NotificationService` to ensure reliability and correct permission handling under various conditions.

## Acceptance Criteria
- A new test file `frontend/src/services/notificationService.test.ts` is created.
- The global `Notification` object is mocked to allow for testing without actual browser prompts.
- Tests cover all three permission states ('granted', 'denied', 'default') for both `requestPermission` and `showNotification` functions.
