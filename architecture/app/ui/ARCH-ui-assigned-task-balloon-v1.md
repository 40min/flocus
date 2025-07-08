---
id: ARCH-ui-assigned-task-balloon
title: "UI. Assigned Task Balloon"
type: component
layer: presentation
owner: '@frontend-team'
version: v1
status: planned
created: 2025-07-08
updated: 2025-07-08
tags: [ui, task, my-day, daily-plan]
depends_on: []
referenced_by: []
---
## Context
The `TaskStatusBalloon` component is a small, self-contained UI element used on the "My Day" page within a `TimeWindowBalloon`. Its purpose is to provide a concise visual representation of a single task that has been assigned to that time window.

## Structure
The component is implemented in `frontend/src/components/TaskStatusBalloon.tsx`. It receives a `task` object as a prop and renders its title and status.

It contains a dedicated internal component, `TaskStatusIcon`, which is responsible for mapping a `TaskStatus` enum to a specific icon from the `lucide-react` library.

### Icon Mapping
- `done`: `CheckCircle` (green)
- `in_progress`: `LoaderCircle` (blue, spinning)
- `blocked`: `XCircle` (red)
- `pending`: `Circle` (slate)

## Behavior
The component displays a status icon, followed by the task's title. The title will truncate if space is limited.

If an `onUnassign` callback function is provided, a small "unassign" button (a minus-circle icon) is displayed at the end of the balloon. Clicking this button triggers the callback with the task's ID.

The status icon includes a `title` attribute for accessibility, providing a tooltip on hover with the name of the status (e.g., "In Progress").

## Evolution
### Historical
- v1: Initial implementation displaying the task status icon, title, and an optional unassign button. This provides at-a-glance information about task progress on the daily plan.
