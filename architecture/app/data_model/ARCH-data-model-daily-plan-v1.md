---
id: ARCH-data-model-daily-plan
title: "Data Model. Daily Plan"
type: data_model
layer: infrastructure
owner: '@backend-team'
version: v1
status: current
created: 2025-07-19
updated: 2025-07-19
tags: [daily-plan, data_model, backend]
depends_on: []
referenced_by: []
---
## Context
The `DailyPlan` model is the core data structure for a user's daily schedule. It contains the date of the plan, time-blocked windows for activities, and a structured self-reflection.

## Structure
The model is defined in `backend/app/db/models/daily_plan.py`.

```python
class DailyPlan(Model):
    plan_date: datetime
    user_id: ObjectId
    time_windows: List[TimeWindow] = Field(default_factory=list)
    self_reflection: SelfReflection = Field(
        default_factory=lambda: SelfReflection(positive=None, negative=None, follow_up_notes=None)
    )
    reviewed: bool = Field(default=False)
```

Key fields:
- `time_windows`: A list of embedded `TimeWindow` documents, each representing a block of time with assigned tasks.
- `self_reflection`: An embedded `SelfReflection` document for structured daily review.
- `reviewed`: A boolean flag indicating if the user has reviewed the previous day's plan. This is planned for deprecation.

## Evolution
### Planned
- The `reviewed: bool` field will be removed as part of the MyDay page refactoring. The logic will instead rely on the presence or absence of a daily plan for the previous day to trigger the review/reflection flow.

### Historical
- v1: Initial model definition including structured self-reflection.
