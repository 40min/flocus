import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PomodoroTimer from "../PomodoroTimer";
import { useTimer } from "../../hooks/useTimer";

// Mock the useTimer hook
jest.mock("../../hooks/useTimer");

const mockUseTimer = useTimer as jest.MockedFunction<typeof useTimer>;

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

describe("PomodoroTimer - Task Display Integration", () => {
  const mockTimerData = {
    timeRemaining: 1500, // 25 minutes
    isActive: false,
    pomodorosCompleted: 2,
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
    timerColor: "border-primary-DEFAULT",
    currentTaskName: "",
    currentTaskDescription: "",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows task name and description when a task is active", () => {
    mockUseTimer.mockReturnValue({
      ...mockTimerData,
      currentTaskName: "Complete project documentation",
      currentTaskDescription: "Write comprehensive docs for the new feature",
    });

    render(<PomodoroTimer />, { wrapper: createWrapper() });

    expect(
      screen.getByText("Complete project documentation")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Write comprehensive docs for the new feature")
    ).toBeInTheDocument();
  });

  it('shows "Drag a task here to start focusing" when no task is selected', () => {
    mockUseTimer.mockReturnValue(mockTimerData);

    render(<PomodoroTimer />, { wrapper: createWrapper() });

    expect(
      screen.getByText("Drag a task here to start focusing")
    ).toBeInTheDocument();
  });

  it("shows correct button state and colors when timer is active", () => {
    mockUseTimer.mockReturnValue({
      ...mockTimerData,
      isActive: true,
      currentTaskName: "Test Task",
    });

    render(<PomodoroTimer />, { wrapper: createWrapper() });

    const button = screen.getByRole("button", { name: /pause timer/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-red-500");
    expect(screen.getByText("Pause")).toBeInTheDocument();
  });

  it("shows correct button state when timer is paused", () => {
    mockUseTimer.mockReturnValue({
      ...mockTimerData,
      isActive: false,
      currentTaskName: "Test Task",
    });

    render(<PomodoroTimer />, { wrapper: createWrapper() });

    const button = screen.getByRole("button", { name: /start timer/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-green-500");
    expect(screen.getByText("Start")).toBeInTheDocument();
  });

  it("disables start button when no task is selected", () => {
    mockUseTimer.mockReturnValue(mockTimerData);

    render(<PomodoroTimer />, { wrapper: createWrapper() });

    const button = screen.getByRole("button", { name: /start timer/i });
    expect(button).toBeDisabled();
  });

  it("shows task status indicator when task is active", () => {
    mockUseTimer.mockReturnValue({
      ...mockTimerData,
      isActive: true,
      currentTaskName: "Test Task",
    });

    render(<PomodoroTimer />, { wrapper: createWrapper() });

    expect(screen.getByText("● In Progress")).toBeInTheDocument();
  });

  it("shows paused status when task is selected but timer is not active", () => {
    mockUseTimer.mockReturnValue({
      ...mockTimerData,
      isActive: false,
      currentTaskName: "Test Task",
    });

    render(<PomodoroTimer />, { wrapper: createWrapper() });

    expect(screen.getByText("● Paused")).toBeInTheDocument();
  });
});
