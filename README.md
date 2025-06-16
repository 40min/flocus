# Personal Scheduler Application

A "personal scheduler" application designed to help software engineers plan their workday effectively. The application will be used locally on macOS, with the potential for future extension to different clients. It features a decoupled frontend (React, TypeScript, Tailwind) and backend (Python/FastAPI) interacting through a REST API. Data will be stored in MongoDB.

## Project Structure

This project is organized into the following main directories:

-   **`backend/`**: Contains the Python/FastAPI backend application. See [`backend/README.md`](backend/README.md:1) for more details.
-   **`frontend/`**: Contains the React/TypeScript frontend application. See [`frontend/README.md`](frontend/README.md:1) for more details.
-   **`memory-bank/`**: Contains project documentation and context.
-   **`bruno/`**: Contains Bruno API collection for testing endpoints.

## LLM Text Improvement

This application integrates with Large Language Models (LLMs) to offer advanced text manipulation capabilities for your tasks. You can:
- Improve the clarity and conciseness of existing task titles.
- Refine existing task descriptions.
- Generate new task descriptions based on task titles.

### Workflow

1.  **Initiate Action**: From the task list, you can choose an LLM action for a specific task (e.g., "Improve Title", "Improve Description", "Generate Description").
2.  **Fetch Suggestion**: The system communicates with the configured LLM provider to get a suggestion based on your chosen action and the task's content.
3.  **Review in Modal**: The LLM's suggestion is presented in a modal window. If you're improving existing text, the original text will also be shown for comparison.
4.  **Approve or Cancel**: You can review the suggestion and choose to:
    *   **Approve**: Applies the suggested text to the task field.
    *   **Cancel**: Discards the suggestion, leaving the task unchanged.

### Supported Providers

You can configure the application to use one of the following LLM providers:

-   **OpenAI**: Compatible with models like GPT-3.5 Turbo, GPT-4, etc.
-   **Google Gemini**: Compatible with models like Gemini Pro, Gemini 1.5 Pro, etc.

### Configuration

To enable and use these LLM features, you need to configure the following environment variables in your backend setup (typically in a `.env` file within the `backend` directory – see `backend/.env.example` for a template):

-   **`LLM_PROVIDER`**: Specifies which LLM provider to use.
    -   Set to `"OpenAI"` for OpenAI.
    -   Set to `"GoogleGemini"` for Google Gemini.
    -   Defaults to `"OpenAI"` if not explicitly set.
-   **`LLM_API_KEY`**: Your unique API key for the selected provider.
    -   This is **required** for any LLM functionality to work.
    -   Example for OpenAI: `sk-xxxxxxxxxxxxxxxxxxxx`
    -   Example for Google Gemini: `your_google_api_key_here`
-   **`LLM_TEXT_IMPROVEMENT_PROMPT`**: (Optional) The default base prompt used when requesting text improvements.
    -   Defaults to: `"Improve the following text:"`
    -   This prompt can be customized (e.g., "Make this more concise:") or overridden by specific actions (like description generation, which uses its own tailored prompt).
-   **`LLM_MODEL_NAME`**: (Optional) Specify the exact model name for your chosen `LLM_PROVIDER`.
    -   Examples for OpenAI: `"gpt-3.5-turbo"`, `"gpt-4"`.
    *   Examples for Google Gemini: `"gemini-pro"`, `"gemini-1.5-pro-latest"`.
    -   If left empty, the application will use a default model for the selected provider (e.g., "gpt-3.5-turbo" for OpenAI, "gemini-pro" for Google Gemini).

Ensure these variables are correctly set up in your backend environment for the LLM text improvement features to be available.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE:1) file for details.

Copyright (c) 2025 Andrei Sorokin
