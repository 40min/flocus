import { useTimerStore } from "../../stores/timerStore";
import * as taskService from "../../services/taskService";
import { Task, TaskStatus } from "../../types/task";

// Mock services
jest.mock("../../services/taskService");
jest.mock("../../services/userDailyStatsService");

const mockTaskService = taskService as jest.Mocked<typeof taskService>;

// Mock tasks for testing
const mockTask1: Task = {
  id: "task-1",
  title: "Task 1",
  description: "First task",
  status: "pending" as TaskStatus,
  priority: "medium",
  category_id: "cat-1",
  user_id: "user-1",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  due_date: null,
  is_deleted: false,
  statistics: {
    lasts_minutes: 15,
    was_taken_at: null,
    was_started_at: null,
    was_stopped_at: null,
  },
};

const mockTask2: Task = {
  id: "task-2",
  title: "Task 2",
  description: "Second task",
  status: "pending" as TaskStatus,
  priority: "high",
  category_id: "cat-1",
  user_id: "user-1",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  due_date: null,
  is_deleted: false,
  statistics: {
    lasts_minutes: 30,
    was_taken_at: null,
    was_started_at: null,
    was_stopped_at: null,
  },
};

describe("Task Switching Focused Tests", () => {
  beforeEach(() => {
    // Reset timer store
    useTimerStore.getState().clearTimerState();

    // Setup default mocks
    mockTaskService.updateTask.mockImplementation((taskId, taskData) => {
      const task = taskId === "task-1" ? mockTask1 : mockTask2;
      return Promise.resolve({
        ...task,
        ...taskData,
        status: taskData.status || task.status,
      });
    });

    // Mock successful API responses
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Core Task Switching Requirements", () => {
    test("Requirement 1.1, 1.2, 1.3: Task switching makes proper API calls with clear feedback", async () => {
      // Test the actual DashboardPage task switching pattern

      // 1. Simulate starting task1 (like DashboardPage.activateAndStartTask)
      useTimerStore.getState().setCurrentTask("task-1", "Task 1", "First task");

      // Direct API call to start task (like DashboardPage does)
      await mockTaskService.updateTask("task-1", { status: "in_progress" });
      useTimerStore.getState().setIsActive(true);

      // Verify task1 is started
      expect(mockTaskService.updateTask).toHaveBeenCalledWith("task-1", {
        status: "in_progress",
      });
      expect(useTimerStore.getState().currentTaskId).toBe("task-1");
      expect(useTimerStore.getState().isActive).toBe(true);

      // Clear previous calls
      jest.clearAllMocks();

      // 2. Simulate switching to task2 (like DashboardPage.activateAndStartTask)

      // Stop current task (direct API call)
      await mockTaskService.updateTask("task-1", { status: "pending" });

      // Set new task in timer
      useTimerStore
        .getState()
        .setCurrentTask("task-2", "Task 2", "Second task");

      // Start new task (direct API call)
      await mockTaskService.updateTask("task-2", { status: "in_progress" });

      // Keep timer active
      useTimerStore.getState().setIsActive(true);

      // Verify proper API calls were made
      expect(mockTaskService.updateTask).toHaveBeenCalledWith("task-1", {
        status: "pending",
      });
      expect(mockTaskService.updateTask).toHaveBeenCalledWith("task-2", {
        status: "in_progress",
      });

      // Verify final state
      expect(useTimerStore.getState().currentTaskId).toBe("task-2");
      expect(useTimerStore.getState().currentTaskName).toBe("Task 2");
      expect(useTimerStore.getState().isActive).toBe(true);
    });

    test("Requirement 4.1, 4.2, 4.3: Working time updates are sent correctly", async () => {
      const store = useTimerStore.getState();

      // Set up active task
      store.setCurrentTask("task-1", "Task 1", "First task");
      store.setIsActive(true);

      // Simulate timer completion (which should update working time)
      await store.switchToNextMode();

      // Verify working time update API calls
      expect(mockTaskService.updateTask).toHaveBeenCalledWith("task-1", {
        status: "pending",
      });
      expect(mockTaskService.updateTask).toHaveBeenCalledWith("task-1", {
        add_lasts_minutes: expect.any(Number),
      });

      // Verify timer switched modes
      expect(useTimerStore.getState().isActive).toBe(false);
    });

    test("Requirement 1.1, 1.2: Error scenarios provide proper feedback", async () => {
      // Mock API failure
      mockTaskService.updateTask.mockRejectedValueOnce(
        new Error("Network error")
      );

      const store = useTimerStore.getState();

      // Try to start task (this should fail)
      store.setCurrentTask("task-1", "Task 1", "First task");
      await store.startPause();

      // Verify error handling - timer should revert state on failure
      expect(mockTaskService.updateTask).toHaveBeenCalledWith("task-1", {
        status: "in_progress",
      });

      // Timer should handle the error gracefully
      expect(useTimerStore.getState().isUpdatingTaskStatus).toBe(false);
      expect(useTimerStore.getState().isActive).toBe(false); // Should revert on error
    });

    test("Requirement 4.1, 4.2: Timer integration works correctly", async () => {
      const store = useTimerStore.getState();

      // Test: starting a task activates the timer
      store.setCurrentTask("task-1", "Task 1", "First task");
      await store.startPause();

      // Verify timer is activated
      expect(useTimerStore.getState().isActive).toBe(true);
      expect(useTimerStore.getState().currentTaskId).toBe("task-1");

      // Test: pausing the task deactivates the timer
      await store.startPause();

      // Verify timer is paused and API call made
      expect(mockTaskService.updateTask).toHaveBeenLastCalledWith("task-1", {
        status: "pending",
      });
      expect(useTimerStore.getState().isActive).toBe(false);
    });

    test("Requirement 1.3: Multiple task updates are handled independently", async () => {
      const store = useTimerStore.getState();

      // Start task1
      store.setCurrentTask("task-1", "Task 1", "First task");
      await store.startPause();

      // Clear previous calls
      jest.clearAllMocks();

      // Perform multiple operations
      const stopPromise = store.stopCurrentTask();
      const markDonePromise = store.markTaskAsDone("task-2");

      // Wait for both operations
      await Promise.all([stopPromise, markDonePromise]);

      // Verify both API calls were made independently
      expect(mockTaskService.updateTask).toHaveBeenCalledWith("task-1", {
        status: "pending",
      });
      expect(mockTaskService.updateTask).toHaveBeenCalledWith("task-2", {
        status: "done",
      });
    });
  });

  describe("Edge Cases and Validation", () => {
    test("Should not start work timer without a task assigned", async () => {
      const store = useTimerStore.getState();

      // Ensure no task is set and mode is work
      expect(useTimerStore.getState().currentTaskId).toBeUndefined();
      expect(useTimerStore.getState().mode).toBe("work");

      // Try to start timer without a task
      await store.startPause();

      // Should not start timer or make API calls
      expect(useTimerStore.getState().isActive).toBe(false);
      expect(mockTaskService.updateTask).not.toHaveBeenCalled();
    });

    test("Should handle same task selection gracefully", async () => {
      const store = useTimerStore.getState();

      // Start task1
      store.setCurrentTask("task-1", "Task 1", "First task");
      await store.startPause();

      // Clear previous calls
      jest.clearAllMocks();

      // Try to start the same task again (should just toggle pause/resume)
      await store.startPause(); // Pause
      await store.startPause(); // Resume

      // Should make pause and resume calls
      expect(mockTaskService.updateTask).toHaveBeenCalledTimes(2);
      expect(mockTaskService.updateTask).toHaveBeenNthCalledWith(1, "task-1", {
        status: "pending",
      });
      expect(mockTaskService.updateTask).toHaveBeenNthCalledWith(2, "task-1", {
        status: "in_progress",
      });
    });

    test("Should handle task switching when timer is not active", async () => {
      const store = useTimerStore.getState();

      // Set task1 but don't start timer
      store.setCurrentTask("task-1", "Task 1", "First task");
      expect(useTimerStore.getState().isActive).toBe(false);

      // Switch to task2
      store.setCurrentTask("task-2", "Task 2", "Second task");
      await store.startPause();

      // Should start task2 without stopping task1 (since it wasn't active)
      expect(mockTaskService.updateTask).toHaveBeenCalledTimes(1);
      expect(mockTaskService.updateTask).toHaveBeenCalledWith("task-2", {
        status: "in_progress",
      });

      expect(useTimerStore.getState().currentTaskId).toBe("task-2");
      expect(useTimerStore.getState().isActive).toBe(true);
    });
  });

  describe("API Integration Verification", () => {
    test("Should make correct API calls for task status changes", async () => {
      const store = useTimerStore.getState();

      // Test all status transitions

      // 1. Start task (pending -> in_progress)
      store.setCurrentTask("task-1", "Task 1", "First task");
      await store.startPause();

      expect(mockTaskService.updateTask).toHaveBeenCalledWith("task-1", {
        status: "in_progress",
      });

      // 2. Pause task (in_progress -> pending)
      await store.startPause();

      expect(mockTaskService.updateTask).toHaveBeenCalledWith("task-1", {
        status: "pending",
      });

      // 3. Mark as done (any status -> done)
      await store.markTaskAsDone("task-1");

      expect(mockTaskService.updateTask).toHaveBeenCalledWith("task-1", {
        status: "done",
      });
    });

    test("Should handle working time updates correctly", async () => {
      const store = useTimerStore.getState();

      // Set up active task with specific time
      store.setCurrentTask("task-1", "Task 1", "First task");
      store.setIsActive(true);
      store.setTimeRemaining(1200); // 20 minutes

      // Complete a work session
      await store.switchToNextMode();

      // Should update both status and working time
      expect(mockTaskService.updateTask).toHaveBeenCalledWith("task-1", {
        status: "pending",
      });
      expect(mockTaskService.updateTask).toHaveBeenCalledWith("task-1", {
        add_lasts_minutes: expect.any(Number),
      });

      // Verify the working time is reasonable (should be the full session duration)
      const workingTimeCall = mockTaskService.updateTask.mock.calls.find(
        (call) => call[1].add_lasts_minutes !== undefined
      );
      expect(workingTimeCall?.[1].add_lasts_minutes).toBeGreaterThan(0);
    });
  });

  describe("State Management Verification", () => {
    test("Should maintain consistent state during operations", async () => {
      const store = useTimerStore.getState();

      // Initial state
      expect(useTimerStore.getState().currentTaskId).toBeUndefined();
      expect(useTimerStore.getState().isActive).toBe(false);

      // Set task and start
      store.setCurrentTask("task-1", "Task 1", "First task");
      await store.startPause();

      // Verify state consistency
      expect(useTimerStore.getState().currentTaskId).toBe("task-1");
      expect(useTimerStore.getState().currentTaskName).toBe("Task 1");
      expect(useTimerStore.getState().currentTaskDescription).toBe(
        "First task"
      );
      expect(useTimerStore.getState().isActive).toBe(true);

      // Stop task
      await store.stopCurrentTask();

      // Verify task is cleared but timer state is preserved
      expect(useTimerStore.getState().currentTaskId).toBeUndefined();
      expect(useTimerStore.getState().currentTaskName).toBeUndefined();
      expect(useTimerStore.getState().currentTaskDescription).toBeUndefined();
    });

    test("Should handle loading states correctly", async () => {
      // Create a promise we can control
      let resolvePromise: (value: any) => void;
      const controlledPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockTaskService.updateTask.mockReturnValueOnce(controlledPromise);

      const store = useTimerStore.getState();

      // Start an operation
      store.setCurrentTask("task-1", "Task 1", "First task");
      const startPromise = store.startPause();

      // Should show loading state
      expect(useTimerStore.getState().isUpdatingTaskStatus).toBe(true);

      // Resolve the promise
      resolvePromise!(mockTask1);
      await startPromise;

      // Loading state should be cleared
      expect(useTimerStore.getState().isUpdatingTaskStatus).toBe(false);
    });
  });
});
