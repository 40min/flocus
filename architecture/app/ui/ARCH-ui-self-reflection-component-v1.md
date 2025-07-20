---
id: ARCH-ui-self-reflection-component
title: "UI. Self-Reflection Component"
type: component
layer: presentation
owner: '@frontend-team'
version: v1
status: planned
created: 2025-07-19
updated: 2025-07-19
tags: [reflection, ui, react, planned]
depends_on: [ARCH-api-improve-reflection]
referenced_by: []
---
## Context
This component provides the user interface for structured self-reflection, allowing users to input positive aspects, negative aspects, and follow-up notes for their daily plans.

## Structure
The component is defined in `frontend/src/components/SelfReflectionComponent.tsx`.
It will contain three primary text areas for:
-   `positive`: What went well today?
-   `negative`: What could have gone better?
-   `follow_up_notes`: Any additional notes or thoughts.
-   **`SuggestionBox.tsx`:** A reusable UI element to display an LLM suggestion with "Approve" and "Reject" buttons.

## Behavior
The component will be implemented as a **controlled component**. It will manage the internal state of the three text fields (`positive`, `negative`, `follow_up_notes`). As the user types, the component will communicate the updated reflection object to its parent component (`MyDayPage`) via an `onReflectionChange` callback prop.

It will no longer contain its own "Save" button or `onSave` logic. The parent component is responsible for persisting the reflection data.

Each text field will have an "Improve" button that uses the `useGenericLlmSuggestion` hook to fetch, display, and apply LLM-powered text enhancements.

## Evolution
### Planned
- v1: Initial implementation of the three-view state machine.
