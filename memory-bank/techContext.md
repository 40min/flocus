# Technology Context

# Logical Dependency Chain

1.  **Backend Setup:**
    -   Set up the Python/FastAPI backend with basic API endpoints.
    -   Connect to MongoDB.
    -   Implement data models using Odmantic.
2.  **Frontend Development:**
    -   Develop the React frontend with TypeScript and Tailwind.
    -   Implement basic UI components.
    -   Connect to the backend API.
3.  **Core Features:**
    -   Implement day template creation and customization.
    -   Implement task management.
    -   Implement Pomodoro timer.
    -   Implement time tracking.
4.  **UI/UX Improvements:**
    -   Refine the UI based on user feedback.
    -   Add self-reflection prompts.

## Technologies Used

*   **Frontend:**
    *   **React:** A JavaScript library for building user interfaces.
    *   **TypeScript:** A superset of JavaScript that adds static typing.
    *   **Tailwind CSS:** A utility-first CSS framework.
    *   **Axios:** A promise-based HTTP client for making API requests.
*   **Backend:**
    *   **Python:** A high-level, general-purpose programming language.
    *   **FastAPI:** A modern, high-performance web framework for building APIs with Python 3.7+ (with type hints).
    *   **Pydantic:** A data validation and settings management library.
    *   **Odmantic:** An asynchronous ODM (Object-Document Mapper) for MongoDB based on Pydantic models.
    *   **Uvicorn:** An ASGI server for running FastAPI applications.
*   **Database:**
    *   **MongoDB:** A NoSQL document database.
*   **Other:**
    *   **REST API:** Architectural style for communication between frontend and backend.
    *   **JSON:** Data-interchange format.
    *   **Docker:** Containerization platform (for development, testing, and potentially deployment).

## Software Development Tools

*   **IDE:** Visual Studio Code (VS Code) with relevant extensions (e.g., ESLint, Prettier, Python, TypeScript).
*   **Version Control:** Git (using GitHub for remote repository).
*   **Package Manager:**
    *   **Frontend:** npm (Node Package Manager)
    *   **Backend:** Poetry (Python dependency management and packaging)
*   **API Client:** Bruno (API client for testing and exploring APIs).
*   **Database Management:** MongoDB Compass (GUI for MongoDB).
*   **Containerization:** Docker and Docker Compose.

## Development Environment

*   **Operating System:** macOS (primary development environment).
*   **Python Version:** 3.9+
*   **Node.js Version:** 16+ (compatible with React and npm).
*   **MongoDB:** Locally installed MongoDB instance (or Dockerized MongoDB).
*   **Dependencies:** All project dependencies are managed through `package.json` (frontend) and `pyproject.toml` (backend using Poetry). Poetry manages virtual environments automatically.
*   **Configuration:** Environment variables are used to manage application configuration (e.g., API endpoint URLs, database connection strings). `.env` files (ignored by Git) are used for local development.

## Testing Strategy

*   **Frontend:**
    *   **Unit Tests:** Jest and React Testing Library for testing individual components and functions.
    *   **Integration Tests:** Testing the interaction between components.
    *   **End-to-End (E2E) Tests (Future):** Cypress or similar tools for testing the entire application flow.
*   **Backend:**
    *   **Unit Tests:** pytest for testing individual functions and classes.
    *   **Integration Tests:** Testing the interaction between different modules.
    *   **API Tests:** Testing API endpoints using pytest and a dedicated testing library (e.g., `requests`).
    *   **Database Tests:** Testing database interactions using mock data or a dedicated test database.
*   **Code Coverage:** Tools like `coverage.py` (Python) and Jest's built-in coverage reports (JavaScript) are used to measure test coverage.
*   **Test-Driven Development (TDD):** Encouraged where applicable.

## Deployment Process

*   **Target Environment:** Initially, the application will be deployed to a local server or a development/staging environment.
*   **Deployment Method:**
    *   **Backend:** Potentially using a cloud platform (e.g., AWS, Google Cloud, Azure) with containerization (Docker). Deployment scripts will automate the process of building, packaging, and deploying the backend application.
    *   **Frontend:** Hosting the static assets on a CDN (Content Delivery Network) or a static website hosting service (e.g., Netlify, Vercel).
*   **Configuration Management:** Environment variables will be used to configure the application in the target environment.
*   **Monitoring:** Basic monitoring will be implemented to track application health and performance. Tools like Prometheus and Grafana may be considered for more advanced monitoring in the future.
*   **Rollback Strategy:** A rollback strategy will be defined to quickly revert to a previous version of the application in case of issues.

## Continuous Integration Approach

*   **CI/CD Pipeline:** GitHub Actions will be used to automate the build, test, and deployment process.
*   **Workflow Triggers:** The CI/CD pipeline will be triggered on code commits to the main branch (and potentially on pull requests).
*   **Pipeline Stages:**
    *   **Build:** Building the frontend and backend applications.
    *   **Test:** Running unit, integration, and API tests.
    *   **Code Analysis:** Performing static code analysis using linters (e.g., ESLint, pylint) and code formatters (e.g., Prettier, black).
    *   **Deployment (Future):** Deploying the application to the target environment (after successful tests and code analysis).
    *   **Notifications:** Notifications will be sent to the team on pipeline failures.

## Task Model Enhancements (Task Statistics)

To provide better insights into task lifecycle and effort, the Task model has been enhanced to include a nested `statistics` object.

### Backend (`backend/app/db/models/task.py`)

A new `EmbeddedModel` named `TaskStatistics` has been introduced:

```python
from datetime import datetime
from typing import Optional
from odmantic import EmbeddedModel

class TaskStatistics(EmbeddedModel):
    was_taken_at: Optional[datetime] = None  # Timestamp of first move to 'in_progress'
    was_started_at: Optional[datetime] = None # Timestamp of most recent move to 'in_progress'
    was_stopped_at: Optional[datetime] = None # Timestamp of most recent move from 'in_progress'
    lasts_min: int = 0  # Total cumulative time in minutes spent in 'in_progress'
```

The main `Task` model now includes:
`statistics: Optional[TaskStatistics] = None`

### API Schemas (`backend/app/api/schemas/task.py`)

A corresponding `TaskStatisticsSchema` (Pydantic BaseModel) is used for API responses:

```python
class TaskStatisticsSchema(BaseModel):
    was_taken_at: Optional[datetime] = None
    was_started_at: Optional[datetime] = None
    was_stopped_at: Optional[datetime] = None
    lasts_min: Optional[int] = 0

    class Config:
        from_attributes = True
```

The `TaskRead` schema now includes `statistics: Optional[TaskStatisticsSchema] = None`.

### Logic

- `was_taken_at`: Set only once, when the task first moves to 'in_progress'.
- `was_started_at`: Updated every time the task moves to 'in_progress'.
- `was_stopped_at`: Updated every time the task moves from 'in_progress'.
- `lasts_min`: Accumulates total time spent in 'in_progress'.
- These fields are managed automatically by backend logic in the `TaskService` during status transitions.

### Frontend (`frontend/src/types/task.ts`)

A `TaskStatistics` interface mirrors the backend schema:

```typescript
export interface TaskStatistics {
  was_taken_at?: string;    // ISO datetime string
  was_started_at?: string;  // ISO datetime string
  was_stopped_at?: string;  // ISO datetime string
  lasts_min?: number;
}
```
The main `Task` interface includes `statistics?: TaskStatistics;`.

## Implemented Feature: Backend Statistics Extension

The backend now includes new user and timer-based statistical metrics. A new `user_daily_stats` collection stores daily aggregated stats per user, including `total_seconds_spent` and `pomodoros_completed`. This is managed by a new `UserDailyStatsService` and exposed through new API endpoints (`GET /today`, `POST /today/increment-time`, `POST /today/increment-pomodoro`).

## Implemented Feature: Add Task Controls to Dashboard

The `TaskCard` component within `frontend/src/components/CurrentTasks.tsx` has been enhanced to include `Start`, `Pause`, and `Delete` buttons. These controls are integrated with `SharedTimerContext` for timer state management and new React Query mutation hooks (`useUpdateTask`, `useDeleteTask`) for server-side task updates and deletions. Conditional rendering ensures buttons are enabled/disabled based on the active task and timer state.

**Key Technical Details:**

*   **`useDeleteTask` Hook:** A new mutation hook in `frontend/src/hooks/useTasks.ts` centralizes task deletion logic, invalidating `['tasks']` and `['dailyPlan', 'today']` queries on success.
*   **`TaskCard` Logic:**
    *   Consumes `currentTaskId` and `isActive` from `useSharedTimerContext`.
    *   `handleStart` calls `resetForNewTask()`, sets context, calls `updateTask` mutation (status `in_progress`), and `setIsActive(true)`.
    *   `handlePause` calls `handleStartPause()` from context.
    *   `handleDelete` shows a confirmation, calls `stopCurrentTask()` if the deleted task is active, then calls `deleteTask` mutation.
*   **API Interaction:** Leverages existing `PATCH /tasks/{id}` and `DELETE /tasks/{id}` endpoints. The delete operation assumes a "soft delete" (setting `is_deleted = true`) to preserve task statistics.

## Implemented Feature: LLM-Powered Task Improvements

The LLM-powered task improvement feature has been refactored. The `LLMService` is now decoupled from the `TaskService`, and a new stateless `POST /tasks/llm/improve-text` endpoint handles text improvement requests. This endpoint takes text and an action, calls the `LLMService`, and returns the improved text without database lookups.

Created on 02.05.2025
Updated on 02.06.2025
Updated on 08.07.2025
