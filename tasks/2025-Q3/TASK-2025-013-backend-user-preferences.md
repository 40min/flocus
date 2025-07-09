---
id: TASK-2025-013
title: "Backend: Implement User Preferences Storage"
status: done
priority: high
type: feature
estimate: M
parents: [TASK-2025-012]
created: 2025-07-09
updated: 2025-07-10
arch_refs: [ARCH-feature-user-preferences]
  - {date: 2025-07-10, user: "@Robotic-SSE-AI", action: "implemented feature and set status to done"}
audit_log:
  - {date: 2025-07-09, user: "@AI-DocArchitect", action: "created with status ready"}
---
## Description
Extend the user data model and API to support storing and retrieving user preferences. This involves creating a new embedded model for preferences, updating the main user model and API schemas, and implementing the service-level logic to handle updates.

## Acceptance Criteria
- A `UserPreferences` embedded model is created in `backend/db/models/user.py` containing `pomodoro_timeout_minutes` and `system_notifications_enabled`.
- The `User` model in `backend/db/models/user.py` is updated with a `preferences` field using a `default_factory`.
- New API schemas `UserPreferencesSchema` and updated `UserUpdateRequest`/`UserResponse` are created in `backend/app/api/schemas/user.py`.
- The `update_user_by_id` method in `backend/app/services/user_service.py` is updated to correctly handle nested preference updates.
- Tests in `backend/tests/api/endpoints/test_users.py` are added/updated to cover the `preferences` field in user create, update, and retrieval operations.

## Definition of Done
- All backend code for the user preferences feature is implemented.
- All related backend tests covering new and updated functionality are written and passing.
- The changes are reviewed and merged into the main branch.
