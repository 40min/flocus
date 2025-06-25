import React, { useEffect } from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { SharedTimerProvider, useSharedTimerContext } from './SharedTimerContext';
import { Task, TaskUpdateRequest } from '../types/task';

const WORK_DURATION = 25 * 60;
const LOCAL_STORAGE_KEY = 'pomodoroTimerState';

// Test component with better error handling
interface TestComponentProps {
  onTaskChangedMock?: jest.Mock;
  resetForNewTaskMock?: jest.Mock;
}

const TestComponent: React.FC<TestComponentProps> = ({ onTaskChangedMock, resetForNewTaskMock }) => {
  const {
    mode,
    currentTaskId: contextTaskId,
    timeRemaining,
    isActive,
    pomodorosCompleted,
    handleStartPause,
    handleReset,
    handleSkip,
    formatTime,
    setCurrentTaskId,
    setOnTaskChanged,
    resetForNewTask,
  } = useSharedTimerContext();

  useEffect(() => {
    setCurrentTaskId('test-task-id');
    if (onTaskChangedMock) {
      setOnTaskChanged(() => onTaskChangedMock);
    } else {
      setOnTaskChanged(() => jest.fn().mockResolvedValue({} as Task));
    }
  }, [setCurrentTaskId, setOnTaskChanged, onTaskChangedMock]);

  return (
    <div>
      <span data-testid="current-task-id">{contextTaskId}</span>
      <span data-testid="mode">{mode}</span>
      <span data-testid="time-remaining">{formatTime(timeRemaining)}</span>
      <span data-testid="is-active">{isActive.toString()}</span>
      <span data-testid="pomodoros-completed">{pomodorosCompleted}</span>
      <button onClick={handleStartPause}>Start/Pause</button>
      <button onClick={handleReset}>Reset</button>
      <button onClick={handleSkip}>Skip</button>
      <button onClick={resetForNewTaskMock || resetForNewTask}>Reset For New Task</button>
    </div>
  );
};

describe('SharedTimerContext', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('provides initial timer state', () => {
    render(
      <SharedTimerProvider>
        <TestComponent />
      </SharedTimerProvider>
    );

    expect(screen.getByTestId('mode')).toHaveTextContent('work');
    expect(screen.getByTestId('time-remaining')).toHaveTextContent('25:00');
    expect(screen.getByTestId('is-active')).toHaveTextContent('false');
    expect(screen.getByTestId('pomodoros-completed')).toHaveTextContent('0');
  });

  it('throws an error if useSharedTimerContext is used outside SharedTimerProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestComponent />)).toThrow('useSharedTimerContext must be used within a SharedTimerProvider');
    consoleSpy.mockRestore();
  });

  it('starts and pauses the timer', async () => {
    render(
      <SharedTimerProvider>
        <TestComponent />
      </SharedTimerProvider>
    );

    // Start timer
    fireEvent.click(screen.getByText('Start/Pause'));
    await waitFor(() => expect(screen.getByTestId('is-active')).toHaveTextContent('true'));

    // Advance time
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('time-remaining')).toHaveTextContent('24:58');

    // Pause timer
    fireEvent.click(screen.getByText('Start/Pause'));
    await waitFor(() => expect(screen.getByTestId('is-active')).toHaveTextContent('false'));

    // Time should not advance when paused
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('time-remaining')).toHaveTextContent('24:58');
  });

  it('resets the timer', async () => {
    render(
      <SharedTimerProvider>
        <TestComponent />
      </SharedTimerProvider>
    );

    // Start and advance timer
    fireEvent.click(screen.getByText('Start/Pause'));
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Reset timer
    fireEvent.click(screen.getByText('Reset'));
    await waitFor(() => {
      expect(screen.getByTestId('time-remaining')).toHaveTextContent('25:00');
    });
    expect(screen.getByTestId('is-active')).toHaveTextContent('false');
  });

  it('switches from work to short break after timer finishes', async () => {
    render(
      <SharedTimerProvider>
        <TestComponent />
      </SharedTimerProvider>
    );

    // Start timer
    await act(async () => {
      fireEvent.click(screen.getByText('Start/Pause'));
    });

    // Complete work session
    await act(async () => {
      jest.advanceTimersByTime(WORK_DURATION * 1000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('mode')).toHaveTextContent('shortBreak');
    });

    expect(screen.getByTestId('time-remaining')).toHaveTextContent('05:00');
    expect(screen.getByTestId('pomodoros-completed')).toHaveTextContent('1');
    expect(screen.getByTestId('is-active')).toHaveTextContent('false');
  });

  it('skips the current session', async () => {
    render(
      <SharedTimerProvider>
        <TestComponent />
      </SharedTimerProvider>
    );

    fireEvent.click(screen.getByText('Skip'));

    await waitFor(() => {
      expect(screen.getByTestId('mode')).toHaveTextContent('shortBreak');
    });

    expect(screen.getByTestId('pomodoros-completed')).toHaveTextContent('1');
  });

  it('saves and loads state from localStorage', async () => {
    const state = {
      mode: 'shortBreak',
      timeRemaining: 100,
      isActive: true,
      pomodorosCompleted: 2,
      timestamp: Date.now()
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));

    render(
      <SharedTimerProvider>
        <TestComponent />
      </SharedTimerProvider>
    );

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

    render(
      <SharedTimerProvider>
        <TestComponent />
      </SharedTimerProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('time-remaining')).toHaveTextContent('08:10');
    });
  });

  it('calls onTaskChanged callback when work session finishes', async () => {
    const mockOnTaskComplete = jest.fn()
      .mockImplementation((taskId: string, taskData: TaskUpdateRequest): Promise<Task> =>
        Promise.resolve({} as Task)
      );

    render(
      <SharedTimerProvider>
        <TestComponent onTaskChangedMock={mockOnTaskComplete} />
      </SharedTimerProvider>
    );

    // Start timer
    await act(async () => {
      fireEvent.click(screen.getByText('Start/Pause'));
    });

    // Complete work session
    await act(async () => {
      jest.advanceTimersByTime(WORK_DURATION * 1000);
    });

    await waitFor(() => {
      expect(mockOnTaskComplete).toHaveBeenCalledTimes(2); // Called on start and on completion
    });

    expect(mockOnTaskComplete).toHaveBeenCalledWith("test-task-id", { status: "in_progress" }); // First call on start
    expect(mockOnTaskComplete).toHaveBeenCalledWith("test-task-id", { status: "pending" }); // Second call on completion

    await waitFor(() => {
      expect(screen.getByTestId('mode')).toHaveTextContent('shortBreak');
    });
  });
});

describe('SharedTimerContext - Task interaction', () => {
  const onTaskChangedMock = jest.fn().mockResolvedValue({} as Task);

  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    onTaskChangedMock.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('updates task status on start/pause but does not unassign task', async () => {
    render(
      <SharedTimerProvider>
        <TestComponent onTaskChangedMock={onTaskChangedMock} />
      </SharedTimerProvider>
    );

    // TestComponent sets currentTaskId to 'test-task-id' via useEffect
    await waitFor(() => expect(screen.getByTestId('current-task-id')).toHaveTextContent('test-task-id'));

    // 1. Start timer
    await act(async () => {
      fireEvent.click(screen.getByText('Start/Pause'));
    });
    await waitFor(() => {
      expect(onTaskChangedMock).toHaveBeenCalledWith('test-task-id', { status: 'in_progress' });
    });
    expect(onTaskChangedMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('is-active')).toHaveTextContent('true');

    // 2. Pause timer
    await act(async () => {
      fireEvent.click(screen.getByText('Start/Pause'));
    });
    await waitFor(() => {
      expect(onTaskChangedMock).toHaveBeenCalledWith('test-task-id', { status: 'pending' });
    });
    expect(onTaskChangedMock).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('is-active')).toHaveTextContent('false');

    // Verify task is still assigned
    expect(screen.getByTestId('current-task-id')).toHaveTextContent('test-task-id');
  });

  it('calls resetForNewTask, which unassigns the task and resets the timer to work mode', async () => {
    const onTaskChangedMock = jest.fn().mockResolvedValue({} as Task);

    // Set initial state in localStorage to simulate a non-work mode and some time remaining
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
      mode: 'shortBreak',
      timeRemaining: 100,
      isActive: true,
      pomodorosCompleted: 1,
      timestamp: Date.now()
    }));

    render(
      <SharedTimerProvider>
        <TestComponent onTaskChangedMock={onTaskChangedMock} />
      </SharedTimerProvider>
    );

    // Wait for initial render to settle and currentTaskId to be set by TestComponent's useEffect
    await waitFor(() => expect(screen.getByTestId('current-task-id')).toHaveTextContent('test-task-id'));

    // Click the button to trigger resetForNewTask
    await act(async () => {
      fireEvent.click(screen.getByText('Reset For New Task'));
    });

    // Assert on the DOM elements
    await waitFor(() => {
      expect(screen.getByTestId('mode')).toHaveTextContent('work');
    });
    expect(screen.getByTestId('time-remaining')).toHaveTextContent('25:00');
    expect(screen.getByTestId('is-active')).toHaveTextContent('false');
    expect(screen.getByTestId('current-task-id')).toHaveTextContent(''); // Should be empty now
    expect(onTaskChangedMock).toHaveBeenCalledWith('test-task-id', { status: 'pending' }); // Verify the task status update
  });
});
