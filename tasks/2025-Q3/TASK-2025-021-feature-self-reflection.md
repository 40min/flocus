---
id: TASK-2025-021
title: "Feature: Refactor for Structured Self-Reflection"
status: done
priority: high
type: feature
estimate: L
created: 2025-07-15
updated: 2025-07-15
children:
  - TASK-2025-022
  - TASK-2025-023
  - TASK-2025-024
  - TASK-2025-025
arch_refs:
  - ARCH-feature-self-reflection
  - ARCH-data-daily-plan-self-reflection
  - ARCH-api-improve-reflection
  - ARCH-ui-self-reflection-component
audit_log:
  - {date: 2025-07-16, user: "@Robotic-SSE-AI", action: "implemented feature and set status to done"}
  - {date: 2025-07-15, user: "@AI-DocArchitect", action: "created with status ready"}
---
## Description
This task outlines the full-stack implementation of a structured "Self Reflection" feature. The primary objective is to replace the existing free-text `reflection_content` field in the Daily Plan with a dictionary containing `positive`, `negative`, and `follow_up_notes` fields. This change aims to provide users with a more guided and actionable reflection experience. The plan also includes adding LLM-powered text improvement capabilities for these new fields.

## Acceptance Criteria
- Users can create, view, and update their daily self-reflection across three new fields.
- An "Improve" button for each field triggers an LLM call and displays a suggestion.
- The approve/reject workflow for suggestions functions correctly.
- When the LLM service is down, the frontend displays an appropriate error message.

## Definition of Done
- All child tasks (22, 23, 24, 25) are completed and set to `done`.
- The feature is implemented and tested as per the plan.
- All related architecture documents are updated to `status: current`.
