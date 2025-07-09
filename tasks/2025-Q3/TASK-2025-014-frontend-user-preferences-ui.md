---
id: TASK-2025-014
title: "Frontend: Refactor User Settings UI for Preferences"
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
Refactor the User Settings page UI to connect to the new backend capabilities for user preferences. This includes updating frontend types, removing obsolete UI elements, and implementing a new form for the new settings.

## Acceptance Criteria
- A `UserPreferences` interface is created in `frontend/src/types/user.ts` and the main `User` interface is updated.
- The "Dark Mode" and "Default View" settings are removed from `frontend/src/pages/UserSettingsPage.tsx`.
- A dropdown for "Pomodoro timeout" and a toggle switch for "System notifications" are added to the settings page.
- The settings form uses `react-hook-form` and is pre-populated with data from the user's `preferences` object.
- The form's `onSubmit` handler correctly constructs a payload including the nested `preferences` object for the API call.
- Tests in `frontend/src/pages/UserSettingsPage.test.tsx` are updated to assert the UI changes and correct form submission payload.

## Definition of Done
- All frontend code for the user preferences UI is implemented.
- All related frontend tests covering new and updated functionality are written and passing.
- The changes are reviewed and merged into the main branch.
