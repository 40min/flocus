import { act, renderHook } from "@testing-library/react";
import {
  useTimerStore,
  useTimerModeText,
  useTimerButtonStates,
} from "./timerStore";

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, "localStorage", { value: mockLocalStorage });

describe("Timer Store Selectors", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);

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

  describe("useTimerModeText", () => {
    it("should return 'Focus' for work mode", () => {
      act(() => {
        useTimerStore.setState({ mode: "work" });
      });

      const { result } = renderHook(() => useTimerModeText());
      expect(result.current).toBe("Focus");
    });

    it("should return 'Short Break' for shortBreak mode", () => {
      act(() => {
        useTimerStore.setState({ mode: "shortBreak" });
      });

      const { result } = renderHook(() => useTimerModeText());
      expect(result.current).toBe("Short Break");
    });

    it("should return 'Long Break' for longBreak mode", () => {
      act(() => {
        useTimerStore.setState({ mode: "longBreak" });
      });

      const { result } = renderHook(() => useTimerModeText());
      expect(result.current).toBe("Long Break");
    });

    it("should return empty string for invalid mode", () => {
      act(() => {
        useTimerStore.setState({ mode: "invalid" as any });
      });

      const { result } = renderHook(() => useTimerModeText());
      expect(result.current).toBe("");
    });

    it("should update when mode changes", () => {
      const { result } = renderHook(() => useTimerModeText());

      act(() => {
        useTimerStore.setState({ mode: "work" });
      });
      expect(result.current).toBe("Focus");

      act(() => {
        useTimerStore.setState({ mode: "shortBreak" });
      });
      expect(result.current).toBe("Short Break");

      act(() => {
        useTimerStore.setState({ mode: "longBreak" });
      });
      expect(result.current).toBe("Long Break");
    });
  });

  describe("useTimerButtonStates", () => {
    it("should disable reset button when no task is assigned", () => {
      act(() => {
        useTimerStore.setState({
          currentTaskId: undefined,
          currentTaskName: undefined,
          currentTaskDescription: undefined,
        });
      });

      const { result } = renderHook(() => useTimerButtonStates());
      expect(result.current.resetDisabled).toBe(true);
    });

    it("should enable reset button when task is assigned", () => {
      act(() => {
        useTimerStore.setState({
          currentTaskId: "task1",
          currentTaskName: "Test Task",
          currentTaskDescription: "Description",
        });
      });

      const { result } = renderHook(() => useTimerButtonStates());
      expect(result.current.resetDisabled).toBe(false);
    });

    it("should hide skip break button during work mode", () => {
      act(() => {
        useTimerStore.setState({ mode: "work" });
      });

      const { result } = renderHook(() => useTimerButtonStates());
      expect(result.current.skipBreakVisible).toBe(false);
    });

    it("should show skip break button during short break mode", () => {
      act(() => {
        useTimerStore.setState({ mode: "shortBreak" });
      });

      const { result } = renderHook(() => useTimerButtonStates());
      expect(result.current.skipBreakVisible).toBe(true);
    });

    it("should show skip break button during long break mode", () => {
      act(() => {
        useTimerStore.setState({ mode: "longBreak" });
      });

      const { result } = renderHook(() => useTimerButtonStates());
      expect(result.current.skipBreakVisible).toBe(true);
    });

    it("should update button states when dependencies change", () => {
      const { result } = renderHook(() => useTimerButtonStates());

      // Initial state: work mode, no task, inactive
      act(() => {
        useTimerStore.setState({
          mode: "work",
          isActive: false,
          currentTaskId: undefined,
        });
      });

      expect(result.current).toEqual({
        resetDisabled: true,
        skipBreakVisible: false,
      });

      // Add task
      act(() => {
        useTimerStore.setState({
          currentTaskId: "task1",
          currentTaskName: "Test Task",
        });
      });

      expect(result.current).toEqual({
        resetDisabled: false,
        skipBreakVisible: false,
      });

      // Switch to break mode and activate
      act(() => {
        useTimerStore.setState({
          mode: "shortBreak",
          isActive: true,
        });
      });

      expect(result.current).toEqual({
        resetDisabled: false,
        skipBreakVisible: true,
      });

      // Remove task
      act(() => {
        useTimerStore.setState({
          currentTaskId: undefined,
          currentTaskName: undefined,
        });
      });

      expect(result.current).toEqual({
        resetDisabled: true,
        skipBreakVisible: true,
      });
    });

    it("should handle edge cases with partial task data", () => {
      const { result } = renderHook(() => useTimerButtonStates());

      // Test with only task ID
      act(() => {
        useTimerStore.setState({
          currentTaskId: "task1",
          currentTaskName: undefined,
          currentTaskDescription: undefined,
        });
      });

      expect(result.current.resetDisabled).toBe(false);

      // Test with empty string task ID
      act(() => {
        useTimerStore.setState({
          currentTaskId: "",
          currentTaskName: "Test Task",
        });
      });

      expect(result.current.resetDisabled).toBe(true);

      // Test with null task ID
      act(() => {
        useTimerStore.setState({
          currentTaskId: null as any,
          currentTaskName: "Test Task",
        });
      });

      expect(result.current.resetDisabled).toBe(true);
    });
  });
});
