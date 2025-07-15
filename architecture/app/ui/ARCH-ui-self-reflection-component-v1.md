---
id: ARCH-ui-self-reflection-component
title: "UI. Self Reflection Component"
type: component
layer: presentation
owner: '@frontend-team'
version: v1
status: planned
created: 2025-07-15
updated: 2025-07-15
tags: [reflection, ui, react, planned]
depends_on: [ARCH-api-improve-reflection]
referenced_by: []
---
## Context
This component is planned to provide the user interface for the structured self-reflection feature on the "My Day" page. It will replace the current single textarea with three dedicated fields, each integrated with an LLM-powered text improvement feature.

## Structure
-   **`SelfReflection.tsx`:** The main component that renders three text areas for `positive`, `negative`, and `follow_up_notes`. It will manage the local state of these fields.
-   **`useGenericLlmSuggestion.ts`:** A reusable React hook to encapsulate the state management for fetching, displaying, and applying LLM suggestions for a text field. It will handle `isLoading`, `error`, and `suggestion` states.
-   **`SuggestionBox.tsx`:** A reusable UI element to display an LLM suggestion with "Approve" and "Reject" buttons.

## Behavior
For each of the three reflection fields, the user can type their thoughts. An "Improve" button associated with each textarea will trigger a call to the `useGenericLlmSuggestion` hook. This hook, in turn, calls the backend API to fetch a suggestion. If a suggestion is returned, the `SuggestionBox` component will be rendered, allowing the user to either accept the suggestion (updating the textarea) or reject it (dismissing the suggestion box). The component's state is then passed up to the `MyDayPage` for saving.

## Evolution
### Planned
- v1: Initial implementation of the three-field reflection UI with LLM integration.
