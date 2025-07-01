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
  initialTaskId?: string;
  initialTaskName?: string;
  initialTaskDescription?: string;
}

const TestComponent: React.FC<TestComponentProps> = ({
  onTaskChangedMock,
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
    setOnTaskChanged,
    resetForNewTask,
    stopCurrentTask,
  } = useSharedTimerContext();

  useEffect(() => {
    if (initialTaskId) setCurrentTaskId(initialTaskId);
    if (initialTaskName) setCurrentTaskName(initialTaskName);
    if (initialTaskDescription) setCurrentTaskDescription(initialTaskDescription);

    if (onTaskChangedMock) {
      setOnTaskChanged(() => onTaskChangedMock);
    } else {
      setOnTaskChanged(() => jest.fn().mockResolvedValue({} as Task));
    }
  }, [setCurrentTaskId, setCurrentTaskName, setCurrentTaskDescription, setOnTaskChanged, onTaskChangedMock, initialTaskId, initialTaskName, initialTaskDescription]);

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
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('provides initial timer state', async () => {
    await act(async () => { // Wrap render for initial state updates from localStorage
      render(
        <SharedTimerProvider>
          <TestComponent />
        </SharedTimerProvider>
      );
      await Promise.resolve(); // Ensure any promises from useEffect are resolved
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

    // Start timer
    await act(async () => { // Wrap fireEvent and subsequent async operations
      fireEvent.click(screen.getByText('Start/Pause'));
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.getByTestId('is-active')).toHaveTextContent('true'));

    // Advance time
    await act(async () => { // Wrap timer advance and subsequent async operations
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });
    expect(screen.getByTestId('time-remaining')).toHaveTextContent('24:58');

    // Pause timer
    await act(async () => { // Wrap fireEvent and subsequent async operations
      fireEvent.click(screen.getByText('Start/Pause'));
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.getByTestId('is-active')).toHaveTextContent('false'));

    // Time should not advance when paused
    await act(async () => { // Wrap timer advance and subsequent async operations
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

    // Start and advance timer
    await act(async () => {
      fireEvent.click(screen.getByText('Start/Pause'));
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    // Reset timer
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
    const mockOnTaskComplete = jest.fn().mockResolvedValue({} as Task);
    await act(async () => {
      render(
        <SharedTimerProvider>
          <TestComponent initialTaskId="test-task-id" onTaskChangedMock={mockOnTaskComplete} />
        </SharedTimerProvider>
      );
      await Promise.resolve();
    });

    // Start timer
    await act(async () => {
      fireEvent.click(screen.getByText('Start/Pause'));
      await Promise.resolve();
    });

    // Complete work session
    await act(async () => { // Use act for advancing timers and awaiting async operations
      jest.advanceTimersByTime(WORK_DURATION * 1000);
      // Ensure all promises resolve after timer advances
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('mode')).toHaveTextContent('shortBreak');
    });
    expect(mockOnTaskComplete).toHaveBeenCalledTimes(2); // Called on start and on completion
    expect(mockOnTaskComplete).toHaveBeenCalledWith("test-task-id", { status: "in_progress" }); // First call on start
    expect(mockOnTaskComplete).toHaveBeenCalledWith("test-task-id", { status: "pending" }); // Second call on completion

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

  it('saves and loads state from localStorage', async () => {
    const state = {
      mode: 'shortBreak',
      timeRemaining: 100,
      isActive: true,
      pomodorosCompleted: 2,
      timestamp: Date.now()
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));

    await act(async () => { // Wrap render for initial state updates from localStorage
      render(
        <SharedTimerProvider>
          <TestComponent />
        </SharedTimerProvider>
      );
      await Promise.resolve(); // Ensure any promises from useEffect are resolved
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

    await act(async () => { // Wrap render for initial state updates from localStorage
      render(
        <SharedTimerProvider>
          <TestComponent />
        </SharedTimerProvider>
      );
      await Promise.resolve(); // Ensure any promises from useEffect are resolved
    });

    await waitFor(() => {
      expect(screen.getByTestId('time-remaining')).toHaveTextContent('08:10');
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
    const mockOnTaskChanged = jest.fn().mockResolvedValue({} as Task);

    await act(async () => {
      render(
        <SharedTimerProvider>
          <TestComponent
            initialTaskId="task-to-stop"
            initialTaskName="Task to Stop"
            initialTaskDescription="Description to stop"
            onTaskChangedMock={mockOnTaskChanged}
          />
        </SharedTimerProvider>
      );
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('current-task-id')).toHaveTextContent('task-to-stop');
    });

    await act(async () => { // Wrap direct function call that causes state updates
      fireEvent.click(screen.getByText('Stop Current Task'));
      await Promise.resolve(); // Ensure promises resolve
    });

    await waitFor(() => {
      expect(mockOnTaskChanged).toHaveBeenCalledWith('task-to-stop', { status: 'pending' });
      expect(screen.getByTestId('current-task-id')).toHaveTextContent('');
      expect(screen.getByTestId('current-task-name')).toHaveTextContent('');
      expect(screen.getByTestId('current-task-description')).toHaveTextContent('');
    });
  });

  it('updates task status on start/pause but does not unassign task', async () => {
    const mockOnTaskChanged = jest.fn().mockResolvedValue({} as Task);

    await act(async () => {
      render(
        <SharedTimerProvider>
          <TestComponent initialTaskId="test-task-id" onTaskChangedMock={mockOnTaskChanged} />
        </SharedTimerProvider>
      );
      await Promise.resolve();
    });

    // TestComponent sets currentTaskId to 'test-task-id' via useEffect
    await waitFor(() => expect(screen.getByTestId('current-task-id')).toHaveTextContent('test-task-id'));

    // 1. Start timer
    await act(async () => {
      fireEvent.click(screen.getByText('Start/Pause'));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(mockOnTaskChanged).toHaveBeenCalledWith('test-task-id', { status: 'in_progress' });
      expect(screen.getByTestId('is-active')).toHaveTextContent('true');
    });
    expect(mockOnTaskChanged).toHaveBeenCalledTimes(1);


    // 2. Pause timer
    await act(async () => {
      fireEvent.click(screen.getByText('Start/Pause'));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(mockOnTaskChanged).toHaveBeenCalledWith('test-task-id', { status: 'pending' });
      expect(screen.getByTestId('is-active')).toHaveTextContent('false');
    });
    expect(mockOnTaskChanged).toHaveBeenCalledTimes(2);

    // Verify task is still assigned
    expect(screen.getByTestId('current-task-id')).toHaveTextContent('test-task-id');
  });

  it('calls resetForNewTask, which unassigns the task and resets the timer to work mode', async () => {
    const mockOnTaskChanged = jest.fn().mockResolvedValue({} as Task);

    // Set initial state in localStorage to simulate a non-work mode and some time remaining
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
          <TestComponent initialTaskId="task-to-reset" onTaskChangedMock={mockOnTaskChanged} />
        </SharedTimerProvider>
      );
      await Promise.resolve();
    });

    // Wait for initial render to settle and currentTaskId to be set by TestComponent's useEffect
    await waitFor(() => expect(screen.getByTestId('current-task-id')).toHaveTextContent('task-to-reset'));

    // Click the button to trigger resetForNewTask
    await act(async () => { // Wrap direct function call that causes state updates
      fireEvent.click(screen.getByText('Reset For New Task'));
      await Promise.resolve(); // Ensure promises resolve
    });

    // Assert on the DOM elements
    await waitFor(() => {
      expect(screen.getByTestId('mode')).toHaveTextContent('work');
      expect(screen.getByTestId('time-remaining')).toHaveTextContent('25:00');
      expect(screen.getByTestId('is-active')).toHaveTextContent('false');
      expect(screen.getByTestId('current-task-id')).toHaveTextContent(''); // Should be empty now
      expect(screen.getByTestId('current-task-name')).toHaveTextContent('');
      expect(screen.getByTestId('current-task-description')).toHaveTextContent('');
      expect(mockOnTaskChanged).toHaveBeenCalledWith('task-to-reset', { status: 'pending' }); // Verify the task status update
    });
  });
});
