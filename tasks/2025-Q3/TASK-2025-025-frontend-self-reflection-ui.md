---
id: TASK-2025-025
title: "Frontend: UI Implementation for Self-Reflection"
status: ready
priority: high
type: feature
estimate: L
parents: [TASK-2025-021]
created: 2025-07-15
updated: 2025-07-15
arch_refs: [ARCH-ui-self-reflection-component]
audit_log:
  - {date: 2025-07-15, user: "@AI-DocArchitect", action: "created with status ready"}
---
## Description
Build the new user interface on the "My Day" page for the structured self-reflection feature, including the creation of reusable components for handling LLM suggestions.

## Acceptance Criteria
-   A reusable `SuggestionBox.tsx` component is created to display suggestions with approve/reject buttons.
-   A reusable `useGenericLlmSuggestion.ts` hook is created to manage the state for fetching and applying LLM suggestions.
-   A new `SelfReflection.tsx` component is created that uses the hook and `SuggestionBox` to render three text areas, each with an "Improve" button and suggestion handling logic.
-   The `MyDayPage.tsx` is modified to remove the old reflection UI and integrate the new `SelfReflectionComponent`.
-   Data flow for saving the `self_reflection` object from `MyDayPage` is correctly implemented.
-   Tests for `MyDayPage` are updated to verify the new UI and save functionality.

## Definition of Done
-   All specified frontend components and hooks are created, integrated, and tested.
