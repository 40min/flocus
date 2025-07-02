import React, { useEffect } from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { SharedTimerProvider, useSharedTimerContext } from './SharedTimerContext';
import { useUpdateTask } from '../hooks/useTasks';

jest.mock('../hooks/useTasks');

const WORK_DURATION = 25 * 60;
const LOCAL_STORAGE_KEY = 'pomodoroTimerState';

// Test component with better error handling
interface TestComponentProps {
  resetForNewTaskMock?: jest.Mock;
  initialTaskId?: string;
  initialTaskName?: string;
  initialTaskDescription?: string;
}

const TestComponent: React.FC<TestComponentProps> = ({
  resetForNewTaskMock,
  initialTaskId,
  initialTaskName,
  initialTaskDescription,
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
  } = useSharedTimerContext();

  useEffect(() => {
    if (initialTaskId) setCurrentTaskId(initialTaskId);
    if (initialTaskName) setCurrentTaskName(initialTaskName);
    if (initialTaskDescription) setCurrentTaskDescription(initialTaskDescription);
  }, [setCurrentTaskId, setCurrentTaskName, setCurrentTaskDescription, initialTaskId, initialTaskName, initialTaskDescription]);

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
    </div>
  );
};

describe('SharedTimerContext', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    jest.clearAllMocks();
    (useUpdateTask as jest.Mock).mockReturnValue({ mutateAsync: jest.fn().mockResolvedValue({}) });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('provides initial timer state', async () => {
    await act(async () => {
      render(
        <SharedTimerProvider>
          <TestComponent />
        </SharedTimerProvider>
      );
      await Promise.resolve();
    });

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
    await act(async () => {
      render(
        <SharedTimerProvider>
          <TestComponent />
        </SharedTimerProvider>
      );
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Start/Pause'));
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.getByTestId('is-active')).toHaveTextContent('true'));

    await act(async () => {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });
    expect(screen.getByTestId('time-remaining')).toHaveTextContent('24:58');

    await act(async () => {
      fireEvent.click(screen.getByText('Start/Pause'));
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.getByTestId('is-active')).toHaveTextContent('false'));

    await act(async () => {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });
    expect(screen.getByTestId('time-remaining')).toHaveTextContent('24:58');
  });

  it('resets the timer', async () => {
    await act(async () => {
      render(
        <SharedTimerProvider>
          <TestComponent />
        </SharedTimerProvider>
      );
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Start/Pause'));
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Reset'));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(screen.getByTestId('time-remaining')).toHaveTextContent('25:00');
    });
    expect(screen.getByTestId('is-active')).toHaveTextContent('false');
  });

  it('switches from work to short break after timer finishes', async () => {
    const mockUpdateTask = jest.fn().mockResolvedValue({});
    (useUpdateTask as jest.Mock).mockReturnValue({ mutateAsync: mockUpdateTask });

    await act(async () => {
      render(
        <SharedTimerProvider>
          <TestComponent initialTaskId="test-task-id" />
        </SharedTimerProvider>
      );
      await Promise.resolve();
    });

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
    await act(async () => {
      render(
        <SharedTimerProvider>
          <TestComponent />
        </SharedTimerProvider>
      );
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Skip'));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('mode')).toHaveTextContent('shortBreak');
    });

    expect(screen.getByTestId('pomodoros-completed')).toHaveTextContent('1');
  });

  // temporary disabled tests for localStorage functionality (1)
  it('saves and loads state from localStorage', async () => {
    const state = {
      mode: 'shortBreak',
      timeRemaining: 100,
      isActive: true,
      pomodorosCompleted: 2,
      timestamp: Date.now()
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));

    await act(async () => {
      render(
        <SharedTimerProvider>
          <TestComponent />
        </SharedTimerProvider>
      );
      await Promise.resolve();
    });

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

    await act(async () => {
      render(
        <SharedTimerProvider>
          <TestComponent />
        </SharedTimerProvider>
      );
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('time-remaining')).toHaveTextContent('08:10');
    });
  });
});

describe('SharedTimerContext - Task interaction', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    (useUpdateTask as jest.Mock).mockReturnValue({ mutateAsync: jest.fn().mockResolvedValue({}) });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sets current task details', async () => {
    await act(async () => {
      render(
        <SharedTimerProvider>
          <TestComponent initialTaskId="task-123" initialTaskName="My Task" initialTaskDescription="Task Description" />
        </SharedTimerProvider>
      );
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('current-task-id')).toHaveTextContent('task-123');
      expect(screen.getByTestId('current-task-name')).toHaveTextContent('My Task');
      expect(screen.getByTestId('current-task-description')).toHaveTextContent('Task Description');
    });
  });

  it('calls stopCurrentTask, which unassigns the task and updates its status to pending', async () => {
    const mockUpdateTask = jest.fn().mockResolvedValue({});
    (useUpdateTask as jest.Mock).mockReturnValue({ mutateAsync: mockUpdateTask });

    await act(async () => {
      render(
        <SharedTimerProvider>
          <TestComponent
            initialTaskId="task-to-stop"
            initialTaskName="Task to Stop"
            initialTaskDescription="Description to stop"
          />
        </SharedTimerProvider>
      );
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('current-task-id')).toHaveTextContent('task-to-stop');
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Stop Current Task'));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith({ taskId: 'task-to-stop', taskData: { status: 'pending' } });
      expect(screen.getByTestId('current-task-id')).toHaveTextContent('');
      expect(screen.getByTestId('current-task-name')).toHaveTextContent('');
      expect(screen.getByTestId('current-task-description')).toHaveTextContent('');
    });
  });

  it('updates task status on start/pause but does not unassign task', async () => {
    const mockUpdateTask = jest.fn().mockResolvedValue({});
    (useUpdateTask as jest.Mock).mockReturnValue({ mutateAsync: mockUpdateTask });

    await act(async () => {
      render(
        <SharedTimerProvider>
          <TestComponent initialTaskId="test-task-id" />
        </SharedTimerProvider>
      );
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByTestId('current-task-id')).toHaveTextContent('test-task-id'));

    await act(async () => {
      fireEvent.click(screen.getByText('Start/Pause'));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith({ taskId: 'test-task-id', taskData: { status: 'in_progress' } });
      expect(screen.getByTestId('is-active')).toHaveTextContent('true');
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Start/Pause'));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith({ taskId: 'test-task-id', taskData: { status: 'pending' } });
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

    await act(async () => {
      render(
        <SharedTimerProvider>
          <TestComponent initialTaskId="task-to-reset" />
        </SharedTimerProvider>
      );
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByTestId('current-task-id')).toHaveTextContent('task-to-reset'));

    await act(async () => {
      fireEvent.click(screen.getByText('Reset For New Task'));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('mode')).toHaveTextContent('work');
      expect(screen.getByTestId('time-remaining')).toHaveTextContent('25:00');
      expect(screen.getByTestId('is-active')).toHaveTextContent('false');
      expect(screen.getByTestId('current-task-id')).toHaveTextContent('');
      expect(screen.getByTestId('current-task-name')).toHaveTextContent('');
      expect(screen.getByTestId('current-task-description')).toHaveTextContent('');
      expect(mockUpdateTask).toHaveBeenCalledWith({ taskId: 'task-to-reset', taskData: { status: 'pending' } });
    });
  });
});
