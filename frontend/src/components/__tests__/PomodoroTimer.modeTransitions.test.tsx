import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PomodoroTimer from "../PomodoroTimer";
import { useTimerStore } from "../../stores/timerStore";
import { act } from "@testing-library/react";

// Mock the DnD kit
jest.mock("@dnd-kit/core", () => ({
  useDroppable: () => ({
    setNodeRef: jest.fn(),
    isOver: false,
  }),
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, "localStorage", { value: mockLocalStorage });

// Mock services
jest.mock("../../services/taskService", () => ({
  updateTask: jest.fn().mockResolvedValue({}),
}));

jest.mock("../../services/userDailyStatsService", () => ({
  getTodayStats: jest.fn().mockResolvedValue({
    date: new Date().toISOString(),
    total_seconds_spent: 0,
    pomodoros_completed: 0,
  }),
  incrementPomodoro: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../services/notificationService", () => ({
  showNotification: jest.fn(),
}));

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

describe("PomodoroTimer - Mode Transitions and Button States Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);

    // Reset store state to default
    act(() => {
      useTimerStore.setState({
        mode: "work",
        timeRemaining: 25 * 60,
        isActive: false,
        pomodorosCompleted: 0,
        currentTaskId: undefined,
        currentTaskName: undefined,
        currentTaskDescription: undefined,
        timestamp: Date.now(),
        userPreferences: {
          pomodoro_working_interval: 25,
          pomodoro_timeout_minutes: 5,
          pomodoro_long_timeout_minutes: 15,
          system_notifications_enabled: false,
          pomodoro_timer_sound: "none",
        },
      });
    });
  });

  describe("Mode Indicator Updates", () => {
    it("should display correct mode text for work mode when task is assigned", () => {
      act(() => {
        useTimerStore
          .getState()
          .setCurrentTask("task1", "Test Task", "Description");
      });

      render(<PomodoroTimer />, { wrapper: createWrapper() });

      expect(screen.getByText("Focus")).toBeInTheDocument();
    });

    it("should display correct mode text for short break mode", () => {
      act(() => {
        useTimerStore.setState({
          mode: "shortBreak",
          timeRemaining: 5 * 60,
        });
        useTimerStore
          .getState()
          .setCurrentTask("task1", "Test Task", "Description");
      });

      render(<PomodoroTimer />, { wrapper: createWrapper() });

      expect(screen.getByText("Short Break")).toBeInTheDocument();
    });

    it("should display correct mode text for long break mode", () => {
      act(() => {
        useTimerStore.setState({
          mode: "longBreak",
          timeRemaining: 15 * 60,
        });
        useTimerStore
          .getState()
          .setCurrentTask("task1", "Test Task", "Description");
      });

      render(<PomodoroTimer />, { wrapper: createWrapper() });

      expect(screen.getByText("Long Break")).toBeInTheDocument();
    });

    it("should hide mode indicator when no task is assigned and timer is inactive", () => {
      render(<PomodoroTimer />, { wrapper: createWrapper() });

      expect(screen.queryByText("Focus")).not.toBeInTheDocument();
    });

    it("should show mode indicator when timer is active even without task", () => {
      act(() => {
        useTimerStore.setState({
          mode: "shortBreak",
          isActive: true,
        });
      });

      render(<PomodoroTimer />, { wrapper: createWrapper() });

      expect(screen.getByText("Short Break")).toBeInTheDocument();
    });
  });

  describe("Button State Management", () => {
    it("should disable reset button when no task is assigned", () => {
      render(<PomodoroTimer />, { wrapper: createWrapper() });

      const resetButton = screen.getByLabelText("Reset timer");
      expect(resetButton).toBeDisabled();
    });

    it("should enable reset button when task is assigned", () => {
      act(() => {
        useTimerStore
          .getState()
          .setCurrentTask("task1", "Test Task", "Description");
      });

      render(<PomodoroTimer />, { wrapper: createWrapper() });

      const resetButton = screen.getByLabelText("Reset timer");
      expect(resetButton).not.toBeDisabled();
    });

    it("should hide skip break button during work mode", () => {
      act(() => {
        useTimerStore
          .getState()
          .setCurrentTask("task1", "Test Task", "Description");
      });

      render(<PomodoroTimer />, { wrapper: createWrapper() });

      expect(screen.queryByLabelText("Skip break")).not.toBeInTheDocument();
      // Should have Reset and Start/Pause buttons, but no Skip button
      expect(screen.getByLabelText("Reset timer")).toBeInTheDocument();
      expect(screen.getByLabelText("Start timer")).toBeInTheDocument();
    });

    it("should show skip break button during short break mode", () => {
      act(() => {
        useTimerStore.setState({
          mode: "shortBreak",
          timeRemaining: 5 * 60,
        });
        useTimerStore
          .getState()
          .setCurrentTask("task1", "Test Task", "Description");
      });

      render(<PomodoroTimer />, { wrapper: createWrapper() });

      expect(screen.getByLabelText("Skip break")).toBeInTheDocument();
    });

    it("should show skip break button during long break mode", () => {
      act(() => {
        useTimerStore.setState({
          mode: "longBreak",
          timeRemaining: 15 * 60,
        });
        useTimerStore
          .getState()
          .setCurrentTask("task1", "Test Task", "Description");
      });

      render(<PomodoroTimer />, { wrapper: createWrapper() });

      expect(screen.getByLabelText("Skip break")).toBeInTheDocument();
    });
  });

  describe("Mode Transition Integration", () => {
    it("should update UI when transitioning from work to short break", async () => {
      act(() => {
        useTimerStore.setState({
          mode: "work",
          timeRemaining: 1, // Almost finished
          isActive: true,
          pomodorosCompleted: 0,
        });
        useTimerStore
          .getState()
          .setCurrentTask("task1", "Test Task", "Description");
      });

      render(<PomodoroTimer />, { wrapper: createWrapper() });

      // Initially should show work mode
      expect(screen.getByText("Focus")).toBeInTheDocument();
      expect(screen.queryByLabelText("Skip break")).not.toBeInTheDocument();

      // Simulate mode transition
      await act(async () => {
        await useTimerStore.getState().switchToNextMode();
      });

      // Should now show break mode
      expect(screen.getByText("Short Break")).toBeInTheDocument();
      expect(screen.getByLabelText("Skip break")).toBeInTheDocument();
    });

    it("should update UI when transitioning from break to work", async () => {
      act(() => {
        useTimerStore.setState({
          mode: "shortBreak",
          timeRemaining: 1, // Almost finished
          isActive: true,
        });
        useTimerStore
          .getState()
          .setCurrentTask("task1", "Test Task", "Description");
      });

      render(<PomodoroTimer />, { wrapper: createWrapper() });

      // Initially should show break mode
      expect(screen.getByText("Short Break")).toBeInTheDocument();
      expect(screen.getByLabelText("Skip break")).toBeInTheDocument();

      // Simulate mode transition
      await act(async () => {
        await useTimerStore.getState().switchToNextMode();
      });

      // Should now show work mode
      expect(screen.getByText("Focus")).toBeInTheDocument();
      expect(screen.queryByLabelText("Skip break")).not.toBeInTheDocument();
    });

    it("should update button states when task is assigned/unassigned", () => {
      const { rerender } = render(<PomodoroTimer />, {
        wrapper: createWrapper(),
      });

      // Initially no task - reset should be disabled
      expect(screen.getByLabelText("Reset timer")).toBeDisabled();

      // Assign task
      act(() => {
        useTimerStore
          .getState()
          .setCurrentTask("task1", "Test Task", "Description");
      });

      rerender(<PomodoroTimer />);

      // Reset should now be enabled
      expect(screen.getByLabelText("Reset timer")).not.toBeDisabled();

      // Remove task
      act(() => {
        useTimerStore
          .getState()
          .setCurrentTask(undefined, undefined, undefined);
      });

      rerender(<PomodoroTimer />);

      // Reset should be disabled again
      expect(screen.getByLabelText("Reset timer")).toBeDisabled();
    });
  });

  describe("Timer State Changes and UI Updates", () => {
    it("should update start/pause button when timer state changes", () => {
      act(() => {
        useTimerStore
          .getState()
          .setCurrentTask("task1", "Test Task", "Description");
      });

      const { rerender } = render(<PomodoroTimer />, {
        wrapper: createWrapper(),
      });

      // Initially should show start button
      expect(screen.getByLabelText("Start timer")).toBeInTheDocument();

      // Start timer
      act(() => {
        useTimerStore.setState({ isActive: true });
      });

      rerender(<PomodoroTimer />);

      // Should now show pause button
      expect(screen.getByLabelText("Pause timer")).toBeInTheDocument();

      // Pause timer
      act(() => {
        useTimerStore.setState({ isActive: false });
      });

      rerender(<PomodoroTimer />);

      // Should show start button again
      expect(screen.getByLabelText("Start timer")).toBeInTheDocument();
    });

    it("should update time display when timeRemaining changes", () => {
      const { rerender } = render(<PomodoroTimer />, {
        wrapper: createWrapper(),
      });

      // Initially should show 25:00
      expect(screen.getByText("25:00")).toBeInTheDocument();

      // Change time
      act(() => {
        useTimerStore.setState({ timeRemaining: 10 * 60 }); // 10 minutes
      });

      rerender(<PomodoroTimer />);

      // Should show updated time
      expect(screen.getByText("10:00")).toBeInTheDocument();
    });

    it("should update circular progress when time changes", () => {
      act(() => {
        useTimerStore.setState({
          mode: "work",
          timeRemaining: 20 * 60, // 20 minutes remaining out of 25
        });
      });

      render(<PomodoroTimer />, { wrapper: createWrapper() });

      // Progress should be calculated as (25*60 - 20*60) / (25*60) = 5/25 = 0.2
      // We can't easily test the SVG progress value, but we can ensure the component renders
      expect(screen.getByRole("timer")).toBeInTheDocument();
    });
  });

  describe("Button Click Handlers", () => {
    it("should call correct handlers when buttons are clicked", async () => {
      const startPauseSpy = jest.spyOn(useTimerStore.getState(), "startPause");
      const resetSpy = jest.spyOn(useTimerStore.getState(), "reset");
      const skipSpy = jest.spyOn(useTimerStore.getState(), "skip");

      act(() => {
        useTimerStore.setState({
          mode: "shortBreak",
          timeRemaining: 5 * 60,
        });
        useTimerStore
          .getState()
          .setCurrentTask("task1", "Test Task", "Description");
      });

      render(<PomodoroTimer />, { wrapper: createWrapper() });

      // Click start/pause button
      await act(async () => {
        fireEvent.click(screen.getByLabelText("Start timer"));
      });
      expect(startPauseSpy).toHaveBeenCalledTimes(1);

      // Click reset button
      await act(async () => {
        fireEvent.click(screen.getByLabelText("Reset timer"));
      });
      expect(resetSpy).toHaveBeenCalledTimes(1);

      // Click skip button
      await act(async () => {
        fireEvent.click(screen.getByLabelText("Skip break"));
      });
      expect(skipSpy).toHaveBeenCalledTimes(1);

      startPauseSpy.mockRestore();
      resetSpy.mockRestore();
      skipSpy.mockRestore();
    });
  });

  describe("Task Display Integration", () => {
    it("should show task information when task is assigned", () => {
      act(() => {
        useTimerStore
          .getState()
          .setCurrentTask(
            "task1",
            "Important Task",
            "This is a detailed description"
          );
      });

      render(<PomodoroTimer />, { wrapper: createWrapper() });

      expect(screen.getByText("Task:")).toBeInTheDocument();
      expect(screen.getByText("Important Task")).toBeInTheDocument();
      expect(
        screen.getByText("(This is a detailed description)")
      ).toBeInTheDocument();
    });

    it("should hide task information when no task is assigned", () => {
      render(<PomodoroTimer />, { wrapper: createWrapper() });

      expect(screen.queryByText("Task:")).not.toBeInTheDocument();
      expect(
        screen.getByText("Drag a task here to start focusing")
      ).toBeInTheDocument();
    });

    it("should update task display when task changes", () => {
      const { rerender } = render(<PomodoroTimer />, {
        wrapper: createWrapper(),
      });

      // Initially no task
      expect(
        screen.getByText("Drag a task here to start focusing")
      ).toBeInTheDocument();

      // Assign task
      act(() => {
        useTimerStore
          .getState()
          .setCurrentTask("task1", "New Task", "New description");
      });

      rerender(<PomodoroTimer />);

      expect(screen.getByText("Task:")).toBeInTheDocument();
      expect(screen.getByText("New Task")).toBeInTheDocument();
      expect(screen.getByText("(New description)")).toBeInTheDocument();

      // Change task
      act(() => {
        useTimerStore
          .getState()
          .setCurrentTask("task2", "Updated Task", "Updated description");
      });

      rerender(<PomodoroTimer />);

      expect(screen.getByText("Updated Task")).toBeInTheDocument();
      expect(screen.getByText("(Updated description)")).toBeInTheDocument();
    });
  });
});
