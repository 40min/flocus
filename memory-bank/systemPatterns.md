```markdown
## System Patterns (systemPatterns.md)

# Technical Architecture

-   **System Components:**
    -   Frontend (React, TypeScript, Tailwind): Handles user interface and interactions.
    -   Backend (Python/FastAPI): Manages data, API endpoints, and business logic.
    -   Database (MongoDB): Stores user data, templates, tasks, and time tracking information.
-   **Data Models:**
    -   User: Stores user preferences, templates, and historical data.
    -   Template: Defines the structure of a day with categorized time windows.
    -   Task: Represents a task with category, description, and time estimate.
    -   TimeLog: Records time tracking information for each day.
-   **APIs and Integrations:**
    -   REST API for communication between frontend and backend.
-   **Infrastructure Requirements:**
    -   macOS environment for local application use.
    -   MongoDB instance for data storage.

### 1. Architectural Design: Layered Decoupled Architecture

The application follows a layered, decoupled architecture, separating the frontend (client-side) and backend (server-side) components. This promotes modularity, maintainability, and scalability.

*   **Frontend (Presentation Layer):** Built with React, TypeScript, and Tailwind CSS. Responsible for user interface, user interaction, and data presentation. Communicates with the backend via REST API calls.
*   **Backend (Application/Business Logic Layer):** Built with Python and FastAPI. Responsible for handling business logic, data validation, authentication, and authorization. Exposes REST API endpoints for the frontend to consume.
*   **Data Layer:** MongoDB is used as the database. Handles data persistence and retrieval.

This architecture allows for independent scaling of the frontend and backend, as well as easier replacement or modification of individual components without affecting the entire system.

### 2. Data Models

The following data models represent the key entities in the application and are stored in MongoDB:

*   **User:**
    *   `_id` (ObjectId): Unique identifier for the user.
    *   `username` (String): User's username.
    *   `password` (String): Hashed password.
    *   `email` (String): User's email address.
    *   `created_at` (Date): Timestamp of user creation.
    *   `updated_at` (Date): Timestamp of last update.

*   **Task:**
    *   `_id` (ObjectId): Unique identifier for the task.
    *   `user_id` (ObjectId): Foreign key referencing the User collection. Indicates the owner of the task.
    *   `title` (String): Task title.
    *   `description` (String): Task description.
    *   `start_time` (Date): Task start time.
    *   `end_time` (Date): Task end time.
    *   `priority` (String): Task priority (e.g., "High", "Medium", "Low").
    *   `status` (String): Task status (e.g., "Todo", "In Progress", "Completed", "Blocked").
    *   `created_at` (Date): Timestamp of task creation.
    *   `updated_at` (Date): Timestamp of last update.

*   **Category:**
    *   `_id` (ObjectId): Unique identifier for the category.
    *   `user_id` (ObjectId): Foreign key referencing the User collection.
    *   `name` (String): Category name.
    *   `description` (String, optional): Category description.
    *   `color` (String, optional): Color associated with the category (e.g., "#FF0000").
    *   `created_at` (Date): Timestamp of category creation.
    *   `updated_at` (Date): Timestamp of last update.

    *Tasks can optionally be associated with a Category.*

### 3. API Definitions (REST API)

The backend exposes a REST API with the following endpoints:

*   **Authentication:**
    *   `POST /auth/register`: Registers a new user.
    *   `POST /auth/login`: Logs in an existing user.
    *   `POST /auth/logout`: Logs out the current user.

*   **Users:**
    *   `GET /users/me`: Retrieves information about the currently logged-in user.
    *   `PUT /users/me`: Updates information about the currently logged-in user.

*   **Tasks:**
    *   `GET /tasks`: Retrieves all tasks for the currently logged-in user.
    *   `GET /tasks/{task_id}`: Retrieves a specific task by ID.
    *   `POST /tasks`: Creates a new task.
    *   `PUT /tasks/{task_id}`: Updates an existing task.
    *   `DELETE /tasks/{task_id}`: Deletes a task.

*   **Categories:**
    *   `GET /categories`: Retrieves all categories for the currently logged-in user.
    *   `GET /categories/{category_id}`: Retrieves a specific category by ID.
    *   `POST /categories`: Creates a new category.
    *   `PUT /categories/{category_id}`: Updates an existing category.
    *   `DELETE /categories/{category_id}`: Deletes a category.

Each endpoint will typically return JSON data.  Error responses will follow standard HTTP status codes.  Authentication will be handled using JWT (JSON Web Tokens).

### 4. Component Structure

*   **Frontend (React):**
    *   `src/components`: Reusable UI components (e.g., TaskList, TaskForm, CategoryList, CategoryForm, Login Form, Register Form, DatePicker).
    *   `src/pages`: Application pages (e.g., Dashboard, Task Management, Category Management, Login, Register).
    *   `src/services`: API client for interacting with the backend (e.g., `taskService.ts`, `categoryService.ts`, `authService.ts`).
    *   `src/context`: State management using React Context (e.g., User Context for authentication).
    *   `src/App.tsx`: Main application component.
    *   `src/index.tsx`: Entry point for the React application.

*   **Backend (FastAPI):**
    *   `app/main.py`: Main application file, defining API routes and middleware.
    *   `app/routers`: Modules containing API route definitions (e.g., `auth.py`, `tasks.py`, `categories.py`, `users.py`).
    *   `app/models`: Data models (Pydantic models) representing the entities (e.g., `user.py`, `task.py`, `category.py`).
    *   `app/database.py`: Database connection and configuration.
    *   `app/services`: Business logic and data access layer (e.g., `task_service.py`, `category_service.py`).
    *   `app/security.py`: Authentication and authorization logic.

### 5. Integration Points

*   **Frontend <-> Backend:** REST API calls using `fetch` or a library like `axios`.  Data is exchanged in JSON format.
*   **Backend <-> MongoDB:**  Using a Python MongoDB driver (e.g., `pymongo`).
*   **Authentication:** JWT (JSON Web Tokens) are used for authentication.  The frontend stores the JWT after successful login and sends it in the `Authorization` header of subsequent API requests. The backend verifies the JWT before processing requests.

### 6. Scalability Strategy

The application is designed for horizontal scalability.

*   **Frontend:** The frontend can be easily scaled by deploying multiple instances behind a load balancer.  Since the frontend is stateless, no special considerations are needed for session management.
*   **Backend:** The backend can be scaled by deploying multiple instances behind a load balancer.
    *   **Statelessness:** The backend is designed to be as stateless as possible. User sessions are managed using JWTs, which are stored client-side.
    *   **Database:** MongoDB can be scaled horizontally using sharding.  Read replicas can be used to improve read performance.
    *   **Caching:** Implement caching (e.g., using Redis) to reduce database load for frequently accessed data.
*   **Deployment:** Use containerization (e.g., Docker) and orchestration (e.g., Kubernetes) to automate deployment and scaling.

Created on 02.05.2025
```