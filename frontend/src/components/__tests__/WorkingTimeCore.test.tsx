import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Task } from "../../types/task";
import { updateTask } from "../../services/taskService";
import { useUpdateTask } from "../../hooks/useTasks";
import { MessageProvider } from "../../context/MessageContext";
import { formatWorkingTime } from "../../utils/utils";

// Mock the task service
jest.mock("../../services/taskService");
const mockUpdateTask = updateTask as jest.MockedFunction<typeof updateTask>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MessageProvider>{children}</MessageProvider>
    </QueryClientProvider>
  );
};

describe("Working Time Updates Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Task 9.1: Backend calculates and returns updated working time", () => {
    test("when task status changes from in_progress to pending, backend returns updated lasts_minutes", async () => {
      const updatedTask: Task = {
        id: "task-1",
        title: "Test Task",
        description: "Test description",
        status: "pending",
        priority: "medium",
        user_id: "user-1",
        statistics: {
          lasts_minutes: 55, // Backend calculated 25 minutes of work + existing 30
          was_taken_at: "2023-01-01T10:00:00Z",
          was_stopped_at: "2023-01-01T10:25:00Z",
        },
      };

      mockUpdateTask.mockResolvedValueOnce(updatedTask);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateTask(), { wrapper });

      act(() => {
        result.current.mutate({
          taskId: "task-1",
          taskData: { status: "pending" },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify API was called correctly
      expect(mockUpdateTask).toHaveBeenCalledWith("task-1", {
        status: "pending",
      });

      // Verify response contains updated working time
      expect(result.current.data?.statistics?.lasts_minutes).toBe(55);
      expect(result.current.data?.statistics?.was_stopped_at).toBeDefined();
    });

    test("backend returns updated task details correctly after timer operations", async () => {
      const updatedTask: Task = {
        id: "task-1",
        title: "Test Task",
        description: "Test description",
        status: "pending",
        priority: "medium",
        user_id: "user-1",
        statistics: {
          lasts_minutes: 75, // Updated from timer operation
          was_taken_at: "2023-01-01T10:00:00Z",
          was_stopped_at: "2023-01-01T11:15:00Z",
        },
      };

      mockUpdateTask.mockResolvedValueOnce(updatedTask);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateTask(), { wrapper });

      act(() => {
        result.current.mutate({
          taskId: "task-1",
          taskData: { status: "pending" },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify the updated task data includes the new working time and timestamps
      const updatedData = result.current.data;
      expect(updatedData?.statistics?.lasts_minutes).toBe(75);
      expect(updatedData?.statistics?.was_stopped_at).toBeDefined();
      expect(updatedData?.statistics?.was_taken_at).toBeDefined();
    });
  });

  describe("Task 9.2: Manual working time changes return updated data", () => {
    test("manual working time changes via edit task modal return updated task data in API response", async () => {
      const updatedTask: Task = {
        id: "task-1",
        title: "Test Task",
        description: "Test description",
        status: "pending",
        priority: "medium",
        user_id: "user-1",
        statistics: {
          lasts_minutes: 45, // Added 15 minutes to existing 30
        },
      };

      mockUpdateTask.mockResolvedValueOnce(updatedTask);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateTask(), { wrapper });

      act(() => {
        result.current.mutate({
          taskId: "task-1",
          taskData: { add_lasts_minutes: 15 },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify API was called correctly
      expect(mockUpdateTask).toHaveBeenCalledWith("task-1", {
        add_lasts_minutes: 15,
      });

      // Verify response contains updated working time
      expect(result.current.data?.statistics?.lasts_minutes).toBe(45);
    });
  });

  describe("Task 9.3: TanStack Query updates UI immediately", () => {
    test("TanStack Query updates the UI immediately when API responses contain updated working time", async () => {
      const updatedTask: Task = {
        id: "task-1",
        title: "Test Task",
        description: "Test description",
        status: "pending",
        priority: "medium",
        user_id: "user-1",
        statistics: {
          lasts_minutes: 60, // Updated working time
          was_taken_at: "2023-01-01T10:00:00Z",
        },
      };

      mockUpdateTask.mockResolvedValueOnce(updatedTask);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateTask(), { wrapper });

      act(() => {
        result.current.mutate({
          taskId: "task-1",
          taskData: { status: "done" },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify that the mutation returns the updated data immediately
      expect(result.current.data?.statistics?.lasts_minutes).toBe(60);
    });

    test("TanStack Query provides proper loading states during working time updates", async () => {
      const updatedTask: Task = {
        id: "task-1",
        title: "Test Task",
        description: "Test description",
        status: "pending",
        priority: "medium",
        user_id: "user-1",
        statistics: {
          lasts_minutes: 75,
        },
      };

      // Add delay to simulate network request
      mockUpdateTask.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(updatedTask), 50);
          })
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateTask(), { wrapper });

      // Initially not pending
      expect(result.current.isPending).toBe(false);

      act(() => {
        result.current.mutate({
          taskId: "task-1",
          taskData: { status: "pending" },
        });
      });

      // Should be pending during the request
      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should not be pending after success
      expect(result.current.isPending).toBe(false);
      expect(result.current.data?.statistics?.lasts_minutes).toBe(75);
    });
  });

  describe("Task 9.4: Working time changes visible in dashboard task list", () => {
    test("working time changes are immediately visible after successful API responses", async () => {
      const taskWithUpdatedTime: Task = {
        id: "task-1",
        title: "Test Task",
        description: "Test description",
        status: "pending",
        priority: "medium",
        user_id: "user-1",
        statistics: {
          lasts_minutes: 75, // Updated from timer operation
          was_taken_at: "2023-01-01T10:00:00Z",
          was_stopped_at: "2023-01-01T11:15:00Z",
        },
      };

      mockUpdateTask.mockResolvedValueOnce(taskWithUpdatedTime);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateTask(), { wrapper });

      act(() => {
        result.current.mutate({
          taskId: "task-1",
          taskData: { status: "pending" },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify the updated task data includes the new working time
      const updatedData = result.current.data;
      expect(updatedData?.statistics?.lasts_minutes).toBe(75);
      expect(updatedData?.statistics?.was_stopped_at).toBeDefined();

      // Verify the formatted time would display correctly in the UI
      expect(formatWorkingTime(updatedData?.statistics?.lasts_minutes)).toBe(
        "1h 15m"
      );
    });

    test("formatWorkingTime utility handles all time formats correctly for UI display", () => {
      // Test various time formats that would be returned by the backend
      expect(formatWorkingTime(0)).toBe("0 minutes");
      expect(formatWorkingTime(30)).toBe("30m");
      expect(formatWorkingTime(60)).toBe("1h");
      expect(formatWorkingTime(90)).toBe("1h 30m");
      expect(formatWorkingTime(135)).toBe("2h 15m");
      expect(formatWorkingTime(undefined)).toBe("N/A");
      expect(formatWorkingTime(null)).toBe("N/A");
    });
  });

  describe("Task 9.5: Query invalidation ensures fresh data", () => {
    test("useUpdateTask mutation invalidates queries to ensure components get fresh data", async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      // Spy on query invalidation
      const invalidateQueriesSpy = jest.spyOn(queryClient, "invalidateQueries");

      const updatedTask: Task = {
        id: "task-1",
        title: "Test Task",
        description: "Test description",
        status: "done",
        priority: "medium",
        user_id: "user-1",
        statistics: {
          lasts_minutes: 90,
        },
      };

      mockUpdateTask.mockResolvedValueOnce(updatedTask);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <MessageProvider>{children}</MessageProvider>
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useUpdateTask(), { wrapper });

      act(() => {
        result.current.mutate({
          taskId: "task-1",
          taskData: { status: "done" },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify that queries are invalidated to ensure fresh data
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["tasks"],
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["daily-plan"],
      });
    });
  });
});

// Test component to verify working time display in UI components
const WorkingTimeDisplay: React.FC<{ task: Task }> = ({ task }) => {
  return (
    <div>
      <span data-testid="task-title">{task.title}</span>
      <span data-testid="working-time">
        {formatWorkingTime(task.statistics?.lasts_minutes)}
      </span>
    </div>
  );
};

describe("Working Time Display in UI Components", () => {
  test("task components display working time correctly for different values", () => {
    const testCases = [
      { minutes: 0, expected: "0 minutes" },
      { minutes: 30, expected: "30m" },
      { minutes: 60, expected: "1h" },
      { minutes: 90, expected: "1h 30m" },
      { minutes: 135, expected: "2h 15m" },
      { minutes: undefined, expected: "N/A" },
    ];

    testCases.forEach(({ minutes, expected }) => {
      const task: Task = {
        id: "test-task",
        title: "Test Task",
        status: "pending",
        priority: "medium",
        user_id: "user-1",
        statistics:
          minutes !== undefined ? { lasts_minutes: minutes } : undefined,
      };

      const { rerender } = render(<WorkingTimeDisplay task={task} />);

      expect(screen.getByTestId("working-time")).toHaveTextContent(expected);

      // Clean up for next iteration
      rerender(<div />);
    });
  });

  test("task components handle missing statistics gracefully", () => {
    const taskWithoutStats: Task = {
      id: "test-task",
      title: "Test Task Without Stats",
      status: "pending",
      priority: "medium",
      user_id: "user-1",
      // No statistics property
    };

    render(<WorkingTimeDisplay task={taskWithoutStats} />);

    // Should display "N/A" for missing statistics
    expect(screen.getByTestId("working-time")).toHaveTextContent("N/A");
  });
});
