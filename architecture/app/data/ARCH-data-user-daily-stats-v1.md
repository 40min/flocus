---
id: ARCH-data-user-daily-stats
title: "Data Model. User Daily Statistics"
type: data_model
layer: infrastructure
owner: '@backend-team'
version: v1
status: current
created: 2025-07-04
updated: 2025-07-08
tags: [statistics, backend, data_model]
depends_on: []
referenced_by: [ARCH-service-user-daily-stats]
---
## Context
To support aggregated daily statistics for users, a dedicated data model is required. This model decouples daily activity metrics (like total time spent or Pomodoros completed) from task-specific data and daily plans. This ensures that statistics can be recorded even if a user does not create a daily plan and provides a scalable foundation for future metrics.

## Structure
A new collection `user_daily_stats` will be created in MongoDB, represented by the `UserDailyStats` ODMantic model.

```python
from datetime import datetime, timezone

from odmantic import Field, Index, Model, ObjectId

class UserDailyStats(Model):
    user_id: ObjectId
    date: datetime  # Represents the specific day (time part should be zeroed)
    total_seconds_spent: int = Field(default=0)
    pomodoros_completed: int = Field(default=0)

    model_config = {
        "collection": "user_daily_stats",
        "indexes": lambda: [
            Index(UserDailyStats.user_id, UserDailyStats.date, unique=True)
        ],
    }
```

## Behavior
The model includes a unique compound index on `(user_id, date)` to ensure that there is only one statistics document per user per day. The `date` field will store the beginning of the day in UTC.

## Evolution
### Historical
- v1: Initial design for daily time and Pomodoro tracking.
