import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTimerWithOptimisticUpdates } from "./useTimerWithOptimisticUpdates";
import { useTimerStore } from "../stores/timerStore";
import React from "react";

// Mock the optimistic update hook
jest.mock("./useOptimisticTaskUpdate", () => ({
  useOptimisticTaskUpdate: () => ({
    updateStatus: {
      mutate: jest.fn(),
      isPending: false,
      error: null,
    },
    updateWorkingTime: {
      mutate: jest.fn(),
      isPending: false,
      error: null,
    },
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useTimerWithOptimisticUpdates", () => {
  beforeEach(() => {
    // Reset timer store to default state
    act(() => {
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
  });

  it("should return timer state with optimistic update states", () => {
    const { result } = renderHook(() => useTimerWithOptimisticUpdates(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toMatchObject({
      mode: "work",
      timeRemaining: 25 * 60,
      isActive: false,
      pomodorosCompleted: 0,
      isUpdatingStatus: false,
      isUpdatingWorkingTime: false,
      statusUpdateError: null,
      workingTimeUpdateError: null,
    });
  });

  it("should connect optimistic update functions to timer store", () => {
    const { result } = renderHook(() => useTimerWithOptimisticUpdates(), {
      wrapper: createWrapper(),
    });

    // Check that the hook returns the expected properties
    expect(result.current.setOptimisticUpdateFunctions).toBeDefined();
    expect(typeof result.current.setOptimisticUpdateFunctions).toBe("function");
  });

  it("should include all timer properties and actions", () => {
    const { result } = renderHook(() => useTimerWithOptimisticUpdates(), {
      wrapper: createWrapper(),
    });

    // Check that all expected timer properties are present
    expect(result.current).toHaveProperty("mode");
    expect(result.current).toHaveProperty("timeRemaining");
    expect(result.current).toHaveProperty("isActive");
    expect(result.current).toHaveProperty("handleStartPause");
    expect(result.current).toHaveProperty("handleReset");
    expect(result.current).toHaveProperty("handleSkip");
    expect(result.current).toHaveProperty("formatTime");
    expect(result.current).toHaveProperty("currentTaskId");
    expect(result.current).toHaveProperty("currentTaskName");
    expect(result.current).toHaveProperty("currentTaskDescription");

    // Check that optimistic update states are present
    expect(result.current).toHaveProperty("isUpdatingStatus");
    expect(result.current).toHaveProperty("isUpdatingWorkingTime");
    expect(result.current).toHaveProperty("statusUpdateError");
    expect(result.current).toHaveProperty("workingTimeUpdateError");
  });
});
