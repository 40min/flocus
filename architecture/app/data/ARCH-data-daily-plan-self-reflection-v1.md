---
id: ARCH-data-daily-plan-self-reflection
title: "Data Model. Daily Plan Self Reflection"
type: data_model
layer: infrastructure
owner: '@backend-team'
version: v1
status: planned
created: 2025-07-15
updated: 2025-07-15
tags: [reflection, data_model, backend, planned]
depends_on: []
referenced_by: []
---
## Context
To provide a more structured and guided user experience for daily reflections, the existing free-text `reflection_content` field in the `DailyPlan` model will be replaced. A new embedded document, `SelfReflection`, is planned to capture three distinct aspects of a user's reflection.

## Structure
The `DailyPlan` model in `backend/app/db/models/daily_plan.py` will be modified:
-   **Remove:** `reflection_content: Optional[str] = None`
-   **Add:** `self_reflection: Optional[SelfReflection] = None`

A new `odmantic.EmbeddedModel` named `SelfReflection` will be created to support this change:
```python
from odmantic import EmbeddedModel, Field
from typing import Optional

class SelfReflection(EmbeddedModel):
    positive: Optional[str] = Field(None, max_length=1000)
    negative: Optional[str] = Field(None, max_length=1000)
    follow_up_notes: Optional[str] = Field(None, max_length=1000)
```

## Behavior
This new structure will store up to three separate pieces of text, each with a 1000-character limit, corresponding to the positive, negative, and follow-up aspects of a daily reflection. All fields are optional to allow for partial reflections.

## Evolution
### Planned
- v1: Initial implementation to replace the unstructured `reflection_content` field.
