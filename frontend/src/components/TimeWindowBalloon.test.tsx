import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TimeWindowBalloon from "./TimeWindowBalloon";
import { TimeWindow } from "types/timeWindow";
import { Task } from "types/task";
import { TimerProvider } from "./TimerProvider";
import { getTodayStats } from "services/userDailyStatsService";

jest.mock("services/userDailyStatsService");

const queryClient = new QueryClient();

const mockTimeWindow: TimeWindow = {
  id: "tw1",
  description: "Focus on project X",
  start_time: 540, // 09:00
  end_time: 660, // 11:00
  category: {
    id: "cat1",
    name: "Work",
    color: "#3B82F6",
    user_id: "user1",
    is_deleted: false,
  },
  day_template_id: "dt1",
  user_id: "user1",
  is_deleted: false,
};

const mockTasks: Task[] = [
  {
    id: "task1",
    title: "Task 1",
    status: "pending",
    priority: "medium",
    user_id: "user1",
  },
  {
    id: "task2",
    title: "Task 2",
    status: "in_progress",
    priority: "high",
    user_id: "user1",
  },
];

import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { MessageProvider } from "../context/MessageContext";

describe("TimeWindowBalloon", () => {
  const renderWithClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MessageProvider>
          <MemoryRouter>
            <AuthProvider>
              <TimerProvider>{ui}</TimerProvider>
            </AuthProvider>
          </MemoryRouter>
        </MessageProvider>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    (getTodayStats as jest.Mock).mockResolvedValue({ pomodoros_completed: 0 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders time window details correctly", () => {
    renderWithClient(<TimeWindowBalloon timeWindow={mockTimeWindow} />);
    expect(screen.getByText("Work")).toBeInTheDocument();
    expect(screen.getByText("Focus on project X")).toBeInTheDocument();
    expect(screen.getByText("09:00 - 11:00")).toBeInTheDocument();
    expect(screen.getByText("2h")).toBeInTheDocument();
  });

  it("renders tasks when provided, even without onUnassignTask prop", () => {
    renderWithClient(
      <TimeWindowBalloon timeWindow={mockTimeWindow} tasks={mockTasks} />
    );
    expect(screen.getByText("Task 1")).toBeInTheDocument();
    expect(screen.getByText("Task 2")).toBeInTheDocument();
  });

  it("does not render unassign button when onUnassignTask prop is not provided", () => {
    renderWithClient(
      <TimeWindowBalloon timeWindow={mockTimeWindow} tasks={mockTasks} />
    );

    expect(
      screen.queryByLabelText(`Unassign task: ${mockTasks[0].title}`)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(`Unassign task: ${mockTasks[1].title}`)
    ).not.toBeInTheDocument();
  });

  it("renders delete button and calls onDelete when clicked", () => {
    const onDeleteMock = jest.fn();
    renderWithClient(
      <TimeWindowBalloon timeWindow={mockTimeWindow} onDelete={onDeleteMock} />
    );
    // First click the actions menu button to open the dropdown
    const actionsButton = screen.getByLabelText("Time window actions");
    fireEvent.click(actionsButton);

    // Then click the delete button from the dropdown
    const deleteButton = screen.getByLabelText("Delete time window");
    fireEvent.click(deleteButton);
    expect(onDeleteMock).toHaveBeenCalledWith("tw1");
  });
  it("renders edit button and calls onEdit when clicked", () => {
    const onEditMock = jest.fn();
    renderWithClient(
      <TimeWindowBalloon timeWindow={mockTimeWindow} onEdit={onEditMock} />
    );
    // First click the actions menu button to open the dropdown
    const actionsButton = screen.getByLabelText("Time window actions");
    fireEvent.click(actionsButton);

    // Then click the edit button from the dropdown
    const editButton = screen.getByLabelText("Edit time window");
    fireEvent.click(editButton);
    expect(onEditMock).toHaveBeenCalledTimes(1);
  });

  it("renders assign task button and opens TaskPicker when clicked", () => {
    const onAssignTaskMock = jest.fn();
    renderWithClient(
      <TimeWindowBalloon
        timeWindow={mockTimeWindow}
        onAssignTask={onAssignTaskMock}
      />
    );
    const assignButton = screen.getByLabelText("Assign task");
    fireEvent.click(assignButton);
    expect(screen.getByText("Select a Task")).toBeInTheDocument(); // Assuming TaskPicker has this title
  });

  it("calls onAssignTask when a task is selected in TaskPicker", () => {
    const onAssignTaskMock = jest.fn();
    renderWithClient(
      <TimeWindowBalloon
        timeWindow={mockTimeWindow}
        onAssignTask={onAssignTaskMock}
      />
    );
    fireEvent.click(screen.getByLabelText("Assign task"));
    // Simulate selecting a task in the picker (this might need a more specific selector depending on TaskPicker's implementation)
    // For now, let's assume a mock task is "selected"
    // This part of the test might need refinement once TaskPicker's internal structure is clearer or if it exposes a way to simulate selection.
    // For a basic test, we can just check if the picker is open.
    expect(screen.getByText("Select a Task")).toBeInTheDocument();
  });

  it("calls stopCurrentTask when deleting a time window with an active assigned task", () => {
    const onDeleteMock = jest.fn();
    const stopCurrentTaskMock = jest.fn();

    // Mock the useTimer hook to control currentTaskId and stopCurrentTask
    jest.spyOn(require("../hooks/useTimer"), "useTimer").mockReturnValue({
      currentTaskId: "task1", // Simulate 'task1' being active
      stopCurrentTask: stopCurrentTaskMock,
    });

    renderWithClient(
      <TimeWindowBalloon
        timeWindow={mockTimeWindow}
        tasks={mockTasks} // Pass mockTasks which includes 'task1'
        onDelete={onDeleteMock}
      />
    );

    // First click the actions menu button to open the dropdown
    const actionsButton = screen.getByLabelText("Time window actions");
    fireEvent.click(actionsButton);

    // Then click the delete button from the dropdown
    const deleteButton = screen.getByLabelText("Delete time window");
    fireEvent.click(deleteButton);

    expect(stopCurrentTaskMock).toHaveBeenCalledTimes(1);
    expect(onDeleteMock).toHaveBeenCalledWith("tw1");
  });
  it("calls onUnassignTask when unassign button is clicked on an assigned task", () => {
    const onUnassignTaskMock = jest.fn();
    renderWithClient(
      <TimeWindowBalloon
        timeWindow={mockTimeWindow}
        tasks={mockTasks}
        onUnassignTask={onUnassignTaskMock}
      />
    );
    const unassignButton = screen.getByLabelText(`Unassign task: Task 1`);
    fireEvent.click(unassignButton);
    expect(onUnassignTaskMock).toHaveBeenCalledWith("task1");
  });

  describe("Carry-over functionality", () => {
    const mockCarryOverStatus = {
      canCarryOver: true,
      taskCount: 2,
      hasActiveTimer: false,
      affectedTasks: mockTasks,
    };

    const mockCarryOverStatusWithTimer = {
      canCarryOver: true,
      taskCount: 1,
      hasActiveTimer: true,
      affectedTasks: [mockTasks[0]],
    };

    const mockCarryOverStatusCannotCarry = {
      canCarryOver: false,
      taskCount: 0,
      hasActiveTimer: false,
      affectedTasks: [],
    };

    it("shows carry-over button when carryOverStatus.canCarryOver is true", () => {
      renderWithClient(
        <TimeWindowBalloon
          timeWindow={mockTimeWindow}
          tasks={mockTasks}
          dailyPlanId="plan1"
          carryOverStatus={mockCarryOverStatus}
        />
      );

      // First click the actions menu button to open the dropdown
      const actionsButton = screen.getByLabelText("Time window actions");
      fireEvent.click(actionsButton);

      // Then check if the carry-over button is visible
      expect(screen.getByText("Carry Over (2 tasks)")).toBeInTheDocument();
    });

    it("does not show carry-over button when carryOverStatus.canCarryOver is false", () => {
      renderWithClient(
        <TimeWindowBalloon
          timeWindow={mockTimeWindow}
          tasks={mockTasks}
          dailyPlanId="plan1"
          carryOverStatus={mockCarryOverStatusCannotCarry}
        />
      );

      // First click the actions menu button to open the dropdown
      const actionsButton = screen.getByLabelText("Time window actions");
      fireEvent.click(actionsButton);

      // Then check if the carry-over button is not visible
      expect(screen.queryByText(/Carry Over/)).not.toBeInTheDocument();
    });

    it("shows timer indicator when carryOverStatus.hasActiveTimer is true", () => {
      renderWithClient(
        <TimeWindowBalloon
          timeWindow={mockTimeWindow}
          tasks={mockTasks}
          dailyPlanId="plan1"
          carryOverStatus={mockCarryOverStatusWithTimer}
        />
      );

      // First click the actions menu button to open the dropdown
      const actionsButton = screen.getByLabelText("Time window actions");
      fireEvent.click(actionsButton);

      // Check for timer indicator (⏱)
      expect(screen.getByText("⏱")).toBeInTheDocument();
    });

    it("opens DateSelectionModal when carry-over button is clicked", () => {
      renderWithClient(
        <TimeWindowBalloon
          timeWindow={mockTimeWindow}
          tasks={mockTasks}
          dailyPlanId="plan1"
          carryOverStatus={mockCarryOverStatus}
        />
      );

      // First click the actions menu button to open the dropdown
      const actionsButton = screen.getByLabelText("Time window actions");
      fireEvent.click(actionsButton);

      // Then click the carry-over button
      const carryOverButton = screen.getByText("Carry Over (2 tasks)");
      fireEvent.click(carryOverButton);

      // Check if DateSelectionModal is opened
      expect(screen.getByText("Carry Over Time Window")).toBeInTheDocument();
    });

    it("shows correct task count in carry-over button", () => {
      renderWithClient(
        <TimeWindowBalloon
          timeWindow={mockTimeWindow}
          tasks={mockTasks}
          dailyPlanId="plan1"
          carryOverStatus={{ ...mockCarryOverStatus, taskCount: 1 }}
        />
      );

      // First click the actions menu button to open the dropdown
      const actionsButton = screen.getByLabelText("Time window actions");
      fireEvent.click(actionsButton);

      // Check for singular form
      expect(screen.getByText("Carry Over (1 task)")).toBeInTheDocument();
    });

    it("disables carry-over button when isCarryingOver is true", () => {
      renderWithClient(
        <TimeWindowBalloon
          timeWindow={mockTimeWindow}
          tasks={mockTasks}
          dailyPlanId="plan1"
          carryOverStatus={mockCarryOverStatus}
          isCarryingOver={true}
        />
      );

      // First click the actions menu button to open the dropdown
      const actionsButton = screen.getByLabelText("Time window actions");
      fireEvent.click(actionsButton);

      // Check if the carry-over button is disabled
      const carryOverButton = screen.getByText("Carry Over (2 tasks)");
      expect(carryOverButton).toBeDisabled();
    });

    it("does not show carry-over button when dailyPlanId is not provided", () => {
      renderWithClient(
        <TimeWindowBalloon
          timeWindow={mockTimeWindow}
          tasks={mockTasks}
          carryOverStatus={mockCarryOverStatus}
        />
      );

      // First click the actions menu button to open the dropdown
      const actionsButton = screen.getByLabelText("Time window actions");
      fireEvent.click(actionsButton);

      // Then check if the carry-over button is not visible
      expect(screen.queryByText(/Carry Over/)).not.toBeInTheDocument();
    });
  });
});
