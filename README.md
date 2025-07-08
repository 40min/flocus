# Personal Scheduler Application

A "personal scheduler" application designed to help software engineers plan their workday effectively. The application will be used locally on macOS, with the potential for future extension to different clients. It features a decoupled frontend (React, TypeScript, Tailwind) and backend (Python/FastAPI) interacting through a REST API. Data will be stored in MongoDB.

## Project Structure

This project is organized into the following main directories:

-   **`backend/`**: Contains the Python/FastAPI backend application. See [`backend/README.md`](backend/README.md:1) for more details.
-   **`frontend/`**: Contains the React/TypeScript frontend application. See [`frontend/README.md`](frontend/README.md:1) for more details.
-   **`memory-bank/`**: Contains project documentation and context.
-   **`bruno/`**: Contains Bruno API collection for testing endpoints.

## Core Features

This application provides a suite of tools to help you organize your day and focus on your tasks.

### The Dashboard: Your Focus Hub

The main dashboard is your central hub for focused work. It features:

*   **Pomodoro Timer:** A fully-featured Pomodoro timer with configurable work (25 min), short break (5 min), and long break (15 min) cycles. The timer's state is saved locally, so you can refresh the page without losing your session.
*   **Task List:** A list of tasks scheduled for the current time window.
*   **Start a Focus Session:** Simply drag a task from the list and drop it onto the timer to begin a focus session.
*   **Direct Task Controls:** Each task card has `Start`, `Pause`, and `Delete` buttons for quick actions without leaving the dashboard.

### Daily Planning: The "My Day" Page

The `/my-day` page is where you plan your schedule:

*   **Create a Plan:** You can create a daily plan from scratch or use a pre-defined template.
*   **Review Yesterday's Tasks:** If you don't have a plan for today, you can review yesterday's unfinished tasks and carry them over to the current day.
*   **Time Windows:** Organize your day into categorized blocks of time. You can add, delete, and edit the start time, end time, and description for each window.
*   **Assign Tasks:** Assign specific tasks to each time window. The task picker will intelligently show you tasks that match the time window's category.
*   **Visual Timeline:** A vertical timeline provides an at-a-glance overview of your day's schedule.

### Task and Category Management

*   **Tasks Page (`/tasks`):** A dedicated page to create, view, and manage all your tasks. Task descriptions support clickable Markdown links.
*   **Categories Page (`/categories`):** Create and manage categories with custom names, descriptions, and colors. Categories are used to organize both tasks and time windows.

### Database Backup

The application includes a script for backing up your MongoDB database. To run it, execute the following command from the project's root directory:

```bash
python backend/scripts/backup_database.py
```
This will create a timestamped backup of your collections in a `backups/` directory. Ensure your `.env` file in the `backend` directory is configured with the correct `DB_URL` and `BACKUP_DIRECTORY`.

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
