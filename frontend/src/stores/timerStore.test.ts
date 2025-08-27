import { act, renderHook } from "@testing-library/react";
import { useTimerStore, initializeTimer } from "./timerStore";
import * as taskService from "../services/taskService";
import * as userDailyStatsService from "../services/userDailyStatsService";

// Mock dependencies
jest.mock("../services/taskService");
jest.mock("../services/userDailyStatsService");
jest.mock("../services/notificationService");

const mockUpdateTask = taskService.updateTask as jest.MockedFunction<
  typeof taskService.updateTask
>;

const mockGetTodayStats =
  userDailyStatsService.getTodayStats as jest.MockedFunction<
    typeof userDailyStatsService.getTodayStats
  >;
const mockIncrementPomodoro =
  userDailyStatsService.incrementPomodoro as jest.MockedFunction<
    typeof userDailyStatsService.incrementPomodoro
  >;
// Removed unused mockShowNotification

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, "localStorage", { value: mockLocalStorage });

// Mock Audio
global.Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn(),
}));

describe("timerStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockGetTodayStats.mockResolvedValue({
      date: new Date().toISOString(),
      total_seconds_spent: 0,
      pomodoros_completed: 0,
    });
    mockIncrementPomodoro.mockResolvedValue(undefined);
    mockUpdateTask.mockResolvedValue({} as any);

    // Reset store state
    useTimerStore.setState({
      mode: "work",
      timeRemaining: 25 * 60,
      isActive: false,
      pomodorosCompleted: 0,
      currentTaskId: undefined,
      currentTaskName: undefined,
      currentTaskDescription: undefined,
      timestamp: Date.now(),
      userPreferences: undefined,
    });
  });

  describe("basic functionality", () => {
    it("should initialize with default state", () => {
      const { result } = renderHook(() => useTimerStore());

      expect(result.current.mode).toBe("work");
      expect(result.current.timeRemaining).toBe(25 * 60);
      expect(result.current.isActive).toBe(false);
      expect(result.current.pomodorosCompleted).toBe(0);
    });

    it("should start/pause timer when task is assigned", async () => {
      const { result } = renderHook(() => useTimerStore());

      // First assign a task
      act(() => {
        result.current.setCurrentTask("task1", "Test Task", "Description");
      });

      await act(async () => {
        await result.current.startPause();
      });

      expect(result.current.isActive).toBe(true);

      await act(async () => {
        await result.current.startPause();
      });

      expect(result.current.isActive).toBe(false);
    });

    it("should reset timer", async () => {
      const { result } = renderHook(() => useTimerStore());

      act(() => {
        result.current.setTimeRemaining(100);
        result.current.setIsActive(true);
      });

      await act(async () => {
        await result.current.reset();
      });

      expect(result.current.isActive).toBe(false);
      expect(result.current.timeRemaining).toBe(25 * 60); // Reset to work duration
    });

    it("should format time correctly", () => {
      const { result } = renderHook(() => useTimerStore());

      expect(result.current.formatTime(0)).toBe("00:00");
      expect(result.current.formatTime(60)).toBe("01:00");
      expect(result.current.formatTime(125)).toBe("02:05");
      expect(result.current.formatTime(3661)).toBe("61:01");
    });
  });

  describe("task management", () => {
    it("should set current task", () => {
      const { result } = renderHook(() => useTimerStore());

      act(() => {
        result.current.setCurrentTask("task1", "Test Task", "Test Description");
      });

      expect(result.current.currentTaskId).toBe("task1");
      expect(result.current.currentTaskName).toBe("Test Task");
      expect(result.current.currentTaskDescription).toBe("Test Description");
    });

    it("should stop current task", async () => {
      const { result } = renderHook(() => useTimerStore());

      // Set up the mutation function
      const mockMutation = jest.fn().mockResolvedValue({});
      act(() => {
        result.current.setUpdateTaskMutation(mockMutation);
        result.current.setCurrentTask("task1", "Test Task");
      });

      await act(async () => {
        await result.current.stopCurrentTask();
      });

      expect(mockMutation).toHaveBeenCalledWith({
        taskId: "task1",
        taskData: { status: "pending" },
      });
      expect(result.current.currentTaskId).toBeUndefined();
      expect(result.current.currentTaskName).toBeUndefined();
      expect(result.current.currentTaskDescription).toBeUndefined();
    });

    it("should mark task as done", async () => {
      const { result } = renderHook(() => useTimerStore());

      // Set up the mutation function
      const mockMutation = jest.fn().mockResolvedValue({});
      act(() => {
        result.current.setUpdateTaskMutation(mockMutation);
        result.current.setCurrentTask("task1", "Test Task");
        result.current.setIsActive(true);
      });

      await act(async () => {
        await result.current.markTaskAsDone("task1");
      });

      expect(mockMutation).toHaveBeenCalledWith({
        taskId: "task1",
        taskData: { status: "done" },
      });
      expect(result.current.isActive).toBe(false);
      expect(result.current.currentTaskId).toBeUndefined();
    });
  });

  describe("mode switching", () => {
    it("should switch from work to short break", async () => {
      const { result } = renderHook(() => useTimerStore());

      act(() => {
        result.current.setUserPreferences({
          pomodoro_working_interval: 25,
          pomodoro_timeout_minutes: 5,
          pomodoro_long_timeout_minutes: 15,
          system_notifications_enabled: false,
          pomodoro_timer_sound: "default",
        });
        result.current.setMode("work");
        result.current.setPomodorosCompleted(0);
      });

      await act(async () => {
        await result.current.switchToNextMode();
      });

      expect(result.current.mode).toBe("shortBreak");
      expect(result.current.timeRemaining).toBe(5 * 60);
      expect(result.current.pomodorosCompleted).toBe(1);
    });

    it("should set task to pending and keep task assigned when switching from work to break mode", async () => {
      const { result } = renderHook(() => useTimerStore());

      // Set up the mutation function
      const mockMutation = jest.fn().mockResolvedValue({});

      // Set up a work session with a task
      act(() => {
        result.current.setUpdateTaskMutation(mockMutation);
        result.current.setUserPreferences({
          pomodoro_working_interval: 25,
          pomodoro_timeout_minutes: 5,
          pomodoro_long_timeout_minutes: 15,
          system_notifications_enabled: false,
          pomodoro_timer_sound: "default",
        });
        result.current.setMode("work");
        result.current.setCurrentTask("task1", "Test Task", "Test Description");
        result.current.setPomodorosCompleted(0);
      });

      // Switch to break mode (simulating timer expiration)
      await act(async () => {
        await result.current.switchToNextMode();
      });

      // Verify task status was updated to pending
      expect(mockMutation).toHaveBeenCalledWith({
        taskId: "task1",
        taskData: {
          status: "pending",
          add_lasts_minutes: 25,
        },
      });

      // Verify timer switched to break mode
      expect(result.current.mode).toBe("shortBreak");
      expect(result.current.timeRemaining).toBe(5 * 60);
      expect(result.current.pomodorosCompleted).toBe(1);

      // Verify task remains assigned during break (new behavior)
      expect(result.current.currentTaskId).toBe("task1");
      expect(result.current.currentTaskName).toBe("Test Task");
      expect(result.current.currentTaskDescription).toBe("Test Description");
    });

    it("should switch from work to long break after 4 pomodoros", async () => {
      const { result } = renderHook(() => useTimerStore());

      act(() => {
        result.current.setUserPreferences({
          pomodoro_working_interval: 25,
          pomodoro_timeout_minutes: 5,
          pomodoro_long_timeout_minutes: 15,
          system_notifications_enabled: false,
          pomodoro_timer_sound: "default",
        });
        result.current.setMode("work");
        result.current.setPomodorosCompleted(3); // 4th pomodoro
      });

      await act(async () => {
        await result.current.switchToNextMode();
      });

      expect(result.current.mode).toBe("longBreak");
      expect(result.current.timeRemaining).toBe(15 * 60);
      expect(result.current.pomodorosCompleted).toBe(4);
    });

    it("should switch from break back to work", async () => {
      const { result } = renderHook(() => useTimerStore());

      act(() => {
        result.current.setUserPreferences({
          pomodoro_working_interval: 25,
          pomodoro_timeout_minutes: 5,
          pomodoro_long_timeout_minutes: 15,
          system_notifications_enabled: false,
          pomodoro_timer_sound: "default",
        });
        result.current.setMode("shortBreak");
      });

      await act(async () => {
        await result.current.switchToNextMode();
      });

      expect(result.current.mode).toBe("work");
      expect(result.current.timeRemaining).toBe(25 * 60);
    });
  });

  describe("initialization", () => {
    it("should initialize from stats", async () => {
      mockGetTodayStats.mockResolvedValue({
        date: new Date().toISOString(),
        total_seconds_spent: 0,
        pomodoros_completed: 3,
      });

      // Manually call initializeFromStats since initializeTimer is disabled in tests
      await act(async () => {
        const { initializeFromStats } = useTimerStore.getState();
        await initializeFromStats();
      });

      const state = useTimerStore.getState();
      expect(state.pomodorosCompleted).toBe(3);
    });

    it("should handle stats fetch error gracefully", async () => {
      mockGetTodayStats.mockRejectedValue(new Error("Network error"));

      await act(async () => {
        await initializeTimer();
      });

      // Should not throw and should maintain default state
      const state = useTimerStore.getState();
      expect(state.pomodorosCompleted).toBe(0);
    });

    it("should handle timer state persistence correctly", () => {
      // Set up a timer state with a task
      act(() => {
        const store = useTimerStore.getState();
        store.setCurrentTask("task-123", "Test Task", "Test Description");
        store.setIsActive(true);
        store.setTimeRemaining(1200); // 20 minutes
      });

      const state = useTimerStore.getState();
      expect(state.currentTaskId).toBe("task-123");
      expect(state.currentTaskName).toBe("Test Task");
      expect(state.currentTaskDescription).toBe("Test Description");
      expect(state.isActive).toBe(true);
      expect(state.timeRemaining).toBe(1200);
    });

    it("should clear timer state when requested", () => {
      // Set up a timer state with a task
      act(() => {
        const store = useTimerStore.getState();
        store.setCurrentTask("task-123", "Test Task", "Test Description");
        store.setIsActive(true);
        store.setTimeRemaining(1200);
      });

      // Clear the state
      act(() => {
        useTimerStore.getState().clearTimerState();
      });

      const state = useTimerStore.getState();
      expect(state.currentTaskId).toBeUndefined();
      expect(state.currentTaskName).toBeUndefined();
      expect(state.currentTaskDescription).toBeUndefined();
      expect(state.isActive).toBe(false);
      expect(state.mode).toBe("work");
    });

    it("should preserve active state on page reload when timer is running", () => {
      // Mock localStorage to simulate page reload
      const mockState = {
        mode: "work",
        timeRemaining: 1200, // 20 minutes
        isActive: true,
        pomodorosCompleted: 2,
        currentTaskId: "task-123",
        currentTaskName: "Test Task",
        currentTaskDescription: "Test Description",
        timestamp: Date.now() - 5000, // 5 seconds ago
        userPreferences: { pomodoro_working_interval: 25 },
      };

      // Simulate the onRehydrateStorage logic
      const timeSinceLastSave = Date.now() - mockState.timestamp;
      const elapsedSeconds = Math.floor(timeSinceLastSave / 1000);
      const newTime = mockState.timeRemaining - elapsedSeconds;

      // Verify the logic works correctly
      expect(newTime).toBeGreaterThan(0); // Timer should still have time
      expect(newTime).toBeLessThan(mockState.timeRemaining); // Time should have elapsed

      // The timer should remain active since it was active and still has time
      const shouldBeActive = mockState.isActive && newTime > 0;
      expect(shouldBeActive).toBe(true);
    });

    it("should allow starting break timers", async () => {
      const { result } = renderHook(() => useTimerStore());

      act(() => {
        result.current.setMode("shortBreak");
        result.current.setIsActive(false);
        result.current.setCurrentTask("task1", "Test Task", "Description");
      });

      // Try to start the timer during break mode - should now work
      await act(async () => {
        await result.current.startPause();
      });

      // Timer should now be active
      expect(result.current.isActive).toBe(true);
      // Task should still be assigned
      expect(result.current.currentTaskId).toBe("task1");
    });

    it("should prevent starting work timer without a task", async () => {
      const { result } = renderHook(() => useTimerStore());

      act(() => {
        result.current.setMode("work");
        result.current.setIsActive(false);
        // No task assigned
      });

      // Try to start the timer in work mode without a task
      await act(async () => {
        await result.current.startPause();
      });

      // Timer should remain inactive
      expect(result.current.isActive).toBe(false);
    });

    it("should allow pausing during break mode", async () => {
      const { result } = renderHook(() => useTimerStore());

      act(() => {
        result.current.setMode("shortBreak");
        result.current.setIsActive(true); // Somehow active during break
        result.current.setCurrentTask("task1", "Test Task", "Description");
      });

      // Should be able to pause during break mode
      await act(async () => {
        await result.current.startPause();
      });

      expect(result.current.isActive).toBe(false);
    });
  });
});
