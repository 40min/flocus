import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCarryOverIntegration } from "./useCarryOverIntegration";
import * as dailyPlanService from "../services/dailyPlanService";
import { DailyPlanResponse } from "../types/dailyPlan";
import React from "react";
// Mock dependencies
jest.mock("../services/dailyPlanService");

jest.mock("../stores/timerStore", () => ({
  useTimerStore: jest.fn(),
  useTimerCurrentTask: jest.fn(),
  useTimerActions: jest.fn(),
}));

jest.mock("../hooks/useDailyPlan");

// Mock the message context
const mockShowMessage = jest.fn();
jest.mock("../context/MessageContext", () => ({
  useMessage: () => ({
    showMessage: mockShowMessage,
  }),
}));

// Mock useDailyPlanWithReview
const mockUseDailyPlanWithReview = {
  dailyPlan: null as DailyPlanResponse | null,
  carryOverTimeWindow: jest.fn(),
  isCarryingOver: false,
};

jest.mock("./useDailyPlan", () => ({
  useDailyPlanWithReview: () => mockUseDailyPlanWithReview,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockDailyPlan: DailyPlanResponse = {
  id: "plan1",
  user_id: "user1",
  plan_date: "2023-01-01T00:00:00Z",
  reviewed: true,
  self_reflection: null,
  time_windows: [
    {
      time_window: {
        id: "tw1",
        description: "Work Session",
        start_time: 540, // 9:00 AM
        end_time: 600, // 10:00 AM
        category: {
          id: "cat1",
          name: "Work",
          color: "#blue",
          user_id: "user1",
          is_deleted: false,
        },
        day_template_id: "template1",
        user_id: "user1",
        is_deleted: false,
      },
      tasks: [
        {
          id: "task1",
          title: "Complete project",
          status: "pending",
          priority: "medium",
          description: undefined,
          category_id: "cat1",
          user_id: "user1",
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
          statistics: {
            lasts_minutes: 0,
          },
        },
        {
          id: "task2",
          title: "Review code",
          status: "done",
          priority: "medium",
          description: undefined,
          category_id: "cat1",
          user_id: "user1",
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
          statistics: {
            lasts_minutes: 30,
          },
        },
      ],
    },
    {
      time_window: {
        id: "tw2",
        description: "Meeting",
        start_time: 660, // 11:00 AM
        end_time: 720, // 12:00 PM
        category: {
          id: "cat2",
          name: "Meeting",
          color: "#green",
          user_id: "user1",
          is_deleted: false,
        },
        day_template_id: "template1",
        user_id: "user1",
        is_deleted: false,
      },
      tasks: [],
    },
  ],
};

// Helper function to get tomorrow's date in YYYY-MM-DD format
const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
};

describe("useCarryOverIntegration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShowMessage.mockClear();
    mockUseDailyPlanWithReview.dailyPlan = null;
    mockUseDailyPlanWithReview.carryOverTimeWindow.mockClear();
    mockUseDailyPlanWithReview.isCarryingOver = false;

    // Import the mocked functions
    const { useTimerCurrentTask, useTimerActions } = require("../stores/timerStore");

    // Mock useTimerCurrentTask to return the current task structure
    useTimerCurrentTask.mockReturnValue({
      id: null, // Will be overridden in individual tests
    });

    // Mock useTimerActions to return timer action functions
    useTimerActions.mockReturnValue({
      stopCurrentTask: jest.fn().mockResolvedValue(undefined),
      resetForNewTask: jest.fn().mockResolvedValue(undefined),
    });
  });

  it("should identify current task in time window correctly", async () => {
    mockUseDailyPlanWithReview.dailyPlan = mockDailyPlan;

    const { useTimerCurrentTask } = require("../stores/timerStore");
    useTimerCurrentTask.mockReturnValue({
      id: "task1",
    });

    const { result } = renderHook(() => useCarryOverIntegration(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isCurrentTaskInTimeWindow("tw1")).toBe(true);
    expect(result.current.isCurrentTaskInTimeWindow("tw2")).toBe(false);
    expect(result.current.isCurrentTaskInTimeWindow("nonexistent")).toBe(false);
  });

  it("should get affected tasks correctly", async () => {
    mockUseDailyPlanWithReview.dailyPlan = mockDailyPlan;

    const { result } = renderHook(() => useCarryOverIntegration(), {
      wrapper: createWrapper(),
    });

    const affectedTasks = result.current.getAffectedTasks("tw1");
    expect(affectedTasks).toHaveLength(1);
    expect(affectedTasks[0].id).toBe("task1");
    expect(affectedTasks[0].status).toBe("pending");

    const noAffectedTasks = result.current.getAffectedTasks("tw2");
    expect(noAffectedTasks).toHaveLength(0);
  });

  it("should get carry-over status correctly", async () => {
    mockUseDailyPlanWithReview.dailyPlan = mockDailyPlan;

    const { useTimerCurrentTask } = require("../stores/timerStore");
    useTimerCurrentTask.mockReturnValue({
      id: "task1",
    });

    const { result } = renderHook(() => useCarryOverIntegration(), {
      wrapper: createWrapper(),
    });

    const status = result.current.getTimeWindowCarryOverStatus("tw1");
    expect(status.canCarryOver).toBe(true);
    expect(status.taskCount).toBe(1);
    expect(status.hasActiveTimer).toBe(true);
    expect(status.affectedTasks).toHaveLength(1);

    const statusNoTasks = result.current.getTimeWindowCarryOverStatus("tw2");
    expect(statusNoTasks.canCarryOver).toBe(false);
    expect(statusNoTasks.taskCount).toBe(0);
    expect(statusNoTasks.hasActiveTimer).toBe(false);
  });

  it("should validate carry-over operation correctly", async () => {
    mockUseDailyPlanWithReview.dailyPlan = mockDailyPlan;

    const { result } = renderHook(() => useCarryOverIntegration(), {
      wrapper: createWrapper(),
    });

    // Valid carry-over (use tomorrow's date)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    const validResult = result.current.validateCarryOver("tw1", tomorrowStr);
    expect(validResult.valid).toBe(true);

    // Invalid - no unfinished tasks
    const invalidNoTasks = result.current.validateCarryOver("tw2", tomorrowStr);
    expect(invalidNoTasks.valid).toBe(false);
    expect(invalidNoTasks.reason).toBe("No unfinished tasks to carry over");

    // Invalid - nonexistent time window
    const invalidTimeWindow = result.current.validateCarryOver(
      "nonexistent",
      tomorrowStr
    );
    expect(invalidTimeWindow.valid).toBe(false);
    expect(invalidTimeWindow.reason).toBe("Time window not found");

    // Invalid - bad date format
    const invalidDate = result.current.validateCarryOver("tw1", "invalid-date");
    expect(invalidDate.valid).toBe(false);
    expect(invalidDate.reason).toBe("Invalid target date format");

    // Invalid - past date
    const pastDate = result.current.validateCarryOver("tw1", "2020-01-01");
    expect(pastDate.valid).toBe(false);
    expect(pastDate.reason).toBe("Cannot carry over to past dates");
  });

  it("should handle carry-over with timer integration successfully", async () => {
    mockUseDailyPlanWithReview.dailyPlan = mockDailyPlan;

    const mockStopCurrentTask = jest.fn().mockResolvedValue(undefined);
    const mockResetForNewTask = jest.fn().mockResolvedValue(undefined);

    const { useTimerCurrentTask, useTimerActions } = require("../stores/timerStore");
    useTimerCurrentTask.mockReturnValue({
      id: "task1",
    });

    useTimerActions.mockReturnValue({
      stopCurrentTask: mockStopCurrentTask,
      resetForNewTask: mockResetForNewTask,
    });

    mockUseDailyPlanWithReview.carryOverTimeWindow.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCarryOverIntegration(), {
      wrapper: createWrapper(),
    });

    const tomorrowDate = getTomorrowDate();

    await act(async () => {
      const carryOverResult =
        await result.current.carryOverWithTimerIntegration("tw1", tomorrowDate);

      expect(carryOverResult.success).toBe(true);
      expect(carryOverResult.timerWasReset).toBe(true);
      expect(carryOverResult.affectedTasks).toHaveLength(1);
    });

    expect(mockStopCurrentTask).toHaveBeenCalled();
    expect(mockUseDailyPlanWithReview.carryOverTimeWindow).toHaveBeenCalledWith(
      "tw1",
      tomorrowDate
    );
    expect(mockResetForNewTask).toHaveBeenCalled();
  });

  it("should handle carry-over without timer integration", async () => {
    mockUseDailyPlanWithReview.dailyPlan = mockDailyPlan;

    const mockStopCurrentTask = jest.fn().mockResolvedValue(undefined);
    const mockResetForNewTask = jest.fn().mockResolvedValue(undefined);

    const { useTimerCurrentTask, useTimerActions } = require("../stores/timerStore");
    useTimerCurrentTask.mockReturnValue({
      id: null, // No active timer
    });

    useTimerActions.mockReturnValue({
      stopCurrentTask: mockStopCurrentTask,
      resetForNewTask: mockResetForNewTask,
    });

    mockUseDailyPlanWithReview.carryOverTimeWindow.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCarryOverIntegration(), {
      wrapper: createWrapper(),
    });

    const tomorrowDate = getTomorrowDate();

    await act(async () => {
      const carryOverResult =
        await result.current.carryOverWithTimerIntegration("tw1", tomorrowDate);

      expect(carryOverResult.success).toBe(true);
      expect(carryOverResult.timerWasReset).toBe(false);
      expect(carryOverResult.affectedTasks).toHaveLength(1);
    });

    expect(mockStopCurrentTask).not.toHaveBeenCalled();
    expect(mockUseDailyPlanWithReview.carryOverTimeWindow).toHaveBeenCalledWith(
      "tw1",
      tomorrowDate
    );
    expect(mockResetForNewTask).not.toHaveBeenCalled();
  });

  it("should handle carry-over errors", async () => {
    mockUseDailyPlanWithReview.dailyPlan = mockDailyPlan;

    const mockStopCurrentTask = jest.fn().mockResolvedValue(undefined);
    const mockResetForNewTask = jest.fn().mockResolvedValue(undefined);

    const { useTimerCurrentTask, useTimerActions } = require("../stores/timerStore");
    useTimerCurrentTask.mockReturnValue({
      id: "task1",
    });

    useTimerActions.mockReturnValue({
      stopCurrentTask: mockStopCurrentTask,
      resetForNewTask: mockResetForNewTask,
    });

    const error = new Error("Carry over failed");
    mockUseDailyPlanWithReview.carryOverTimeWindow.mockRejectedValue(error);

    const { result } = renderHook(() => useCarryOverIntegration(), {
      wrapper: createWrapper(),
    });

    const tomorrowDate = getTomorrowDate();

    await act(async () => {
      await expect(
        result.current.carryOverWithTimerIntegration("tw1", tomorrowDate)
      ).rejects.toThrow("Carry over failed");
    });

    expect(mockStopCurrentTask).toHaveBeenCalled();
    expect(mockUseDailyPlanWithReview.carryOverTimeWindow).toHaveBeenCalledWith(
      "tw1",
      tomorrowDate
    );
    // resetForNewTask should not be called on error
    expect(mockResetForNewTask).not.toHaveBeenCalled();
  });

  it("should get active timer time windows", async () => {
    mockUseDailyPlanWithReview.dailyPlan = mockDailyPlan;

    const { useTimerCurrentTask } = require("../stores/timerStore");
    useTimerCurrentTask.mockReturnValue({
      id: "task1",
    });

    const { result } = renderHook(() => useCarryOverIntegration(), {
      wrapper: createWrapper(),
    });

    expect(result.current.activeTimerTimeWindows).toHaveLength(1);
    expect(result.current.activeTimerTimeWindows[0].time_window.id).toBe("tw1");

    // Test with no active timer
    useTimerCurrentTask.mockReturnValue({
      id: null,
    });

    const { result: resultNoTimer } = renderHook(
      () => useCarryOverIntegration(),
      {
        wrapper: createWrapper(),
      }
    );

    expect(resultNoTimer.current.activeTimerTimeWindows).toHaveLength(0);
  });

  it("should handle no daily plan scenario", async () => {
    mockUseDailyPlanWithReview.dailyPlan = null;

    const { result } = renderHook(() => useCarryOverIntegration(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isCurrentTaskInTimeWindow("tw1")).toBe(false);
    expect(result.current.getAffectedTasks("tw1")).toHaveLength(0);
    expect(result.current.activeTimerTimeWindows).toHaveLength(0);

    const validation = result.current.validateCarryOver(
      "tw1",
      getTomorrowDate()
    );
    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe("No daily plan available");
  });
});
