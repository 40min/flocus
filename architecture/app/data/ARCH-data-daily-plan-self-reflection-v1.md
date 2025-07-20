---
id: ARCH-data-daily-plan-self-reflection
title: "Data. Daily Plan Self-Reflection"
type: data_model
layer: infrastructure
owner: '@backend-team'
version: v1.1
status: current
created: 2025-07-15
updated: 2025-07-19
tags: [reflection, data_model, backend]
depends_on: []
referenced_by: []
---
## Context
To provide a more structured and guided user experience for daily reflections, the previous free-text `reflection_content` field in the `DailyPlan` model was replaced with a new embedded document, `SelfReflection`, to capture three distinct aspects of a user's reflection.

## Structure
The `DailyPlan` model in `backend/app/db/models/daily_plan.py` was modified:
-   **Remove:** `reflection_content: Optional[str] = None`
-   **Add:** `self_reflection: Optional[SelfReflection] = None`

The `SelfReflection` embedded document is defined as:
```python
class SelfReflection(EmbeddedDocument):
    positive: Optional[str] = None
    negative: Optional[str] = None
    follow_up_notes: Optional[str] = None
```

## Evolution
### Planned
- No immediate changes planned.

### Historical
- v1.1: Updated status to `current` as the feature has been implemented.
- v1: Initial plan to replace the unstructured `reflection_content` field.
