import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import PomodoroTimer from "./PomodoroTimer";
import { useTimer } from "../hooks/useTimer";

// Mock the useTimer hook
jest.mock("../hooks/useTimer", () => ({
  useTimer: jest.fn(),
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
    modeText: {
      work: "Focus",
      shortBreak: "Short Break",
      longBreak: "Long Break",
    },
    currentTaskId: undefined,
    onTaskComplete: undefined,
    setCurrentTaskId: jest.fn(),
    setOnTaskComplete: jest.fn(),
  };

  beforeEach(() => {
    mockUseTimer.mockReturnValue(mockContextValue);
    jest.clearAllMocks();
  });

  it("renders initial state from context", () => {
    render(<PomodoroTimer />);
    expect(screen.getByText("25:00")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument();
    expect(screen.getByText("Completed: 0")).toBeInTheDocument();
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
    render(<PomodoroTimer />);
    fireEvent.click(screen.getByLabelText("Reset timer"));
    expect(mockContextValue.handleReset).toHaveBeenCalledTimes(1);
  });

  it("calls handleSkip when skip button is clicked", () => {
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

    expect(screen.getByText("Completed: 1")).toBeInTheDocument();
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

    expect(screen.getByText(taskName)).toBeInTheDocument();

    // The description is rendered in the timer circle
    const descriptionElements = screen.getAllByText(taskDescription);
    expect(descriptionElements).toHaveLength(1);

    // For longer descriptions, there should be a "Full Description:" label
    // But this description is short, so it won't show the full description section
  });

  it("does not display the task description section when no description is provided", () => {
    mockUseTimer.mockReturnValue({
      ...mockContextValue,
      currentTaskName: "A task without description",
      currentTaskDescription: undefined,
    });

    render(<PomodoroTimer />);

    expect(screen.getByText("A task without description")).toBeInTheDocument();
    expect(screen.queryByText("Full Description:")).not.toBeInTheDocument();
  });

  it("displays full description section for long descriptions", () => {
    const longDescription =
      "This is a very long description that exceeds 50 characters and should trigger the full description section to appear below the timer.";
    mockUseTimer.mockReturnValue({
      ...mockContextValue,
      currentTaskName: "Task with long description",
      currentTaskDescription: longDescription,
    });

    render(<PomodoroTimer />);

    expect(screen.getByText("Full Description:")).toBeInTheDocument();
    // Use getAllByText since the description appears in multiple places
    const descriptionElements = screen.getAllByText(longDescription);
    expect(descriptionElements.length).toBeGreaterThan(0);
  });

  it("renders markdown content in the task description", () => {
    const markdownDescription =
      "A very long description with a [link](http://example.com) and **bold text** that exceeds fifty characters.";
    mockUseTimer.mockReturnValue({
      ...mockContextValue,
      currentTaskDescription: markdownDescription,
    });

    render(<PomodoroTimer />);

    // Check for the link
    const links = screen.getAllByRole("link", { name: /link/i });
    expect(links.length).toBe(1);
    expect(links[0]).toHaveAttribute("href", "http://example.com");

    // Check for the bold text
    const boldElements = screen.getAllByText("bold text");
    expect(boldElements.length).toBe(1);
    expect(boldElements[0].tagName).toBe("STRONG"); // Assuming ReactMarkdown renders bold as <strong>
  });
});
