import React, { useEffect } from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { SharedTimerProvider, useSharedTimerContext } from './SharedTimerContext';
import { Task, TaskUpdateRequest } from '../types/task';

const WORK_DURATION = 25 * 60;
const LOCAL_STORAGE_KEY = 'pomodoroTimerState';

// Test component with better error handling
interface TestComponentProps {
  onTaskCompleteMock?: (taskId: string, taskData: TaskUpdateRequest) => Promise<Task>;
}

const TestComponent: React.FC<TestComponentProps> = ({ onTaskCompleteMock }) => {
  const {
    mode,
    timeRemaining,
    isActive,
    pomodorosCompleted,
    handleStartPause,
    handleReset,
    handleSkip,
    formatTime,
    setCurrentTaskId,
    setOnTaskComplete,
  } = useSharedTimerContext();

  useEffect(() => {
    setCurrentTaskId('test-task-id');
    if (onTaskCompleteMock) {
      setOnTaskComplete(() => onTaskCompleteMock);
    } else {
      setOnTaskComplete(() => jest.fn());
    }
  }, [setCurrentTaskId, setOnTaskComplete, onTaskCompleteMock]);

  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="time-remaining">{formatTime(timeRemaining)}</span>
      <span data-testid="is-active">{isActive.toString()}</span>
      <span data-testid="pomodoros-completed">{pomodorosCompleted}</span>
      <button onClick={handleStartPause}>Start/Pause</button>
      <button onClick={handleReset}>Reset</button>
      <button onClick={handleSkip}>Skip</button>
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

  it('starts and pauses the timer', () => {
    render(
      <SharedTimerProvider>
        <TestComponent />
      </SharedTimerProvider>
    );

    // Start timer
    fireEvent.click(screen.getByText('Start/Pause'));
    expect(screen.getByTestId('is-active')).toHaveTextContent('true');

    // Advance time
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('time-remaining')).toHaveTextContent('24:58');

    // Pause timer
    fireEvent.click(screen.getByText('Start/Pause'));
    expect(screen.getByTestId('is-active')).toHaveTextContent('false');

    // Time should not advance when paused
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('time-remaining')).toHaveTextContent('24:58');
  });

  it('resets the timer', () => {
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
    expect(screen.getByTestId('time-remaining')).toHaveTextContent('25:00');
    expect(screen.getByTestId('is-active')).toHaveTextContent('false');
  });

  it('switches from work to short break after timer finishes', async () => {
    render(
      <SharedTimerProvider>
        <TestComponent />
      </SharedTimerProvider>
    );

    // Start timer
    fireEvent.click(screen.getByText('Start/Pause'));

    // Complete work session
    act(() => {
      jest.advanceTimersByTime(WORK_DURATION * 1000);
    });

    // Wait for mode switch
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

  it('saves and loads state from localStorage', () => {
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

    expect(screen.getByTestId('mode')).toHaveTextContent('shortBreak');
    expect(screen.getByTestId('time-remaining')).toHaveTextContent('01:40');
    expect(screen.getByTestId('is-active')).toHaveTextContent('true');
    expect(screen.getByTestId('pomodoros-completed')).toHaveTextContent('2');
  });

  it('calculates elapsed time on load', () => {
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

    expect(screen.getByTestId('time-remaining')).toHaveTextContent('08:10');
  });

  it('calls onTaskComplete callback when work session finishes', async () => {
    const mockOnTaskComplete = jest.fn()
      .mockImplementation((taskId: string, taskData: TaskUpdateRequest): Promise<Task> =>
        Promise.resolve({} as Task)
      );

    render(
      <SharedTimerProvider>
        <TestComponent onTaskCompleteMock={mockOnTaskComplete} />
      </SharedTimerProvider>
    );

    // Start timer
    fireEvent.click(screen.getByText('Start/Pause'));

    // Complete work session
    act(() => {
      jest.advanceTimersByTime(WORK_DURATION * 1000);
    });

    await waitFor(() => {
      expect(mockOnTaskComplete).toHaveBeenCalledTimes(1);
    });

    expect(mockOnTaskComplete).toHaveBeenCalledWith("test-task-id", { status: "done" });
    expect(screen.getByTestId('mode')).toHaveTextContent('shortBreak');
  });
});

// Separate test suite for detailed hook behavior
describe('SharedTimerContext - Hook Behavior', () => {
  let hookResult: ReturnType<typeof useSharedTimerContext>;

  const TestHookWrapper: React.FC = () => {
    hookResult = useSharedTimerContext();
    return <div data-testid="hook-wrapper">Hook Test</div>;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should call stopCurrentTask when pausing an active timer', async () => {
    render(
      <SharedTimerProvider>
        <TestHookWrapper />
      </SharedTimerProvider>
    );

    if (!hookResult) throw new Error("Hook result not available");

    const stopCurrentTaskSpy = jest.spyOn(hookResult, 'stopCurrentTask');

    // Set up task and start timer
    await act(async () => {
      hookResult.setCurrentTaskId('test-task-id');
      await hookResult.handleStartPause();
    });

    expect(hookResult.isActive).toBe(true);

    // Pause timer (should call stopCurrentTask)
    await act(async () => {
      await hookResult.handleStartPause();
    });

    expect(stopCurrentTaskSpy).toHaveBeenCalledTimes(1);
    expect(hookResult.isActive).toBe(false);

    stopCurrentTaskSpy.mockRestore();
  });

  it('should not call stopCurrentTask when starting a timer', async () => {
    render(
      <SharedTimerProvider>
        <TestHookWrapper />
      </SharedTimerProvider>
    );

    if (!hookResult) throw new Error("Hook result not available");

    const stopCurrentTaskSpy = jest.spyOn(hookResult, 'stopCurrentTask');

    expect(hookResult.isActive).toBe(false);

    await act(async () => {
      await hookResult.handleStartPause();
    });

    expect(stopCurrentTaskSpy).not.toHaveBeenCalled();
    expect(hookResult.isActive).toBe(true);

    stopCurrentTaskSpy.mockRestore();
  });

  it('should call stopCurrentTask when handleReset is called', async () => {
    render(
      <SharedTimerProvider>
        <TestHookWrapper />
      </SharedTimerProvider>
    );

    if (!hookResult) throw new Error("Hook result not available");

    const stopCurrentTaskSpy = jest.spyOn(hookResult, 'stopCurrentTask');

    await act(async () => {
      hookResult.setCurrentTaskId('test-task-id');
      await hookResult.handleReset();
    });

    expect(stopCurrentTaskSpy).toHaveBeenCalledTimes(1);
    stopCurrentTaskSpy.mockRestore();
  });
});
