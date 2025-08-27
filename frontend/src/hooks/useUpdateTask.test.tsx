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

describe("useUpdateTask optimistic updates", () => {
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
  });

  test("should apply optimistic update immediately for add_lasts_minutes", async () => {
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

    act(() => {
      result.current.mutate({
        taskId: "task-1",
        taskData: { add_lasts_minutes: 30 },
      });
    });

    // Wait for optimistic update to apply
    await waitFor(() => {
      const updatedTasks = queryClient.getQueryData<Task[]>(["tasks"]);
      expect(updatedTasks?.[0].statistics?.lasts_minutes).toBe(30);
    });
  });

  test("should apply optimistic update for regular field updates", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateTask(), { wrapper });

    // Set initial tasks data
    queryClient.setQueryData(["tasks"], mockTasks);

    // Mock successful API response
    const updatedTask = {
      ...mockTasks[0],
      status: "in_progress" as const,
    };
    mockUpdateTask.mockResolvedValueOnce(updatedTask);

    act(() => {
      result.current.mutate({
        taskId: "task-1",
        taskData: { status: "in_progress" },
      });
    });

    // Wait for optimistic update to apply
    await waitFor(() => {
      const updatedTasks = queryClient.getQueryData<Task[]>(["tasks"]);
      expect(updatedTasks?.[0].status).toBe("in_progress");
    });
  });

  test("should rollback on API error", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateTask(), { wrapper });

    // Set initial tasks data
    queryClient.setQueryData(["tasks"], mockTasks);

    // Mock API error
    mockUpdateTask.mockRejectedValueOnce(new Error("API Error"));

    act(() => {
      result.current.mutate({
        taskId: "task-1",
        taskData: { add_lasts_minutes: 30 },
      });
    });

    // Wait for the mutation to complete and rollback
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Should rollback to original state
    const tasks = queryClient.getQueryData<Task[]>(["tasks"]);
    expect(tasks?.[0].statistics?.lasts_minutes).toBe(0);
  });

  test("should handle multiple optimistic updates correctly", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateTask(), { wrapper });

    // Set initial tasks data
    queryClient.setQueryData(["tasks"], mockTasks);

    // Mock successful API responses
    mockUpdateTask
      .mockResolvedValueOnce({
        ...mockTasks[0],
        statistics: { lasts_minutes: 15 },
      })
      .mockResolvedValueOnce({
        ...mockTasks[1],
        statistics: { lasts_minutes: 45 },
      });

    // First update
    act(() => {
      result.current.mutate({
        taskId: "task-1",
        taskData: { add_lasts_minutes: 15 },
      });
    });

    // Second update
    act(() => {
      result.current.mutate({
        taskId: "task-2",
        taskData: { add_lasts_minutes: 15 },
      });
    });

    // Wait for optimistic updates to apply
    await waitFor(() => {
      const updatedTasks = queryClient.getQueryData<Task[]>(["tasks"]);
      expect(updatedTasks?.[0].statistics?.lasts_minutes).toBe(15);
      expect(updatedTasks?.[1].statistics?.lasts_minutes).toBe(45);
    });
  });
});
