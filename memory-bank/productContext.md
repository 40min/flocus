# productContext.md

## Product Context: Personal Scheduler for Software Engineers

# User Experience

-   **User Personas:** Software engineers who want to optimize their workday and track their time effectively.
-   **Key User Flows:**
    -   Creating a custom day template with categorized time windows.
    -   Adjusting time intervals for each category.
    -   Adding new tasks to the categorized heap.
    -   Planning the working day based on the template and available tasks.
    -   Tracking time and managing distractions.
    -   Reviewing daily progress and self-reflection.
-   **UI/UX Considerations:**
    -   Intuitive GUI for macOS.
    -   Clear visualization of time windows and tasks.
    -   Easy-to-use Pomodoro timer.
    -   Self-reflection prompts to encourage mindful work habits.

## Implemented Features

*   **Assign Tasks:** Allows assigning tasks to time windows.
*   **Task Dashboard:** A new dashboard page with a Pomodoro timer.
*   **Timescale:** A visual timeline on the "My Day" page.
*   **Backup DB:** A script to back up the database.
*   **Clickable links in task description:** Renders markdown links in task descriptions.
*   **Day time windows editing:** Allows editing time windows on the "My Day" page.
*   **Modal for categories:** Converts the categories page to use a modal form.
*   **Show description on Pomodoro:** Shows the task description on the Pomodoro timer.
*   **Task interruptions:** Centralizes task interruption logic.
*   **Yesterday's tasks:** Allows viewing and carrying over yesterday's tasks.
*   **Add tasks controls:** Adds controls to the task cards on the dashboard.

## Feature: Task Statistics

To enhance task tracking and provide users with more insights into their workflow, tasks now include detailed statistics. These statistics are automatically calculated and updated by the system.

**New Statistical Fields:**

Within a new `statistics` object for each task, the following information is available:

*   **Time Taken (`was_taken_at`):** Records the timestamp when a task is first actively started (moved to an "in progress" or "doing" state). This helps understand when work on a task truly commenced.
*   **Last Started (`was_started_at`):** Shows the most recent timestamp when the task's status was set to "in progress" or "doing".
*   **Last Stopped (`was_stopped_at`):** Shows the most recent timestamp when the task's status was moved from "in progress" or "doing" to another state (e.g., pending, done).
*   **Total Active Time (`lasts_min`):** Displays the total cumulative time, in minutes, that the task has spent in an "in progress" or "doing" state. This accounts for multiple start/stop cycles.

**User Benefits:**

*   Better visibility into how long tasks actually take.
*   Improved understanding of work patterns and potential bottlenecks.
*   Data for future analysis and reporting on task effort and lifecycle.

These statistics will be made available in the user interface for individual tasks and can be leveraged for future analytics features.

## Feature: Daily User Statistics

This feature implements new user and timer-based statistical metrics, including total time a user is active on the platform each day and completed Pomodoro work sessions per day. This data is stored in a new `user_daily_stats` collection and exposed via dedicated API endpoints.

**User Benefits:**

*   Comprehensive overview of daily productivity.
*   Tracking of Pomodoro session completion for focus and time management.
*   Foundation for future advanced analytics and reporting on user activity.

## Feature: Add Task Controls to Dashboard

This feature adds interactive controls (Start, Pause, Delete) directly to task cards on the Dashboard page. Users can now manage task states directly from the task list, improving workflow efficiency. The implementation leverages existing `SharedTimerContext` and new React Query mutation hooks for updating and deleting tasks, ensuring reactive UI updates and proper server-side state management.

**User Benefits:**

*   Direct task management from the dashboard, reducing clicks and context switching.
*   Improved workflow efficiency by allowing immediate control over task states.
*   Consistent and reliable state synchronization between UI, timer context, and backend.

## Feature: LLM-Powered Task Improvements

The LLM-powered task improvement feature has been refactored to be decoupled from the `TaskService` and now uses a stateless backend endpoint. The UI for this feature is integrated directly into the task editing modal, providing an inline approval flow for suggested improvements to task titles and descriptions.

**User Benefits:**

*   Streamlined workflow for improving task details with AI suggestions.
*   Direct integration within the editing context, reducing context switching.
*   Flexible and reusable API for generic text improvement.

## 1. Market Analysis

The market for productivity tools and time management applications is substantial and growing. Software engineers, in particular, face unique challenges in managing their time due to the nature of their work, which often involves complex tasks, frequent interruptions, and the need for deep focus.

**Market Size and Growth:** The overall productivity software market is estimated to be worth billions of dollars annually, with a consistent growth rate fueled by the increasing demand for efficient work practices. A significant portion of this market is driven by individual users seeking tools to improve their personal productivity.

**Target Audience:** The primary target audience for this application is software engineers, ranging from junior developers to senior architects, working in various industries. This includes both individuals working in large corporations and those employed by smaller companies or as freelancers.

**Market Trends:** Key trends in the market include:

*   **Personalization:** Users are increasingly demanding tools that can be customized to their specific needs and preferences.
*   **Integration:** Seamless integration with other tools and platforms, such as calendars, communication platforms (Slack, email), and task management systems (Jira, Asana), is highly valued.
*   **AI-powered features:** Features like smart scheduling, task prioritization, and automated time tracking are gaining traction.
*   **Focus on well-being:** Tools that promote work-life balance and reduce burnout are becoming increasingly popular.

**Opportunities:** The market presents a significant opportunity for a well-designed and user-friendly personal scheduler that addresses the specific needs of software engineers. Key opportunities include:

*   Developing features tailored to the software development workflow.
*   Providing advanced task management and prioritization capabilities.
*   Integrating with popular development tools and platforms.
*   Focusing on ease of use and a clean, intuitive interface.

## 2. Competitive Landscape

The competitive landscape for personal scheduling and time management applications is crowded, with numerous established players and emerging startups. Key competitors include:

*   **General-purpose productivity tools:** Google Calendar, Microsoft Outlook Calendar, Todoist, Any.do, TickTick
*   **Project management tools:** Jira, Asana, Trello
*   **Time tracking tools:** Toggl Track, Clockify
*   **Specialized developer tools:** Some IDE extensions offer basic scheduling or task management features.

**Competitive Advantages:** To differentiate this application from existing solutions, the following competitive advantages will be emphasized:

*   **Focus on Software Engineers:** Tailoring the application's features and workflows specifically to the needs of software engineers.
*   **Integration with Development Tools:** Providing seamless integration with popular IDEs, version control systems, and other development tools.
*   **Advanced Task Prioritization:** Implementing sophisticated task prioritization algorithms that take into account factors such as deadlines, dependencies, and estimated effort.
*   **Customizable Workflows:** Allowing users to define their own workflows and customize the application to their specific preferences.
*   **Local-First Design:** Running locally on macOS offers performance benefits and data privacy, appealing to engineers concerned about cloud-based solutions.

## 3. User Stories

The following user stories represent the needs and desires of the target audience:

*   As a software engineer, I want to be able to easily schedule tasks and appointments so that I can effectively manage my time.
*   As a software engineer, I want to be able to prioritize my tasks based on deadlines and importance so that I can focus on the most critical work.
*   As a software engineer, I want to be able to track my time spent on different tasks so that I can identify areas where I am spending too much or too little time.
*   As a software engineer, I want to be able to integrate the scheduler with my IDE and other development tools so that I can streamline my workflow.
*   As a software engineer, I want to be able to customize the scheduler to my specific needs and preferences so that it fits seamlessly into my workflow.
*   As a software engineer, I want to receive reminders for upcoming tasks and appointments so that I don't miss important deadlines.
*   As a software engineer, I want to be able to easily reschedule tasks and appointments when my plans change so that I can adapt to unexpected situations.

## 4. Requirements

The application must meet the following requirements:

**Functional Requirements:**

*   **Task Scheduling:** Allow users to create, edit, and delete tasks with associated deadlines, priorities, and descriptions.
*   **Appointment Scheduling (Optional):** Allow users to create, edit, and delete appointments with associated times, locations, and attendees.
*   **Task Prioritization:** Implement a task prioritization system based on deadlines, importance, and dependencies.
*   **Time Tracking:** Allow users to track the time spent on different tasks and appointments.
*   **Reminders:** Send reminders for upcoming tasks and appointments.
*   **Integration with IDE (Future):** Provide integration with popular IDEs such as VS Code and IntelliJ IDEA.
*   **Integration with Version Control (Future):** Integrate with version control systems like Git for task association with code changes.
*   **REST API:** Provide a REST API for communication between the frontend and backend.
*   **Authentication:** Secure user authentication.

**Non-Functional Requirements:**

*   **Performance:** The application must be responsive and performant.
*   **Usability:** The application must be easy to use and navigate.
*   **Reliability:** The application must be reliable and stable.
*   **Security:** The application must be secure and protect user data.
*   **Scalability (Future):** The application should be designed to be scalable to support a growing number of users and features.
*   **Maintainability:** The codebase should be well-organized and easy to maintain.
*   **Local First:** The application should primarily function locally on the user's machine.

## 5. Workflows

The following workflows illustrate how users will interact with the application:

*   **Adding a Task:**
    1.  User opens the application.
    2.  User clicks the "Add Task" button.
    3.  User enters the task name, description, deadline, and priority.
    4.  User clicks the "Save" button.
    5.  The task is added to heap of tasks to be planned.

## 6. Product Roadmap

The product roadmap outlines the planned development and release schedule for the application:

**Phase 1: MVP (Minimum Viable Product)**

*   Core task scheduling functionality (create, edit, delete, prioritize).
*   Local storage (MongoDB).
*   REST API (FastAPI backend).
*   React/TypeScript/Tailwind frontend.
*   Basic authentication.

**Phase 2: Enhanced Functionality**

*   Time tracking functionality.
*   Reminders.
*   Improved UI/UX.

**Phase 3: Integrations and Advanced Features**

*   IDE integration (VS Code, IntelliJ IDEA).
*   Version control integration (Git).
*   Advanced task prioritization algorithms.
*   Customizable workflows.

**Phase 4: Scalability and Team Features (Future)**

*   Cloud deployment (optional).
*   Analytics and reporting.

Created on 02.05.2025
Updated on 02.06.2025
