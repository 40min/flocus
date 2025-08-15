Of course. Here is the complete and final specification document for the Pomodoro Timer application, incorporating all discussed features, states, and user interactions.

---

## **Pomodoro Timer Application: Complete Logic and Behavior Specification**

### 1. Overview

This document outlines the complete operational logic for a Pomodoro timer application featuring an integrated task list. It describes the user interface components, defines the application's core states, and provides an exhaustive, state-driven analysis of every possible user interaction and system event. The primary features include a standard Pomodoro timer with work/break cycles, a task list where tasks can be assigned to the timer, and a "Quick Switch" functionality allowing users to seamlessly change focus between tasks.

---

### 2. UI Components and Controls

The application interface consists of two main panels: the **Timer Panel** and the **Task List Panel**.

#### 2.1 Timer Panel

This panel is the central hub for controlling focus sessions. It serves as both a display and a control center.

- **Task Display Area / Drop Zone:** A prominent area that displays the title and description of the currently assigned task.
  - When no task is assigned, it shows a call-to-action message (e.g., _"Drag a task here or click its start button to begin"_).
  - This area functions as a **drop zone** for task items.
- **Mode Indicator:** A text label indicating the timer's current status: _"in progress"_, _"paused"_, _"short break"_, or _"long break"_. This is hidden when the timer is idle.
- **Timer Countdown:** A large display showing the time remaining in the current session (e.g., `25:00`).
- **Pomodoro Counter:** A visual counter displaying the total number of Pomodoros completed by the user.
- **Controls:**
  - **`Start / Pause` Button:** A contextual button to start a paused timer or pause a ticking one. Active only when a task is assigned.
  - **`Reset` Button:** Unassigns the current task, stops the timer, and returns it to the idle state. Active only when a task is assigned.
  - **`Skip Break` Button:** Immediately ends a break session. Active only during a break.

#### 2.2 Task List Panel

This panel displays all actionable user-created tasks.

- **Task Item:** Each task in the list is a self-contained component that is **draggable**. It displays:
  - Task Information: Title and a short description.
  - Controls:
    - **`Start` Button:** Assigns the task to the timer. Triggers a "Quick Switch" if another task is already active.
    - **`Finish` Button:** Marks the task as complete, removing it from the list.
    - **`Delete` Button:** Deletes the task, removing it from the list.

---

### 3. Core Concepts & State Management

#### 3.1 Task States (Backend Status)

- `new`: A newly created task.
- `pending`: A task that was `in_progress` but is now paused or has been unassigned from the timer.
- `in_progress`: The task is assigned to the timer, and the work timer is actively counting down.
- `done`: The task has been marked as complete by the user and is removed from the UI.
- `deleted`: The task has been deleted by the user and is removed from the UI.

#### 3.2 Timer States

The application's logic is governed by four primary timer states:

1.  **`IDLE`**: The default state. No task is assigned, and the timer is inactive.
2.  **`WORK_TICKING`**: A task is assigned, and the work timer is counting down.
3.  **`WORK_PAUSED`**: A task is assigned, but the work timer has been manually paused.
4.  **`BREAK_TICKING`**: A work session has been completed, and the break timer is running.

#### 3.3 Key Principles

- **Single Point of Control:** The main timer panel's buttons (`Start/Pause`, `Reset`) exclusively manage the timer's countdown state.
- **Quick Switch:** Users can switch tasks at any time by clicking `start` on another task or by dragging it onto the timer. This automatically sets the previous task to `pending`.
- **Pomodoro Break Cycle:** The application tracks completed work cycles in a session to alternate between short breaks and long breaks (e.g., a long break after 3 or 4 short breaks).

---

### 4. Detailed Interaction Logic (State-Driven Analysis)

#### State 1: `IDLE`

| Event / User Action                                                         | System Response                                                                                                                                 | New State      |
| :-------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- | :------------- |
| **Click `start` on "Task A"**<br>--- OR ---<br>**Drop "Task A" onto Timer** | 1. Assign "Task A" to the timer.<br>2. Start the work timer from its full duration.<br>3. Send `status: 'in_progress'` to backend for "Task A". | `WORK_TICKING` |
| **Click `finish` on "Task A"**                                              | 1. Send `status: 'done'` to backend for "Task A".<br>2. Remove "Task A" from the task list.                                                     | `IDLE`         |
| **Click `delete` on "Task A"**                                              | 1. Send `delete` request to backend for "Task A".<br>2. Remove "Task A" from the task list.                                                     | `IDLE`         |

#### State 2: `WORK_TICKING` (Active task is "Task A")

| Event / User Action                                                                            | System Response                                                                                                                                                                                                | New State       |
| :--------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------- |
| **(System Event) Work timer reaches 00:00**                                                    | 1. Play alert.<br>2. Increment Pomodoro counters.<br>3. Send `increment_pomo_count` to backend.<br>4. Start the appropriate (short/long) break timer.<br>5. Send `status: 'pending'` to backend for "Task A".> | `BREAK_TICKING` |
| **Click timer `start/pause` (Pause) button**                                                   | 1. Stop the timer.<br>2. Send `status: 'pending'` to backend for "Task A".                                                                                                                                     | `WORK_PAUSED`   |
| **Click timer `reset` button**                                                                 | 1. Stop timer & unassign "Task A".<br>2. Send `status: 'pending'` to backend.<br>3. Return timer to initial state.                                                                                             | `IDLE`          |
| **Click `finish` on active task ("Task A")**                                                   | 1. Stop timer & unassign.<br>2. Send `status: 'done'` to backend.<br>3. Remove "Task A" from the list.                                                                                                         | `IDLE`          |
| **Click `delete` on active task ("Task A")**                                                   | 1. Show confirmation modal.<br>2. **On confirm:** Stop timer, unassign, send `delete`, remove task.                                                                                                            | `IDLE`          |
| **Click `start` on a different task ("Task B")**<br>--- OR ---<br>**Drop "Task B" onto Timer** | 1. **(Quick Switch)** Stop timer.<br>2. Send `status: 'pending'` for "Task A".<br>3. Assign "Task B".<br>4. Reset and start a new work timer.<br>5. Send `status: 'in_progress'` for "Task B".                 | `WORK_TICKING`  |
| **Click `finish` or `delete` on a different task ("Task B")**                                  | 1. Perform the finish/delete action for "Task B".<br>2. The timer for "Task A" is unaffected and continues ticking.                                                                                            | `WORK_TICKING`  |
| **Drop the _active_ task ("Task A") onto Timer**                                               | **No action.** The event is ignored.                                                                                                                                                                           | `WORK_TICKING`  |

#### State 3: `WORK_PAUSED` (Active task is "Task A")

| Event / User Action                                                         | System Response                                                                            | New State      |
| :-------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------- | :------------- |
| **Click timer `start/pause` (Start) button**                                | 1. Resume the timer countdown.<br>2. Send `status: 'in_progress'` to backend for "Task A". | `WORK_TICKING` |
| **Click timer `reset`, or `finish`/`delete` on "Task A"**                   | (Same as in `WORK_TICKING` state)                                                          | `IDLE`         |
| **Click `start` on "Task B"**<br>--- OR ---<br>**Drop "Task B" onto Timer** | **(Quick Switch)** Same logic as in the `WORK_TICKING` state.                              | `WORK_TICKING` |
| **Drop the _active_ task ("Task A") onto Timer**                            | **No action.** The event is ignored.                                                       | `WORK_PAUSED`  |

#### State 4: `BREAK_TICKING` (Associated task is "Task A")

| Event / User Action                                                         | System Response                                                                                                                          | New State       |
| :-------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- | :-------------- |
| **(System Event) Break timer reaches 00:00**                                | 1. Play alert.<br>2. Reset the timer to the full work duration, but paused.                                                              | `WORK_PAUSED`   |
| **Click timer `skip break` button**                                         | 1. Stop the break timer.<br>2. Reset timer to full work duration, paused.                                                                | `WORK_PAUSED`   |
| **Click timer `reset` button**                                              | 1. Stop timer & unassign "Task A".<br>2. Send `status: 'pending'` to backend.                                                            | `IDLE`          |
| **Click `finish` or `delete` on associated task ("Task A")**                | 1. Stop timer & unassign.<br>2. Perform finish/delete action.                                                                            | `IDLE`          |
| **Click `start` on "Task B"**<br>--- OR ---<br>**Drop "Task B" onto Timer** | 1. **(Quick Switch)** Cancel the break.<br>2. Send `status: 'pending'` for "Task A".<br>3. Assign "Task B" and start a fresh work timer. | `WORK_TICKING`  |
| **Drop the _associated_ task ("Task A") onto Timer**                        | **No action.** The event is ignored.                                                                                                     | `BREAK_TICKING` |

---

### 5. UI Element Behavior Summary (Quick Reference)

#### Scenario A: Timer is `IDLE`

| Element                       | Behavior                                                                        |
| :---------------------------- | :------------------------------------------------------------------------------ |
| **For ANY Task in the list:** | `start`, `finish`, `delete` buttons are **Active**. Task item is **Draggable**. |
| **Timer Panel:**              | All buttons (`Start/Pause`, `Reset`, `Skip Break`) are **Inactive**.            |

#### Scenario B: Timer is `ACTIVE` (Task "A" is assigned)

| Element                                      | Behavior                                                     |
| :------------------------------------------- | :----------------------------------------------------------- |
| **For the Active Task ("Task A"):**          |                                                              |
| `start` button                               | **Inactive**                                                 |
| `finish` button                              | **Active**                                                   |
| `delete` button                              | **Active**                                                   |
| **For ANY OTHER Task ("Task B", "Task C"):** |                                                              |
| `start` button                               | **Active** (Triggers "Quick Switch")                         |
| `finish` button                              | **Active**                                                   |
| `delete` button                              | **Active**                                                   |
| Task item                                    | **Draggable** (Dropping on timer triggers "Quick Switch")    |
| **Timer Panel:**                             |                                                              |
| `start/pause` button                         | **Active**                                                   |
| `reset` button                               | **Active**                                                   |
| `skip break` button                          | **Active only if** the timer is in the `BREAK_TICKING` state |
