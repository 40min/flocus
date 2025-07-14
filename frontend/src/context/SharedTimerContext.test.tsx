import React, { useEffect } from "react";
import {
  render,
  screen,
  act,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import {
  SharedTimerProvider,
  useSharedTimerContext,
} from "./SharedTimerContext";
import * as notificationService from "../services/notificationService";
import { getTodayStats } from "../services/userDailyStatsService";
import { useUpdateTask } from "../hooks/useTasks";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { AuthContext, AuthContextType } from "../context/AuthContext";
import { MemoryRouter } from "react-router-dom";

jest.mock("../hooks/useTasks");
jest.mock("../services/userDailyStatsService");
jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQueryClient: jest.fn(),
}));
jest.mock("../services/notificationService", () => ({
  ...jest.requireActual("../services/notificationService"),
  showNotification: jest.fn(),
}));
const mockedShowNotification =
  notificationService.showNotification as jest.Mock;

// Mock Notification API
const mockNotification = jest.fn();
global.Notification = mockNotification as any;
global.Notification.requestPermission = jest.fn().mockImplementation(() => {
  Object.defineProperty(global.Notification, "permission", {
    value: "granted",
    writable: true,
  });
  return Promise.resolve("granted");
});

const LOCAL_STORAGE_KEY = "pomodoroTimerState";

// Test component with better error handling
interface TestComponentProps {
  resetForNewTaskMock?: jest.Mock;
  initialTaskId?: string;
  initialTaskName?: string;
  initialTaskDescription?: string;
  initialIsActive?: boolean;
}

const TestComponent: React.FC<TestComponentProps> = ({
  resetForNewTaskMock,
  initialTaskId,
  initialTaskName,
  initialTaskDescription,
  initialIsActive,
}) => {
  const {
    mode,
    currentTaskId: contextTaskId,
    currentTaskName: contextTaskName,
    currentTaskDescription: contextTaskDescription,
    timeRemaining,
    isActive,
    pomodorosCompleted,
    handleStartPause,
    handleReset,
    handleSkip,
    formatTime,
    setCurrentTaskId,
    setCurrentTaskName,
    setCurrentTaskDescription,
    resetForNewTask,
    stopCurrentTask,
    handleMarkAsDone,
    setIsActive,
  } = useSharedTimerContext();

  useEffect(() => {
    if (initialTaskId) setCurrentTaskId(initialTaskId);
    if (initialTaskName) setCurrentTaskName(initialTaskName);
    if (initialTaskDescription)
      setCurrentTaskDescription(initialTaskDescription);
    if (initialIsActive !== undefined) setIsActive(initialIsActive);
  }, [
    setCurrentTaskId,
    setCurrentTaskName,
    setCurrentTaskDescription,
    initialTaskId,
    initialTaskName,
    initialTaskDescription,
    initialIsActive,
    setIsActive,
  ]);

  return (
    <div>
      <span data-testid="current-task-id">{contextTaskId}</span>
      <span data-testid="current-task-name">{contextTaskName}</span>
      <span data-testid="current-task-description">
        {contextTaskDescription}
      </span>

      <span data-testid="formatted-time">{formatTime(timeRemaining)}</span>
      <span data-testid="mode">{mode}</span>
      <span data-testid="time-remaining">{formatTime(timeRemaining)}</span>
      <span data-testid="is-active">{isActive.toString()}</span>
      <span data-testid="pomodoros-completed">{pomodorosCompleted}</span>
      <button onClick={handleStartPause}>Start/Pause</button>
      <button onClick={handleReset}>Reset</button>
      <button onClick={handleSkip}>Skip</button>
      <button onClick={resetForNewTaskMock || resetForNewTask}>
        Reset For New Task
      </button>
      <button onClick={stopCurrentTask}>Stop Current Task</button>
      <button onClick={() => handleMarkAsDone("task-to-mark-done")}>
        Mark as Done
      </button>
    </div>
  );
};

const queryClient = new QueryClient();
const mockedUseQueryClient = useQueryClient as jest.Mock;

const defaultMockUser = {
  id: "user1",
  username: "testuser",
  email: "test@example.com",
  first_name: "Test",
  last_name: "User",
  preferences: {
    pomodoro_timeout_minutes: 5,
    pomodoro_working_interval: 25,
    system_notifications_enabled: true,
    pomodoro_long_timeout_minutes: 15,
    pomodoro_timer_sound: "none",
  },
};

// Modified renderWithProviders to accept custom authContextValue
const renderWithProviders = (
  component: React.ReactElement,
  customAuthContextValue?: Partial<AuthContextType>
) => {
  const defaultAuthContextValue: AuthContextType = {
    isAuthenticated: true,
    user: defaultMockUser,
    token: "test-token",
    login: jest.fn(),
    logout: jest.fn(),
    isLoading: false,
  };

  const authContextValue = {
    ...defaultAuthContextValue,
    ...customAuthContextValue,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthContext.Provider value={authContextValue}>
          <SharedTimerProvider>{component}</SharedTimerProvider>
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("SharedTimerContext", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    jest.clearAllMocks();
    (useUpdateTask as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({}),
    });
    (getTodayStats as jest.Mock).mockResolvedValue({ pomodoros_completed: 0 });
    mockedUseQueryClient.mockReturnValue({
      invalidateQueries: jest.fn(),
    });

    Object.defineProperty(global.Notification, "permission", {
      value: "default",
      writable: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    mockedShowNotification.mockClear();
  });

  it("provides initial timer state", async () => {
    const authContextWithNoSound = {
      user: {
        ...defaultMockUser,
        preferences: {
          ...defaultMockUser.preferences,
          pomodoro_timer_sound: "none",
          system_notifications_enabled: false,
        },
      },
    };
    renderWithProviders(<TestComponent />, authContextWithNoSound);

    expect(screen.getByTestId("mode")).toHaveTextContent("work");
    expect(screen.getByTestId("time-remaining")).toHaveTextContent("25:00");
    expect(screen.getByTestId("is-active")).toHaveTextContent("false");
    expect(screen.getByTestId("pomodoros-completed")).toHaveTextContent("0");
    expect(screen.getByTestId("current-task-id")).toHaveTextContent("");
    expect(screen.getByTestId("current-task-name")).toHaveTextContent("");
    expect(screen.getByTestId("current-task-description")).toHaveTextContent(
      ""
    );
  });

  it("throws an error if useSharedTimerContext is used outside SharedTimerProvider", () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(() => render(<TestComponent />)).toThrow(
      "useSharedTimerContext must be used within a SharedTimerProvider"
    );
    consoleSpy.mockRestore();
  });

  it("starts and pauses the timer", async () => {
    const authContextWithNoSound = {
      user: {
        ...defaultMockUser,
        preferences: {
          ...defaultMockUser.preferences,
          pomodoro_timer_sound: "none",
          system_notifications_enabled: false,
        },
      },
    };
    renderWithProviders(<TestComponent />, authContextWithNoSound);

    fireEvent.click(screen.getByText("Start/Pause"));
    await waitFor(() =>
      expect(screen.getByTestId("is-active")).toHaveTextContent("true")
    );

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    await waitFor(() =>
      expect(screen.getByTestId("time-remaining")).toHaveTextContent("24:58")
    );

    act(() => {
      fireEvent.click(screen.getByText("Start/Pause"));
    });
    await waitFor(() =>
      expect(screen.getByTestId("is-active")).toHaveTextContent("false")
    );

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    await waitFor(() =>
      expect(screen.getByTestId("time-remaining")).toHaveTextContent("24:58")
    );
  });

  it("resets the timer", async () => {
    const authContextWithNoSound = {
      user: {
        ...defaultMockUser,
        preferences: {
          ...defaultMockUser.preferences,
          pomodoro_timer_sound: "none",
          system_notifications_enabled: false,
        },
      },
    };
    renderWithProviders(<TestComponent />, authContextWithNoSound);

    fireEvent.click(screen.getByText("Start/Pause"));
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    fireEvent.click(screen.getByText("Reset"));
    await waitFor(() => {
      expect(screen.getByTestId("time-remaining")).toHaveTextContent("25:00");
    });
    expect(screen.getByTestId("is-active")).toHaveTextContent("false");
  });

  it("switches from work to short break after timer finishes", async () => {
    const mockUpdateTask = jest.fn().mockResolvedValue({});
    (useUpdateTask as jest.Mock).mockReturnValue({
      mutateAsync: mockUpdateTask,
    });

    await act(async () => {
      renderWithProviders(<TestComponent initialTaskId="test-task-id" />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Start/Pause"));
    });

    await act(async () => {
      jest.advanceTimersByTime(
        defaultMockUser.preferences.pomodoro_working_interval * 60 * 1000
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("mode")).toHaveTextContent("shortBreak");
    });
    expect(mockUpdateTask).toHaveBeenCalledWith({
      taskId: "test-task-id",
      taskData: { status: "in_progress" },
    });

    const expectedTime = `${String(
      defaultMockUser.preferences.pomodoro_timeout_minutes
    ).padStart(2, "0")}:00`;
    expect(screen.getByTestId("time-remaining")).toHaveTextContent(
      expectedTime
    );
    expect(screen.getByTestId("pomodoros-completed")).toHaveTextContent("1");
    expect(screen.getByTestId("is-active")).toHaveTextContent("false");
  });

  it("skips the current session", async () => {
    await act(async () => {
      renderWithProviders(<TestComponent />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Skip"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("mode")).toHaveTextContent("shortBreak");
    });

    await waitFor(() => {
      expect(screen.getByTestId("pomodoros-completed")).toHaveTextContent("1");
    });
  });

  it("saves and loads state from localStorage", async () => {
    (getTodayStats as jest.Mock).mockResolvedValue({ pomodoros_completed: 2 });
    const state = {
      mode: "shortBreak",
      timeRemaining: 100,
      isActive: true,
      pomodorosCompleted: 2,
      timestamp: Date.now(),
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));

    const authContextWithNoSound = {
      user: {
        ...defaultMockUser,
        preferences: {
          ...defaultMockUser.preferences,
          pomodoro_timer_sound: "none",
          system_notifications_enabled: false,
        },
      },
    };
    renderWithProviders(<TestComponent />, authContextWithNoSound);

    await waitFor(() => {
      expect(screen.getByTestId("mode")).toHaveTextContent("shortBreak");
    });
    expect(screen.getByTestId("time-remaining")).toHaveTextContent("01:40");
    expect(screen.getByTestId("is-active")).toHaveTextContent("true");
    expect(screen.getByTestId("pomodoros-completed")).toHaveTextContent("2");
  });

  it("calculates elapsed time on load", async () => {
    const tenSecondsAgo = Date.now() - 10000;
    const state = {
      mode: "work",
      timeRemaining: 500,
      isActive: true,
      pomodorosCompleted: 0,
      timestamp: tenSecondsAgo,
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));

    const authContextWithNoSound = {
      user: {
        ...defaultMockUser,
        preferences: {
          ...defaultMockUser.preferences,
          pomodoro_timer_sound: "none",
          system_notifications_enabled: false,
        },
      },
    };
    renderWithProviders(<TestComponent />, authContextWithNoSound);

    await waitFor(() => {
      expect(screen.getByTestId("time-remaining")).toHaveTextContent("08:10");
    });
  });

  it("plays a sound and shows a notification on mode transition if user preferences are set", async () => {
    const mockAudio = {
      play: jest.fn().mockResolvedValue(undefined),
    };
    const mockAudioConstructor = jest
      .spyOn(window, "Audio")
      .mockImplementation(() => mockAudio as any);

    const authContextWithSound = {
      user: {
        ...defaultMockUser,
        preferences: {
          ...defaultMockUser.preferences,
          pomodoro_timer_sound: "bell.mp3",
        },
      },
    };

    await act(async () => {
      renderWithProviders(
        <TestComponent initialTaskId="task-1" initialTaskName="Test Task" />,
        authContextWithSound
      );
    });
    await notificationService.requestPermission();

    await act(async () => {
      fireEvent.click(screen.getByText("Start/Pause"));
    });

    await act(async () => {
      jest.advanceTimersByTime(
        defaultMockUser.preferences.pomodoro_working_interval * 60 * 1000
      );
    });

    await waitFor(() => {
      expect(mockAudioConstructor).toHaveBeenCalledWith("/sounds/bell.mp3");
    });
    await waitFor(() => {
      expect(mockAudio.play).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockedShowNotification).toHaveBeenCalledWith(
        "Work session finished!",
        { body: 'Great job on "Test Task"! Time for a break.' }
      );
    });

    mockAudioConstructor.mockRestore();
  });

  it("does not play a sound or show a notification if user preferences are not set", async () => {
    const mockAudio = {
      play: jest.fn().mockResolvedValue(undefined),
    };
    const mockAudioConstructor = jest
      .spyOn(window, "Audio")
      .mockImplementation(() => mockAudio as any);

    const authContextWithNoSound = {
      user: {
        ...defaultMockUser,
        preferences: {
          ...defaultMockUser.preferences,
          pomodoro_timer_sound: "none",
          system_notifications_enabled: false,
        },
      },
    };

    renderWithProviders(
      <TestComponent initialTaskId="task-1" initialTaskName="Test Task" />,
      authContextWithNoSound
    );

    fireEvent.click(screen.getByText("Start/Pause"));
    act(() => {
      jest.advanceTimersByTime(
        defaultMockUser.preferences.pomodoro_working_interval * 60 * 1000
      );
    });

    await waitFor(() => {
      expect(mockAudioConstructor).not.toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockAudio.play).not.toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockedShowNotification).not.toHaveBeenCalled();
    });

    mockAudioConstructor.mockRestore();
  });
});
