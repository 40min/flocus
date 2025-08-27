import { render, screen, fireEvent } from "@testing-library/react";
import PomodoroTimer from "./PomodoroTimer";
import { useTimer } from "../hooks/useTimer";

// Mock the useTimer hook
jest.mock("../hooks/useTimer", () => ({
  useTimer: jest.fn(),
}));

// Mock the timer store hooks
const mockUseTimerButtonStates = jest.fn();
const mockUseTimerModeText = jest.fn();
jest.mock("../stores/timerStore", () => ({
  useTimerButtonStates: () => mockUseTimerButtonStates(),
  useTimerModeText: () => mockUseTimerModeText(),
}));

const mockUseTimer = useTimer as jest.Mock;

describe("PomodoroTimer", () => {
  const mockContextValue = {
    mode: "work",
    timeRemaining: 25 * 60,
    isActive: false,
    pomodorosCompleted: 0,
    handleStartPause: jest.fn(),
    handleReset: jest.fn(),
    handleSkip: jest.fn(),
    formatTime: (seconds: number) => {
      const mins = Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0");
      const secs = (seconds % 60).toString().padStart(2, "0");
      return `${mins}:${secs}`;
    },
    isBreak: false,
    timerColor: "border-gray-700",
    buttonBgColor: "bg-white hover:bg-gray-200",
    buttonTextColor: "text-gray-900",
    currentTaskId: undefined,
    onTaskComplete: undefined,
    setCurrentTaskId: jest.fn(),
    setOnTaskComplete: jest.fn(),
    // Loading states for API calls
    isUpdatingTaskStatus: false,
    isUpdatingWorkingTime: false,
    isUpdating: false,
  };

  beforeEach(() => {
    mockUseTimer.mockReturnValue(mockContextValue);
    // Default button states for work mode
    mockUseTimerButtonStates.mockReturnValue({
      resetDisabled: true, // Disabled when no task is assigned
      skipBreakVisible: false, // Hidden during work mode
    });
    // Default mode text
    mockUseTimerModeText.mockReturnValue("Focus");
    jest.clearAllMocks();
  });

  it("renders initial state from context", () => {
    render(<PomodoroTimer />);
    expect(screen.getByText("25:00")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument();
    // Pomos Done is now in the top right corner (DailyStats), not in the timer panel
    expect(screen.queryByText("Pomos Done: 0")).not.toBeInTheDocument();
  });

  it("calls handleStartPause when start/pause button is clicked", () => {
    // Add a task so the start button is enabled
    mockUseTimer.mockReturnValue({
      ...mockContextValue,
      currentTaskName: "Test Task",
    });

    render(<PomodoroTimer />);
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(mockContextValue.handleStartPause).toHaveBeenCalledTimes(1);
  });

  it("calls handleReset when reset button is clicked", () => {
    // Enable reset button by having a task assigned
    mockUseTimerButtonStates.mockReturnValue({
      resetDisabled: false,
      skipBreakVisible: false,
    });

    render(<PomodoroTimer />);
    fireEvent.click(screen.getByLabelText("Reset timer"));
    expect(mockContextValue.handleReset).toHaveBeenCalledTimes(1);
  });

  it("calls handleSkip when skip button is clicked", () => {
    // Mock break mode to make skip button visible and enabled
    mockUseTimer.mockReturnValue({
      ...mockContextValue,
      mode: "shortBreak",
      isBreak: true,
      isActive: true,
    });

    mockUseTimerButtonStates.mockReturnValue({
      resetDisabled: false,
      skipBreakVisible: true, // Visible during break mode
    });

    render(<PomodoroTimer />);
    fireEvent.click(screen.getByLabelText("Skip break"));
    expect(mockContextValue.handleSkip).toHaveBeenCalledTimes(1);
  });

  it("displays pause button when timer is active from context", () => {
    mockUseTimer.mockReturnValue({
      ...mockContextValue,
      isActive: true,
    });
    render(<PomodoroTimer />);
    expect(screen.getByRole("button", { name: /pause/i })).toBeInTheDocument();
  });

  it("displays correct time and mode based on context", () => {
    mockUseTimer.mockReturnValue({
      ...mockContextValue,
      mode: "shortBreak",
      timeRemaining: 5 * 60,
      pomodorosCompleted: 1,
    });
    render(<PomodoroTimer />);
    expect(screen.getByText("05:00")).toBeInTheDocument();

    // Pomos Done is now in the top right corner (DailyStats), not in the timer panel
    expect(screen.queryByText("Pomos Done: 1")).not.toBeInTheDocument();
  });

  it("displays the task name and description when provided", () => {
    const taskName = "My Test Task";
    const taskDescription = "This is a detailed description of my test task.";
    mockUseTimer.mockReturnValue({
      ...mockContextValue,
      currentTaskName: taskName,
      currentTaskDescription: taskDescription,
    });

    render(<PomodoroTimer />);

    expect(screen.getByText("Task:")).toBeInTheDocument();
    expect(screen.getByText(taskName)).toBeInTheDocument();
    expect(screen.getByText(`(${taskDescription})`)).toBeInTheDocument();
  });

  it("does not display the task description section when no description is provided", () => {
    mockUseTimer.mockReturnValue({
      ...mockContextValue,
      currentTaskName: "A task without description",
      currentTaskDescription: undefined,
    });

    render(<PomodoroTimer />);

    expect(screen.getByText("Task:")).toBeInTheDocument();
    expect(screen.getByText("A task without description")).toBeInTheDocument();
    // No parentheses should be shown when there's no description
    expect(screen.queryByText(/\(/)).not.toBeInTheDocument();
  });

  it("displays long descriptions in parentheses format", () => {
    const longDescription =
      "This is a very long description that exceeds 50 characters and should appear in parentheses.";
    mockUseTimer.mockReturnValue({
      ...mockContextValue,
      currentTaskName: "Task with long description",
      currentTaskDescription: longDescription,
    });

    render(<PomodoroTimer />);

    expect(screen.getByText("Task:")).toBeInTheDocument();
    expect(screen.getByText("Task with long description")).toBeInTheDocument();
    expect(screen.getByText(`(${longDescription})`)).toBeInTheDocument();
  });

  it("displays markdown content as plain text in parentheses", () => {
    const markdownDescription =
      "A description with [link](http://example.com) and **bold text**.";
    mockUseTimer.mockReturnValue({
      ...mockContextValue,
      currentTaskName: "Task with markdown",
      currentTaskDescription: markdownDescription,
    });

    render(<PomodoroTimer />);

    expect(screen.getByText("Task:")).toBeInTheDocument();
    expect(screen.getByText("Task with markdown")).toBeInTheDocument();
    // Markdown is displayed as plain text in parentheses now
    expect(screen.getByText(`(${markdownDescription})`)).toBeInTheDocument();
  });

  it("enables start button during break mode", () => {
    mockUseTimer.mockReturnValue({
      ...mockContextValue,
      mode: "shortBreak",
      isBreak: true,
      currentTaskName: "Test Task", // Task is assigned and we can start break timer
    });

    render(<PomodoroTimer />);

    const startButton = screen.getByRole("button", { name: /start/i });
    expect(startButton).not.toBeDisabled();
  });

  it("enables start button when not in break mode and task is assigned", () => {
    mockUseTimer.mockReturnValue({
      ...mockContextValue,
      mode: "work",
      isBreak: false,
      currentTaskName: "Test Task",
    });

    render(<PomodoroTimer />);

    const startButton = screen.getByRole("button", { name: /start/i });
    expect(startButton).not.toBeDisabled();
  });

  describe("Mode Indicator", () => {
    it("displays mode indicator when timer is active", () => {
      mockUseTimer.mockReturnValue({
        ...mockContextValue,
        isActive: true,
      });
      mockUseTimerModeText.mockReturnValue("Focus");

      render(<PomodoroTimer />);

      expect(screen.getByText("Focus")).toBeInTheDocument();
    });

    it("displays mode indicator when task is assigned", () => {
      mockUseTimer.mockReturnValue({
        ...mockContextValue,
        isActive: false,
        currentTaskName: "Test Task",
      });
      mockUseTimerModeText.mockReturnValue("Focus");

      render(<PomodoroTimer />);

      expect(screen.getByText("Focus")).toBeInTheDocument();
    });

    it("does not display mode indicator when timer is idle and no task assigned", () => {
      mockUseTimer.mockReturnValue({
        ...mockContextValue,
        isActive: false,
        currentTaskName: undefined,
      });
      mockUseTimerModeText.mockReturnValue("Focus");

      render(<PomodoroTimer />);

      expect(screen.queryByText("Focus")).not.toBeInTheDocument();
    });

    it("displays correct mode text for short break", () => {
      mockUseTimer.mockReturnValue({
        ...mockContextValue,
        mode: "shortBreak",
        isBreak: true,
        isActive: true,
      });
      mockUseTimerModeText.mockReturnValue("Short Break");

      render(<PomodoroTimer />);

      expect(screen.getByText("Short Break")).toBeInTheDocument();
    });

    it("displays correct mode text for long break", () => {
      mockUseTimer.mockReturnValue({
        ...mockContextValue,
        mode: "longBreak",
        isBreak: true,
        isActive: true,
      });
      mockUseTimerModeText.mockReturnValue("Long Break");

      render(<PomodoroTimer />);

      expect(screen.getByText("Long Break")).toBeInTheDocument();
    });

    it("applies correct styling for work mode", () => {
      mockUseTimer.mockReturnValue({
        ...mockContextValue,
        isActive: true,
        isBreak: false,
      });
      mockUseTimerModeText.mockReturnValue("Focus");

      render(<PomodoroTimer />);

      const modeIndicator = screen.getByText("Focus");
      expect(modeIndicator).toHaveClass("text-xs");
      expect(modeIndicator).toHaveClass("text-text-secondary/60");
      expect(modeIndicator).toHaveClass("font-normal");
    });

    it("applies correct styling for break mode", () => {
      mockUseTimer.mockReturnValue({
        ...mockContextValue,
        mode: "shortBreak",
        isActive: true,
        isBreak: true,
      });
      mockUseTimerModeText.mockReturnValue("Short Break");

      render(<PomodoroTimer />);

      const modeIndicator = screen.getByText("Short Break");
      expect(modeIndicator).toHaveClass("text-xs");
      expect(modeIndicator).toHaveClass("text-text-secondary/60");
      expect(modeIndicator).toHaveClass("font-normal");
    });
  });

  describe("Loading States", () => {
    it("shows loading spinner on start/pause button when updating task status", () => {
      mockUseTimer.mockReturnValue({
        ...mockContextValue,
        currentTaskName: "Test Task",
        isUpdatingTaskStatus: true,
      });

      render(<PomodoroTimer />);

      const startButton = screen.getByRole("button", { name: /start/i });
      expect(startButton).toBeDisabled();
      // The loading spinner should be visible in the button
      expect(screen.getByLabelText("Loading")).toBeInTheDocument();
    });

    it("shows loading indicator when updating working time", () => {
      mockUseTimer.mockReturnValue({
        ...mockContextValue,
        currentTaskName: "Test Task",
        isUpdatingWorkingTime: true,
      });

      render(<PomodoroTimer />);

      expect(screen.getByText("Saving time...")).toBeInTheDocument();
    });

    it("shows loading indicator in mode text when any update is in progress", () => {
      mockUseTimer.mockReturnValue({
        ...mockContextValue,
        currentTaskName: "Test Task",
        isActive: true,
        isUpdating: true,
      });
      mockUseTimerModeText.mockReturnValue("Focus");

      render(<PomodoroTimer />);

      expect(screen.getByText("Focus")).toBeInTheDocument();
      // Should show loading spinner next to mode text - there are multiple loading spinners, so get all
      const loadingSpinners = screen.getAllByLabelText("Loading");
      expect(loadingSpinners.length).toBeGreaterThan(0);
    });

    it("disables start/pause button during task status updates", () => {
      mockUseTimer.mockReturnValue({
        ...mockContextValue,
        currentTaskName: "Test Task",
        isUpdatingTaskStatus: true,
      });

      render(<PomodoroTimer />);

      const startButton = screen.getByRole("button", { name: /start/i });
      expect(startButton).toBeDisabled();
    });

    it("does not show loading indicators when no updates are in progress", () => {
      mockUseTimer.mockReturnValue({
        ...mockContextValue,
        currentTaskName: "Test Task",
        isUpdatingTaskStatus: false,
        isUpdatingWorkingTime: false,
        isUpdating: false,
      });

      render(<PomodoroTimer />);

      expect(screen.queryByText("Saving time...")).not.toBeInTheDocument();

      const startButton = screen.getByRole("button", { name: /start/i });
      expect(startButton).not.toBeDisabled();
    });
  });
});
