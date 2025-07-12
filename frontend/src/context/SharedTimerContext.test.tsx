import React, { useEffect } from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { SharedTimerProvider, useSharedTimerContext } from './SharedTimerContext';
import { getTodayStats } from '../services/userDailyStatsService';
import { useUpdateTask } from '../hooks/useTasks';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { AuthContext, AuthContextType } from '../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../hooks/useTasks');
jest.mock('../services/userDailyStatsService');
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: jest.fn(),
}));

const WORK_DURATION = 25 * 60;
const LOCAL_STORAGE_KEY = 'pomodoroTimerState';

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
    if (initialTaskDescription) setCurrentTaskDescription(initialTaskDescription);
    if (initialIsActive !== undefined) setIsActive(initialIsActive);
  }, [setCurrentTaskId, setCurrentTaskName, setCurrentTaskDescription, initialTaskId, initialTaskName, initialTaskDescription, initialIsActive, setIsActive]);

  return (
    <div>
      <span data-testid="current-task-id">{contextTaskId}</span>
      <span data-testid="current-task-name">{contextTaskName}</span>
      <span data-testid="current-task-description">{contextTaskDescription}</span>
      <span data-testid="mode">{mode}</span>
      <span data-testid="time-remaining">{formatTime(timeRemaining)}</span>
      <span data-testid="is-active">{isActive.toString()}</span>
      <span data-testid="pomodoros-completed">{pomodorosCompleted}</span>
      <button onClick={handleStartPause}>Start/Pause</button>
      <button onClick={handleReset}>Reset</button>
      <button onClick={handleSkip}>Skip</button>
      <button onClick={resetForNewTaskMock || resetForNewTask}>Reset For New Task</button>
      <button onClick={stopCurrentTask}>Stop Current Task</button>
      <button onClick={() => handleMarkAsDone('task-to-mark-done')}>Mark as Done</button>
    </div>
  );
};

const queryClient = new QueryClient();
const mockedUseQueryClient = useQueryClient as jest.Mock;

const defaultMockUser = {
  id: 'user1',
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  preferences: {
    pomodoro_timeout_minutes: 25,
    pomodoro_working_interval: 25,
    system_notifications_enabled: true,
    pomodoro_timer_sound: 'none',
  },
};

// Modified renderWithProviders to accept custom authContextValue
const renderWithProviders = async (
  component: React.ReactElement,
  customAuthContextValue?: Partial<AuthContextType>
) => {
  const defaultAuthContextValue: AuthContextType = {
    isAuthenticated: true,
    user: defaultMockUser,
    token: 'test-token',
    login: jest.fn(),
    logout: jest.fn(),
    isLoading: false,
  };

  const authContextValue = { ...defaultAuthContextValue, ...customAuthContextValue };

  await act(() => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthContext.Provider value={authContextValue}>
            <SharedTimerProvider>
              {component}
            </SharedTimerProvider>
          </AuthContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  });
};

describe('SharedTimerContext', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    jest.clearAllMocks();
    (useUpdateTask as jest.Mock).mockReturnValue({ mutateAsync: jest.fn().mockResolvedValue({}) });
    (getTodayStats as jest.Mock).mockResolvedValue({ pomodoros_completed: 0 });
    mockedUseQueryClient.mockReturnValue({
      invalidateQueries: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('provides initial timer state', async () => {
    await renderWithProviders(<TestComponent />);

    expect(screen.getByTestId('mode')).toHaveTextContent('work');
    expect(screen.getByTestId('time-remaining')).toHaveTextContent('25:00');
    expect(screen.getByTestId('is-active')).toHaveTextContent('false');
    expect(screen.getByTestId('pomodoros-completed')).toHaveTextContent('0');
    expect(screen.getByTestId('current-task-id')).toHaveTextContent('');
    expect(screen.getByTestId('current-task-name')).toHaveTextContent('');
    expect(screen.getByTestId('current-task-description')).toHaveTextContent('');
  });

  it('throws an error if useSharedTimerContext is used outside SharedTimerProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestComponent />)).toThrow('useSharedTimerContext must be used within a SharedTimerProvider');
    consoleSpy.mockRestore();
  });

  it('starts and pauses the timer', async () => {
    await renderWithProviders(<TestComponent />);

    fireEvent.click(screen.getByText('Start/Pause'));
    await waitFor(() => expect(screen.getByTestId('is-active')).toHaveTextContent('true'));

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('time-remaining')).toHaveTextContent('24:58');

    fireEvent.click(screen.getByText('Start/Pause'));
    await waitFor(() => expect(screen.getByTestId('is-active')).toHaveTextContent('false'));

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('time-remaining')).toHaveTextContent('24:58');
  });

  it('resets the timer', async () => {
    await renderWithProviders(<TestComponent />);

    fireEvent.click(screen.getByText('Start/Pause'));
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    fireEvent.click(screen.getByText('Reset'));
    await waitFor(() => {
      expect(screen.getByTestId('time-remaining')).toHaveTextContent('25:00');
    });
    expect(screen.getByTestId('is-active')).toHaveTextContent('false');
  });

  it('switches from work to short break after timer finishes', async () => {
    const mockUpdateTask = jest.fn().mockResolvedValue({});
    (useUpdateTask as jest.Mock).mockReturnValue({ mutateAsync: mockUpdateTask });

    await renderWithProviders(<TestComponent initialTaskId="test-task-id" />);

    await act(async () => {
      fireEvent.click(screen.getByText('Start/Pause'));
      await Promise.resolve();
    });

    await act(async () => {
      jest.advanceTimersByTime(WORK_DURATION * 1000);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('mode')).toHaveTextContent('shortBreak');
    });
    expect(mockUpdateTask).toHaveBeenCalledWith({ taskId: 'test-task-id', taskData: { status: 'in_progress' } });
    expect(mockUpdateTask).toHaveBeenCalledWith({ taskId: 'test-task-id', taskData: { status: 'pending' } });

    expect(screen.getByTestId('time-remaining')).toHaveTextContent('05:00');
    expect(screen.getByTestId('pomodoros-completed')).toHaveTextContent('1');
    expect(screen.getByTestId('is-active')).toHaveTextContent('false');
  });

  it('skips the current session', async () => {
    await renderWithProviders(<TestComponent />);

    fireEvent.click(screen.getByText('Skip'));

    await waitFor(() => {
      expect(screen.getByTestId('mode')).toHaveTextContent('shortBreak');
    });

    expect(screen.getByTestId('pomodoros-completed')).toHaveTextContent('1');
  });

  it('saves and loads state from localStorage', async () => {
    (getTodayStats as jest.Mock).mockResolvedValue({ pomodoros_completed: 2 });
    const state = {
      mode: 'shortBreak',
      timeRemaining: 100,
      isActive: true,
      pomodorosCompleted: 2,
      timestamp: Date.now()
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));

    await renderWithProviders(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('mode')).toHaveTextContent('shortBreak');
    });
    expect(screen.getByTestId('time-remaining')).toHaveTextContent('01:40');
    expect(screen.getByTestId('is-active')).toHaveTextContent('true');
    expect(screen.getByTestId('pomodoros-completed')).toHaveTextContent('2');
  });

  it('calculates elapsed time on load', async () => {
    const tenSecondsAgo = Date.now() - 10000;
    const state = {
      mode: 'work',
      timeRemaining: 500,
      isActive: true,
      pomodorosCompleted: 0,
      timestamp: tenSecondsAgo
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));

    await renderWithProviders(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('time-remaining')).toHaveTextContent('08:10');
    });
  });

  it('plays a sound on mode transition if user preference is set', async () => {
    const mockAudio = {
      play: jest.fn().mockResolvedValue(undefined),
    };
    const mockAudioConstructor = jest.spyOn(window, 'Audio').mockImplementation(() => mockAudio as any);

    const authContextWithSound = {
      user: {
        ...defaultMockUser,
        preferences: {
          ...defaultMockUser.preferences,
          pomodoro_timer_sound: 'bell.mp3',
        },
      },
    };

    await renderWithProviders(<TestComponent />, authContextWithSound);

    await act(async () => {
      fireEvent.click(screen.getByText('Start/Pause'));
      await Promise.resolve();
    });

    await act(async () => {
      jest.advanceTimersByTime(WORK_DURATION * 1000);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('mode')).toHaveTextContent('shortBreak');
    });

    expect(mockAudioConstructor).toHaveBeenCalledWith('/sounds/bell.mp3');
    expect(mockAudio.play).toHaveBeenCalledTimes(1);

    mockAudioConstructor.mockRestore();
  });

  it('does not play a sound on mode transition if user preference is "none"', async () => {
    const mockAudio = {
      play: jest.fn().mockResolvedValue(undefined),
    };
    const mockAudioConstructor = jest.spyOn(window, 'Audio').mockImplementation(() => mockAudio as any);

    // Using default user with 'none' sound preference
    await renderWithProviders(<TestComponent />);

    await act(async () => {
      fireEvent.click(screen.getByText('Start/Pause'));
      await Promise.resolve();
    });

    await act(async () => {
      jest.advanceTimersByTime(WORK_DURATION * 1000);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('mode')).toHaveTextContent('shortBreak');
    });

    expect(mockAudioConstructor).not.toHaveBeenCalled();
    expect(mockAudio.play).not.toHaveBeenCalled();

    mockAudioConstructor.mockRestore();
  });
});

describe('SharedTimerContext - Task interaction', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    jest.clearAllMocks();
    (useUpdateTask as jest.Mock).mockReturnValue({ mutateAsync: jest.fn().mockResolvedValue({}) });
    (getTodayStats as jest.Mock).mockResolvedValue({ pomodoros_completed: 0 });
    mockedUseQueryClient.mockReturnValue({
      invalidateQueries: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('sets current task details', async () => {
    await renderWithProviders(
      <TestComponent initialTaskId="task-123" initialTaskName="My Task" initialTaskDescription="Task Description" />
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-task-id')).toHaveTextContent('task-123');
    });
    await waitFor(() => {
      expect(screen.getByTestId('current-task-name')).toHaveTextContent('My Task');
    });
    await waitFor(() => {
      expect(screen.getByTestId('current-task-description')).toHaveTextContent('Task Description');
    });
  });

  it('calls stopCurrentTask, which unassigns the task and updates its status to pending', async () => {
    const mockUpdateTask = jest.fn().mockResolvedValue({});
    (useUpdateTask as jest.Mock).mockReturnValue({ mutateAsync: mockUpdateTask });

    await renderWithProviders(
      <TestComponent
        initialTaskId="task-to-stop"
        initialTaskName="Task to Stop"
        initialTaskDescription="Description to stop"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-task-id')).toHaveTextContent('task-to-stop');
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Stop Current Task'));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith({ taskId: 'task-to-stop', taskData: { status: 'pending' } });
    });
    await waitFor(() => {
      expect(screen.getByTestId('current-task-id')).toHaveTextContent('');
    });
    await waitFor(() => {
      expect(screen.getByTestId('current-task-name')).toHaveTextContent('');
    });
    await waitFor(() => {
      expect(screen.getByTestId('current-task-description')).toHaveTextContent('');
    });
  });

  it('updates task status on start/pause but does not unassign task', async () => {
    const mockUpdateTask = jest.fn().mockResolvedValue({});
    (useUpdateTask as jest.Mock).mockReturnValue({ mutateAsync: mockUpdateTask });

    await renderWithProviders(<TestComponent initialTaskId="test-task-id" />);

    await waitFor(() => expect(screen.getByTestId('current-task-id')).toHaveTextContent('test-task-id'));

    await act(async () => {
      fireEvent.click(screen.getByText('Start/Pause'));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith({ taskId: 'test-task-id', taskData: { status: 'in_progress' } });
    });
    await waitFor(() => {
      expect(screen.getByTestId('is-active')).toHaveTextContent('true');
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Start/Pause'));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith({ taskId: 'test-task-id', taskData: { status: 'pending' } });
    });
    await waitFor(() => {
      expect(screen.getByTestId('is-active')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('current-task-id')).toHaveTextContent('test-task-id');
  });

  it('calls resetForNewTask, which unassigns the task and resets the timer to work mode', async () => {
    const mockUpdateTask = jest.fn().mockResolvedValue({});
    (useUpdateTask as jest.Mock).mockReturnValue({ mutateAsync: mockUpdateTask });

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
      mode: 'shortBreak',
      timeRemaining: 100,
      isActive: true,
      pomodorosCompleted: 1,
      timestamp: Date.now()
    }));

    await renderWithProviders(<TestComponent initialTaskId="task-to-reset" />);

    await waitFor(() => expect(screen.getByTestId('current-task-id')).toHaveTextContent('task-to-reset'));

    await act(async () => {
      fireEvent.click(screen.getByText('Reset For New Task'));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('mode')).toHaveTextContent('work');
    });
    await waitFor(() => {
      expect(screen.getByTestId('time-remaining')).toHaveTextContent('25:00');
    });
    await waitFor(() => {
      expect(screen.getByTestId('is-active')).toHaveTextContent('false');
    });
    await waitFor(() => {
      expect(screen.getByTestId('current-task-id')).toHaveTextContent('');
    });
    await waitFor(() => {
      expect(screen.getByTestId('current-task-name')).toHaveTextContent('');
    });
    await waitFor(() => {
      expect(screen.getByTestId('current-task-description')).toHaveTextContent('');
    });
    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith({ taskId: 'task-to-reset', taskData: { status: 'pending' } });
    });
  });

  it('calls handleMarkAsDone, which updates task status to "done" and resets current task if it was the active one', async () => {
    const mockUpdateTask = jest.fn().mockResolvedValue({});
    (useUpdateTask as jest.Mock).mockReturnValue({ mutateAsync: mockUpdateTask });
    const mockQueryClient = {
      invalidateQueries: jest.fn(),
    };
    mockedUseQueryClient.mockReturnValue(mockQueryClient);

    await renderWithProviders(<TestComponent initialTaskId="task-to-mark-done" initialIsActive={true} />);

    await waitFor(() => expect(screen.getByTestId('current-task-id')).toHaveTextContent('task-to-mark-done'));

    await act(async () => {
      fireEvent.click(screen.getByText('Mark as Done'));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith(
        { taskId: 'task-to-mark-done', taskData: { status: 'done' } },
        expect.objectContaining({
          onSuccess: expect.any(Function),
        }),
      );
    });
    // Manually call onSuccess to test query invalidation
    const updateTaskCall = mockUpdateTask.mock.calls[0][1];
    updateTaskCall.onSuccess();
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['dailyPlan', 'today'] });
    expect(screen.getByTestId('is-active')).toHaveTextContent('false');
    expect(screen.getByTestId('current-task-id')).toHaveTextContent('');
    expect(screen.getByTestId('current-task-name')).toHaveTextContent('');
    expect(screen.getByTestId('current-task-description')).toHaveTextContent('');
  });
});
