---
id: TASK-2025-023
title: "Backend: LLM Integration for Self-Reflection"
status: done
priority: high
type: feature
estimate: M
parents: [TASK-2025-021]
created: 2025-07-15
updated: 2025-07-16
arch_refs: [ARCH-api-improve-reflection, ARCH-service-llm]
audit_log:
  - {date: 2025-07-16, user: "@Robotic-SSE-AI", action: "implemented feature and set status to done"}
  - {date: 2025-07-15, user: "@AI-DocArchitect", action: "created with status ready"}
---
## Description
Create a generic LLM text improvement endpoint and add robust error handling to support the self-reflection feature.

## Acceptance Criteria
-   A new `AIServiceUnavailableException` is created in `backend/app/core/exceptions.py` and handled in the middleware.
-   The `LLMService` in `llm_service.py` is generalized with a new `improve_text` method that wraps external client errors in the new exception.
-   A new `POST /llm/improve-reflection` endpoint is implemented in `daily_plans.py` that calls the new service method.
-   Tests are added for the new endpoint in `test_daily_plans.py`, covering both success and 503 failure cases.

## Definition of Done
-   All specified backend files for the LLM integration are updated and all related tests are passing.
