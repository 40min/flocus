import { renderHook } from "@testing-library/react";
import {
  useTimer,
  useTimerDisplay,
  useTimerControls,
  useTimerTask,
} from "./useTimer";

// Mock all the timer store selectors
const mockFormatTime = jest.fn();

const mockActions = {
  startPause: jest.fn(),
  reset: jest.fn(),
  skip: jest.fn(),
  stopCurrentTask: jest.fn(),
  resetForNewTask: jest.fn(),
  markTaskAsDone: jest.fn(),
  setCurrentTask: jest.fn(),
  formatTime: mockFormatTime,
};

const mockCurrentTask = {
  id: "task1",
  name: "Test Task",
  description: "Test Description",
};

const mockColors = {
  timerColor: "border-primary-DEFAULT",
  buttonBgColor: "bg-primary-DEFAULT hover:bg-primary-dark",
  buttonTextColor: "text-white",
};

const mockModeText = {
  work: "Focus",
  shortBreak: "Short Break",
  longBreak: "Long Break",
};

jest.mock("../stores/timerStore", () => ({
  useTimerStore: jest.fn(),
  useTimerMode: jest.fn(),
  useTimerRemaining: jest.fn(),
  useTimerActive: jest.fn(),
  useTimerPomodoros: jest.fn(),
  useTimerCurrentTask: jest.fn(),
  useTimerColors: jest.fn(),
  useTimerModeText: jest.fn(),
  useTimerActions: jest.fn(),
}));

const {
  useTimerStore,
  useTimerMode,
  useTimerRemaining,
  useTimerActive,
  useTimerPomodoros,
  useTimerCurrentTask,
  useTimerColors,
  useTimerModeText,
  useTimerActions,
} = require("../stores/timerStore");

describe("useTimer hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set up the formatTime mock implementation
    mockFormatTime.mockImplementation((seconds: number) => {
      const mins = Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0");
      const secs = (seconds % 60).toString().padStart(2, "0");
      return `${mins}:${secs}`;
    });

    // Set up all the mocks with default values
    useTimerMode.mockReturnValue("work");
    useTimerRemaining.mockReturnValue(1500);

    useTimerActive.mockReturnValue(false);
    useTimerPomodoros.mockReturnValue(2);
    useTimerCurrentTask.mockReturnValue(mockCurrentTask);
    useTimerColors.mockReturnValue(mockColors);
    useTimerModeText.mockReturnValue(mockModeText);
    useTimerActions.mockReturnValue(mockActions);

    // Mock useTimerStore for backward compatibility setters, formatTime, and loading states
    useTimerStore.mockImplementation((selector: any) => {
      if (typeof selector === "function") {
        const mockState = {
          currentTaskId: "task1",
          currentTaskName: "Test Task",
          currentTaskDescription: "Test Description",
          setIsActive: jest.fn(),
          setCurrentTask: jest.fn(),
          formatTime: mockFormatTime,
          isUpdatingTaskStatus: false,
          isUpdatingWorkingTime: false,
        };
        const result = selector(mockState);
        // If the result is the formatTime function, make sure it has the right implementation
        if (result === mockFormatTime) {
          return mockFormatTime;
        }
        return result;
      }
      return mockFormatTime;
    });
  });

  describe("useTimer", () => {
    it("should return complete timer interface", () => {
      const { result } = renderHook(() => useTimer());

      expect(result.current).toEqual({
        mode: "work",
        timeRemaining: 1500,
        isActive: false,
        pomodorosCompleted: 2,
        currentTaskId: "task1",
        currentTaskName: "Test Task",
        currentTaskDescription: "Test Description",
        handleStartPause: expect.any(Function),
        handleReset: expect.any(Function),
        handleSkip: expect.any(Function),
        stopCurrentTask: expect.any(Function),
        resetForNewTask: expect.any(Function),
        handleMarkAsDone: expect.any(Function),
        formatTime: expect.any(Function),
        isUpdatingTaskStatus: false,
        isUpdatingWorkingTime: false,
        isUpdating: false,
        setIsActive: expect.any(Function),
        setCurrentTaskId: expect.any(Function),
        setCurrentTaskName: expect.any(Function),
        setCurrentTaskDescription: expect.any(Function),
        isBreak: false,
        timerColor: "border-primary-DEFAULT",
        buttonBgColor: "bg-primary-DEFAULT hover:bg-primary-dark",
        buttonTextColor: "text-white",
        modeText: {
          work: "Focus",
          shortBreak: "Short Break",
          longBreak: "Long Break",
        },
      });
    });

    it("should identify break modes correctly", () => {
      useTimerMode.mockReturnValue("shortBreak");

      const { result } = renderHook(() => useTimer());

      expect(result.current.isBreak).toBe(true);
    });
  });

  describe("useTimerDisplay", () => {
    it("should return only display-related properties", () => {
      const { result } = renderHook(() => useTimerDisplay());

      expect(result.current).toEqual({
        mode: "work",
        timeRemaining: 1500,
        isActive: false,
        isBreak: false,
        timerColor: "border-primary-DEFAULT",
        buttonBgColor: "bg-primary-DEFAULT hover:bg-primary-dark",
        buttonTextColor: "text-white",
        modeText: {
          work: "Focus",
          shortBreak: "Short Break",
          longBreak: "Long Break",
        },
        formatTime: expect.any(Function),
        formattedTime: "25:00",
      });
    });

    it("should format time correctly", () => {
      const { result } = renderHook(() => useTimerDisplay());

      expect(result.current.formattedTime).toBe("25:00");
      expect(mockFormatTime).toHaveBeenCalledWith(1500);
    });
  });

  describe("useTimerControls", () => {
    it("should return only control-related properties", () => {
      const { result } = renderHook(() => useTimerControls());

      expect(result.current).toEqual({
        isActive: false,
        startPause: expect.any(Function),
        reset: expect.any(Function),
        skip: expect.any(Function),
        stopCurrentTask: expect.any(Function),
        resetForNewTask: expect.any(Function),
        isUpdatingTaskStatus: false,
        isUpdatingWorkingTime: false,
        isUpdating: false,
      });
    });
  });

  describe("useTimerTask", () => {
    it("should return only task-related properties", () => {
      const { result } = renderHook(() => useTimerTask());

      expect(result.current).toEqual({
        currentTaskId: "task1",
        currentTaskName: "Test Task",
        currentTaskDescription: "Test Description",
        setCurrentTask: expect.any(Function),
        markTaskAsDone: expect.any(Function),
      });
    });
  });
});
