import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUpdateTask } from "./useTasks";
import { updateTask } from "../services/taskService";
import { Task } from "../types/task";
import { MessageProvider } from "../context/MessageContext";

// Mock the task service
jest.mock("../services/taskService");
const mockUpdateTask = updateTask as jest.MockedFunction<typeof updateTask>;

// Mock the error handling utilities to disable retry in tests
jest.mock("../utils/errorHandling", () => ({
  ...jest.requireActual("../utils/errorHandling"),
  shouldRetryMutation: () => false, // Disable retry in tests
  getRetryDelay: () => 0,
}));

const mockTasks: Task[] = [
  {
    id: "task-1",
    title: "Test Task 1",
    status: "pending",
    priority: "medium",
    user_id: "user-1",
    statistics: {
      lasts_minutes: 0,
    },
  },
  {
    id: "task-2",
    title: "Test Task 2",
    status: "in_progress",
    priority: "high",
    user_id: "user-1",
    statistics: {
      lasts_minutes: 30,
    },
  },
];

describe("useUpdateTask standard patterns", () => {
  let queryClient: QueryClient;

  // Create a wrapper for React Query and MessageContext
  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <MessageProvider>{children}</MessageProvider>
      </QueryClientProvider>
    );

    return Wrapper;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Spy on console.error to suppress expected error logs in tests
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("should call updateTask API and invalidate queries on success", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateTask(), { wrapper });

    // Set initial tasks data
    queryClient.setQueryData(["tasks"], mockTasks);

    // Mock successful API response
    const updatedTask = {
      ...mockTasks[0],
      statistics: { lasts_minutes: 30 },
    };
    mockUpdateTask.mockResolvedValueOnce(updatedTask);

    // Spy on query invalidation
    const invalidateQueriesSpy = jest.spyOn(queryClient, "invalidateQueries");

    act(() => {
      result.current.mutate({
        taskId: "task-1",
        taskData: { add_lasts_minutes: 30 },
      });
    });

    // Wait for mutation to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should call the API
    expect(mockUpdateTask).toHaveBeenCalledWith("task-1", {
      add_lasts_minutes: 30,
    });

    // Should invalidate queries to refetch fresh data
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["tasks"] });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["daily-plan"],
    });
  });

  test("should handle API errors gracefully", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateTask(), { wrapper });

    // Set initial tasks data
    queryClient.setQueryData(["tasks"], mockTasks);

    // Mock API error
    const apiError = new Error("Network error");
    mockUpdateTask.mockRejectedValueOnce(apiError);

    act(() => {
      result.current.mutate({
        taskId: "task-1",
        taskData: { status: "in_progress" },
      });
    });

    // Wait for the mutation to complete with error
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Should have the error
    expect(result.current.error).toBe(apiError);

    // Should call the API
    expect(mockUpdateTask).toHaveBeenCalledWith("task-1", {
      status: "in_progress",
    });

    // Should log the error using the new error handling format
    expect(console.error).toHaveBeenCalledWith(
      "Operation failed:",
      expect.objectContaining({
        error: expect.objectContaining({
          message: "Network error",
        }),
        context: expect.objectContaining({
          operation: "update",
          taskId: "task-1",
          taskData: { status: "in_progress" },
        }),
      })
    );
  });

  test("should provide loading state during mutation", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateTask(), { wrapper });

    // Mock API response with delay
    mockUpdateTask.mockImplementation(
      () =>
        new Promise((resolve) => setTimeout(() => resolve(mockTasks[0]), 100))
    );

    act(() => {
      result.current.mutate({
        taskId: "task-1",
        taskData: { status: "in_progress" },
      });
    });

    // Should be pending after mutation starts
    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    // Wait for mutation to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should no longer be pending
    expect(result.current.isPending).toBe(false);
  });

  test("should handle multiple concurrent updates independently", async () => {
    const wrapper = createWrapper();
    const { result: result1 } = renderHook(() => useUpdateTask(), { wrapper });
    const { result: result2 } = renderHook(() => useUpdateTask(), { wrapper });

    // Mock successful API responses
    mockUpdateTask
      .mockResolvedValueOnce(mockTasks[0])
      .mockResolvedValueOnce(mockTasks[1]);

    // Start both mutations
    act(() => {
      result1.current.mutate({
        taskId: "task-1",
        taskData: { status: "in_progress" },
      });
      result2.current.mutate({
        taskId: "task-2",
        taskData: { status: "done" },
      });
    });

    // Wait for first mutation to complete
    await waitFor(() => {
      expect(result1.current.isSuccess).toBe(true);
    });

    // Wait for second mutation to complete
    await waitFor(() => {
      expect(result2.current.isSuccess).toBe(true);
    });

    // Both API calls should have been made
    expect(mockUpdateTask).toHaveBeenCalledWith("task-1", {
      status: "in_progress",
    });
    expect(mockUpdateTask).toHaveBeenCalledWith("task-2", { status: "done" });
  });
});
