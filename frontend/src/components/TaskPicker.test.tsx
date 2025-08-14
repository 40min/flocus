import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TaskPicker from "./TaskPicker";
import { usePendingTasksByCategory } from "../hooks/useTasks";
import { Task } from "../types/task";
import { Category } from "../types/category";

jest.mock("../hooks/useTasks");

const mockUsePendingTasksByCategory =
  usePendingTasksByCategory as jest.MockedFunction<
    typeof usePendingTasksByCategory
  >;

describe("TaskPicker", () => {
  const mockCategory: Category = {
    id: "cat1",
    name: "Work",
    user_id: "user123",
    is_deleted: false,
  };

  const mockTasks: Task[] = [
    {
      id: "task1",
      title: "Task 1",
      description: "Description 1",
      status: "pending",
      priority: "medium",
      category_id: mockCategory.id,
      category: mockCategory,
      user_id: "user123",
      due_date: null,
      created_at: "2023-01-01T10:00:00Z",
      updated_at: "2023-01-01T10:00:00Z",
    },
    {
      id: "task2",
      title: "Task 2",
      description: "Description 2",
      status: "pending",
      priority: "medium",
      category_id: mockCategory.id,
      category: mockCategory,
      user_id: "user123",
      due_date: null,
      created_at: "2023-01-01T10:00:00Z",
      updated_at: "2023-01-01T10:00:00Z",
    },
    {
      id: "task3",
      title: "Task 3",
      description: "Description 3",
      status: "pending",
      priority: "medium",
      category_id: mockCategory.id,
      category: mockCategory,
      user_id: "user123",
      due_date: null,
      created_at: "2023-01-01T10:00:00Z",
      updated_at: "2023-01-01T10:00:00Z",
    },
  ];

  beforeEach(() => {
    mockUsePendingTasksByCategory.mockReturnValue({
      data: mockTasks,
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isLoadingError: false,
      isRefetchError: false,
      isSuccess: true,
      status: "success",
      fetchStatus: "idle",
      refetch: jest.fn(),
      remove: jest.fn(),
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isInitialLoading: false,
      isPlaceholderData: false,
      isPreviousData: false,
      isRefetching: false,
      isStale: false,
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders "Select a Task" title', () => {
    render(
      <TaskPicker
        categoryId="cat1"
        assignedTaskIds={[]}
        onSelectTask={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText("Select a Task")).toBeInTheDocument();
  });

  it("displays available tasks, excluding assigned ones", async () => {
    render(
      <TaskPicker
        categoryId="cat1"
        assignedTaskIds={["task1"]}
        onSelectTask={jest.fn()}
        onClose={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Task 2")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText("Task 3")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.queryByText("Task 1")).not.toBeInTheDocument();
    });
  });

  it("calls onSelectTask when a task is clicked", async () => {
    const handleSelectTask = jest.fn();
    render(
      <TaskPicker
        categoryId="cat1"
        assignedTaskIds={[]}
        onSelectTask={handleSelectTask}
        onClose={jest.fn()}
      />
    );

    fireEvent.click(screen.getByText("Task 1"));
    expect(handleSelectTask).toHaveBeenCalledWith(mockTasks[0]);
  });

  it("calls onClose when the close button is clicked", () => {
    const handleClose = jest.fn();
    render(
      <TaskPicker
        categoryId="cat1"
        assignedTaskIds={[]}
        onSelectTask={jest.fn()}
        onClose={handleClose}
      />
    );

    fireEvent.click(screen.getByText("Close"));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when clicking outside the modal", () => {
    const handleClose = jest.fn();
    render(
      <TaskPicker
        categoryId="cat1"
        assignedTaskIds={[]}
        onSelectTask={jest.fn()}
        onClose={handleClose}
      />
    );

    fireEvent.click(screen.getByTestId("overlay"));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('displays "Loading tasks..." when isLoading is true', () => {
    mockUsePendingTasksByCategory.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isError: false,
      isPending: true,
      isLoadingError: false,
      isRefetchError: false,
      isSuccess: false,
      status: "pending",
      fetchStatus: "fetching",
      refetch: jest.fn(),
      remove: jest.fn(),
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isFetched: false,
      isFetchedAfterMount: false,
      isFetching: true,
      isInitialLoading: true,
      isPlaceholderData: false,
      isPreviousData: false,
      isRefetching: false,
      isStale: false,
    } as any);

    render(
      <TaskPicker
        categoryId="cat1"
        assignedTaskIds={[]}
        onSelectTask={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText("Loading tasks...")).toBeInTheDocument();
  });

  it('displays "Error loading tasks." when there is an error', () => {
    mockUsePendingTasksByCategory.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Failed to fetch"),
      isError: true,
      isPending: false,
      isLoadingError: false,
      isRefetchError: false,
      isSuccess: false,
      status: "error",
      fetchStatus: "idle",
      refetch: jest.fn(),
      remove: jest.fn(),
      dataUpdatedAt: 0,
      errorUpdatedAt: Date.now(),
      failureCount: 1,
      failureReason: new Error("Failed to fetch"),
      errorUpdateCount: 1,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isInitialLoading: false,
      isPlaceholderData: false,
      isPreviousData: false,
      isRefetching: false,
      isStale: false,
    } as any);

    render(
      <TaskPicker
        categoryId="cat1"
        assignedTaskIds={[]}
        onSelectTask={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText("Error loading tasks.")).toBeInTheDocument();
  });

  it('displays "No available tasks in this category." when no tasks are available', async () => {
    mockUsePendingTasksByCategory.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isLoadingError: false,
      isRefetchError: false,
      isSuccess: true,
      status: "success",
      fetchStatus: "idle",
      refetch: jest.fn(),
      remove: jest.fn(),
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isInitialLoading: false,
      isPlaceholderData: false,
      isPreviousData: false,
      isRefetching: false,
      isStale: false,
    } as any);

    render(
      <TaskPicker
        categoryId="cat1"
        assignedTaskIds={[]}
        onSelectTask={jest.fn()}
        onClose={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("No available tasks in this category.")
      ).toBeInTheDocument();
    });
  });
});
