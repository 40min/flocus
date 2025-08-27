import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TaskItem from "./TaskItem";
import { Task } from "../types/task";
import * as taskService from "../services/taskService";
import { MessageProvider } from "../context/MessageContext";

// Mock the task service
jest.mock("../services/taskService");
const mockedTaskService = taskService as jest.Mocked<typeof taskService>;

describe("TaskItem Integration Tests", () => {
  let queryClient: QueryClient;

  const mockTask: Task = {
    id: "task1",
    title: "Integration Test Task",
    status: "pending",
    priority: "medium",
    user_id: "user1",
    statistics: {
      lasts_minutes: 45,
    },
  };

  const mockProps = {
    task: mockTask,
    baseBgColor: "bg-blue-100",
    baseBorderColor: "border-blue-200",
    baseTextColor: "text-blue-800",
    hoverBgColor: "hover:bg-blue-200",
    hoverBorderColor: "hover:border-blue-300",
    hoverShadowColor: "hover:shadow-blue-500/20",
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Reset all mocks
    jest.clearAllMocks();

    // Mock successful API responses
    mockedTaskService.updateTask.mockResolvedValue({
      ...mockTask,
      status: "in_progress",
    });
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MessageProvider>{component}</MessageProvider>
      </QueryClientProvider>
    );
  };

  it("renders task with working time and action buttons", () => {
    renderWithQueryClient(
      <TaskItem {...mockProps} showWorkingTime={true} showActions={true} />
    );

    expect(screen.getByText("Integration Test Task")).toBeInTheDocument();
    expect(screen.getByText("45m")).toBeInTheDocument();
    expect(screen.getByText("Start")).toBeInTheDocument();
    expect(screen.getByText("+15m")).toBeInTheDocument();
  });

  it("buttons are clickable and component handles clicks", async () => {
    renderWithQueryClient(<TaskItem {...mockProps} showActions={true} />);

    // Verify buttons exist and are clickable
    const startButton = screen.getByText("Start");
    const addTimeButton = screen.getByText("+15m");

    expect(startButton).toBeInTheDocument();
    expect(addTimeButton).toBeInTheDocument();

    // Click buttons - should not throw errors
    fireEvent.click(startButton);
    fireEvent.click(addTimeButton);

    // Component should still be rendered after clicks
    expect(screen.getByText("Integration Test Task")).toBeInTheDocument();
  });

  it("uses callback functions when provided", () => {
    const mockOnStatusChange = jest.fn();
    const mockOnWorkingTimeChange = jest.fn();

    renderWithQueryClient(
      <TaskItem
        {...mockProps}
        showActions={true}
        onStatusChange={mockOnStatusChange}
        onWorkingTimeChange={mockOnWorkingTimeChange}
      />
    );

    // Click Start button
    fireEvent.click(screen.getByText("Start"));
    expect(mockOnStatusChange).toHaveBeenCalledWith("task1", "in_progress");

    // Click +15m button
    fireEvent.click(screen.getByText("+15m"));
    expect(mockOnWorkingTimeChange).toHaveBeenCalledWith("task1", 15);
  });

  it("shows different button text for in_progress task", () => {
    const inProgressTask = { ...mockTask, status: "in_progress" as const };

    renderWithQueryClient(
      <TaskItem {...mockProps} task={inProgressTask} showActions={true} />
    );

    expect(screen.getByText("Stop")).toBeInTheDocument();
  });

  it("handles real-world component structure properly", () => {
    renderWithQueryClient(
      <TaskItem {...mockProps} showWorkingTime={true} showActions={true} />
    );

    // Verify all elements are present in proper structure
    expect(
      screen.getByLabelText("Task: Integration Test Task")
    ).toBeInTheDocument();
    expect(screen.getByText("45m")).toBeInTheDocument();
    expect(screen.getByText("Start")).toBeInTheDocument();
    expect(screen.getByText("+15m")).toBeInTheDocument();

    // All required elements are present and component renders without errors
    expect(screen.getByText("Integration Test Task")).toBeInTheDocument();
  });
});
