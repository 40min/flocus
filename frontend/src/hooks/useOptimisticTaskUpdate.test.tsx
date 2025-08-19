import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useOptimisticTaskUpdate } from "./useOptimisticTaskUpdate";
import { updateTask } from "../services/taskService";
import { Task } from "../types/task";

// Mock the task service
jest.mock("../services/taskService");
const mockUpdateTask = updateTask as jest.MockedFunction<typeof updateTask>;

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

describe("useOptimisticTaskUpdate", () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    return Wrapper;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("updateWorkingTime mutation", () => {
    test("should create updateWorkingTime mutation with correct API call", async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useOptimisticTaskUpdate(), {
        wrapper,
      });

      // Mock successful API response
      const updatedTask = {
        ...mockTasks[0],
        statistics: { lasts_minutes: 30 },
      };
      mockUpdateTask.mockResolvedValueOnce(updatedTask);

      // Trigger the mutation
      act(() => {
        result.current.updateWorkingTime.mutate({
          taskId: "task-1",
          additionalMinutes: 30,
        });
      });

      // Wait for mutation to complete and verify the API was called correctly
      await waitFor(() => {
        expect(mockUpdateTask).toHaveBeenCalledWith("task-1", {
          add_lasts_minutes: 30,
        });
        expect(result.current.updateWorkingTime.isSuccess).toBe(true);
      });
    });

    test("should apply optimistic update to cache", async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useOptimisticTaskUpdate(), {
        wrapper,
      });

      // Set initial tasks data
      queryClient.setQueryData(["tasks"], mockTasks);

      // Mock successful API response
      const updatedTask = {
        ...mockTasks[0],
        statistics: { lasts_minutes: 30 },
      };
      mockUpdateTask.mockResolvedValueOnce(updatedTask);

      // Trigger the mutation
      act(() => {
        result.current.updateWorkingTime.mutate({
          taskId: "task-1",
          additionalMinutes: 30,
        });
      });

      // The optimistic update should happen immediately
      await waitFor(() => {
        const updatedTasks = queryClient.getQueryData<Task[]>(["tasks"]);
        expect(updatedTasks?.[0].statistics?.lasts_minutes).toBe(30);
      });
    });

    test("should rollback on API error", async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useOptimisticTaskUpdate(), {
        wrapper,
      });

      // Set initial tasks data
      queryClient.setQueryData(["tasks"], mockTasks);

      // Mock API error
      mockUpdateTask.mockRejectedValueOnce(new Error("API Error"));

      // Trigger the mutation
      act(() => {
        result.current.updateWorkingTime.mutate({
          taskId: "task-1",
          additionalMinutes: 30,
        });
      });

      // Wait for the mutation to complete and rollback
      await waitFor(() => {
        expect(result.current.updateWorkingTime.isError).toBe(true);
      });

      // Should rollback to original state
      const tasks = queryClient.getQueryData<Task[]>(["tasks"]);
      expect(tasks?.[0].statistics?.lasts_minutes).toBe(0);
    });

    test("should handle tasks without existing statistics", async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useOptimisticTaskUpdate(), {
        wrapper,
      });

      const taskWithoutStats: Task = {
        ...mockTasks[0],
        statistics: undefined,
      };

      // Set initial tasks data with task without statistics
      queryClient.setQueryData(["tasks"], [taskWithoutStats]);

      // Mock successful API response
      const updatedTask = {
        ...taskWithoutStats,
        statistics: { lasts_minutes: 25 },
      };
      mockUpdateTask.mockResolvedValueOnce(updatedTask);

      act(() => {
        result.current.updateWorkingTime.mutate({
          taskId: "task-1",
          additionalMinutes: 25,
        });
      });

      // Should create statistics and update immediately
      await waitFor(() => {
        const updatedTasks = queryClient.getQueryData<Task[]>(["tasks"]);
        expect(updatedTasks?.[0].statistics?.lasts_minutes).toBe(25);
      });
    });
  });

  describe("updateStatus mutation", () => {
    test("should create updateStatus mutation with correct API call", async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useOptimisticTaskUpdate(), {
        wrapper,
      });

      // Mock successful API response
      const updatedTask = {
        ...mockTasks[0],
        status: "in_progress" as const,
      };
      mockUpdateTask.mockResolvedValueOnce(updatedTask);

      act(() => {
        result.current.updateStatus.mutate({
          taskId: "task-1",
          status: "in_progress",
        });
      });

      // Wait for mutation to complete and verify the API was called correctly
      await waitFor(() => {
        expect(mockUpdateTask).toHaveBeenCalledWith("task-1", {
          status: "in_progress",
        });
        expect(result.current.updateStatus.isSuccess).toBe(true);
      });
    });

    test("should handle status update errors", async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useOptimisticTaskUpdate(), {
        wrapper,
      });

      // Mock API error
      mockUpdateTask.mockRejectedValueOnce(new Error("Status update failed"));

      act(() => {
        result.current.updateStatus.mutate({
          taskId: "task-1",
          status: "done",
        });
      });

      // Wait for the mutation to complete
      await waitFor(() => {
        expect(result.current.updateStatus.isError).toBe(true);
      });

      expect(result.current.updateStatus.error?.message).toBe(
        "Status update failed"
      );
    });

    test("should provide mutation variables for UI optimistic updates", async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useOptimisticTaskUpdate(), {
        wrapper,
      });

      // Mock successful API response
      const updatedTask = {
        ...mockTasks[0],
        status: "blocked" as const,
      };
      mockUpdateTask.mockResolvedValueOnce(updatedTask);

      act(() => {
        result.current.updateStatus.mutate({
          taskId: "task-1",
          status: "blocked",
        });
      });

      // Variables should be available for UI components to use for optimistic updates
      await waitFor(() => {
        expect(result.current.updateStatus.variables).toEqual({
          taskId: "task-1",
          status: "blocked",
        });
      });
    });
  });

  describe("TypeScript interfaces and error handling", () => {
    test("should handle network errors gracefully", async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useOptimisticTaskUpdate(), {
        wrapper,
      });

      // Set initial tasks data
      queryClient.setQueryData(["tasks"], mockTasks);

      // Mock network error
      mockUpdateTask.mockRejectedValueOnce(new Error("Network Error"));

      act(() => {
        result.current.updateWorkingTime.mutate({
          taskId: "task-1",
          additionalMinutes: 45,
        });
      });

      // Wait for error
      await waitFor(() => {
        expect(result.current.updateWorkingTime.isError).toBe(true);
      });

      // Should rollback and maintain original data
      const tasks = queryClient.getQueryData<Task[]>(["tasks"]);
      expect(tasks?.[0].statistics?.lasts_minutes).toBe(0);
      expect(result.current.updateWorkingTime.error?.message).toBe(
        "Network Error"
      );
    });

    test("should handle empty task arrays gracefully", async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useOptimisticTaskUpdate(), {
        wrapper,
      });

      // Set empty tasks data
      queryClient.setQueryData(["tasks"], []);

      // Mock successful API response
      mockUpdateTask.mockResolvedValueOnce(mockTasks[0]);

      act(() => {
        result.current.updateWorkingTime.mutate({
          taskId: "task-1",
          additionalMinutes: 30,
        });
      });

      // Should handle empty array gracefully
      const updatedTasks = queryClient.getQueryData<Task[]>(["tasks"]);
      expect(Array.isArray(updatedTasks)).toBe(true);
      expect(updatedTasks?.length).toBe(0);
    });

    test("should return both mutations from hook", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useOptimisticTaskUpdate(), {
        wrapper,
      });

      // Should return both mutations
      expect(result.current.updateWorkingTime).toBeDefined();
      expect(result.current.updateStatus).toBeDefined();
      expect(typeof result.current.updateWorkingTime.mutate).toBe("function");
      expect(typeof result.current.updateStatus.mutate).toBe("function");
    });
  });
});
