---
id: ARCH-service-llm
title: "Service. LLM Service"
type: service
layer: application
owner: '@backend-team'
version: v1
status: current
created: 2025-07-15
updated: 2025-07-15
tags: [llm, backend, service]
depends_on: []
referenced_by: []
---
## Context
This service acts as a facade for interacting with various Large Language Model (LLM) clients, such as OpenAI and Google Gemini. It provides a consistent interface for other parts of the backend to request text generation and improvement, abstracting away the specifics of each provider's API.

## Structure
The core of this component is the `LLMService` class in `backend/app/services/llm_service.py`. It is instantiated with a specific client (e.g., `OpenAIClient` or `GoogleGeminiClient`) that conforms to the `LLMClient` abstract base class.

## Behavior
The service currently provides a `process_llm_action` method for handling task-specific text improvements, such as generating a description from a title or improving an existing title or description. It constructs specific prompts based on the requested `LLMActionType`.

## Evolution
### Planned
- A new, more generic method `async def improve_text(self, text: str, prompt: str) -> str` will be added to support features like the Self-Reflection text enhancer.
- The service will be updated to wrap external client exceptions (e.g., `LLMGenerationError`) in a new `AIServiceUnavailableException` to provide clearer error feedback to API clients.

### Historical
- v1: Initial implementation for task title and description improvements.
