---
id: ARCH-api-improve-reflection
title: "API. Improve Reflection Text Endpoint"
type: component
layer: presentation
owner: '@backend-team'
version: v1
status: planned
created: 2025-07-15
updated: 2025-07-15
tags: [reflection, llm, api, planned]
depends_on: [ARCH-service-llm]
referenced_by: []
---
## Context
This API endpoint is planned to support the Self-Reflection feature by providing a generic, LLM-powered text improvement capability. It will allow the frontend to request enhancements for user-written reflection notes, such as correcting grammar or improving clarity, without being tied to a specific task or data model field.

## Structure
A new endpoint will be added to the `daily_plans` router:
- **Endpoint:** `POST /api/v1/daily-plans/llm/improve-reflection`

This endpoint will accept a simple JSON payload containing the text to be improved and will return the enhanced text.

It will also leverage a new `AIServiceUnavailableException` to gracefully handle cases where the external LLM provider is unavailable, returning a `503 Service Unavailable` status to the client.

## Behavior
### `POST /llm/improve-reflection`
*   **Description:** Receives a piece of text and uses the `LLMService` to generate an improved version.
*   **Request Body:**
    ```json
    { "text": "string" }
    ```
*   **Success Response (200 OK):**
    ```json
    { "improved_text": "string" }
    ```
*   **Failure Response (503 Service Unavailable):**
    ```json
    { "detail": "AI service is currently unavailable." }
    ```

## Evolution
### Planned
- v1: Initial implementation as described in the "Self-Reflection Feature" refactoring plan.
