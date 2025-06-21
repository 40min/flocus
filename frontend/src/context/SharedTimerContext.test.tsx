import React, { useEffect } from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { SharedTimerProvider, useSharedTimerContext } from './SharedTimerContext';
import { Task, TaskUpdateRequest } from '../types/task';

const WORK_DURATION = 25 * 60;
const SHORT_BREAK_DURATION = 5 * 60;
const LOCAL_STORAGE_KEY = 'pomodoroTimerState';

// A test component to consume the context
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
    isBreak,
    timerColor,
    buttonBgColor,
    buttonTextColor,
    modeText,
    setCurrentTaskId,
    setOnTaskComplete,
  } = useSharedTimerContext();

  useEffect(() => {
    setCurrentTaskId('test-task-id');
    if (onTaskCompleteMock) {
      setOnTaskComplete(() => onTaskCompleteMock);
    } else {
      setOnTaskComplete(jest.fn());
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
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestComponent />)).toThrow('useSharedTimerContext must be used within a SharedTimerProvider');
  });

  it('starts and pauses the timer', () => {
    render(
      <SharedTimerProvider>
        <TestComponent />
      </SharedTimerProvider>
    );

    fireEvent.click(screen.getByText('Start/Pause'));
    expect(screen.getByTestId('is-active')).toHaveTextContent('true');
    act(() => { jest.advanceTimersByTime(2000); });
    expect(screen.getByTestId('time-remaining')).toHaveTextContent('24:58');

    fireEvent.click(screen.getByText('Start/Pause'));
    expect(screen.getByTestId('is-active')).toHaveTextContent('false');
    act(() => { jest.advanceTimersByTime(2000); });
    expect(screen.getByTestId('time-remaining')).toHaveTextContent('24:58');
  });

  it('resets the timer', () => {
    render(
      <SharedTimerProvider>
        <TestComponent />
      </SharedTimerProvider>
    );

    fireEvent.click(screen.getByText('Start/Pause'));
    act(() => { jest.advanceTimersByTime(5000); });
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

    fireEvent.click(screen.getByText('Start/Pause'));
    await act(async () => {
      jest.advanceTimersByTime(WORK_DURATION * 1000);
    });

    expect(screen.getByTestId('mode')).toHaveTextContent('shortBreak');
    expect(screen.getByTestId('time-remaining')).toHaveTextContent(String(Math.floor(SHORT_BREAK_DURATION / 60)).padStart(2, '0') + ':00');
    expect(screen.getByTestId('pomodoros-completed')).toHaveTextContent('1');
    expect(screen.getByTestId('is-active')).toHaveTextContent('false');
  });

  it('skips the current session', async () => {
    render(
      <SharedTimerProvider>
        <TestComponent />
      </SharedTimerProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Skip'));
    });

    expect(screen.getByTestId('mode')).toHaveTextContent('shortBreak');
    expect(screen.getByTestId('pomodoros-completed')).toHaveTextContent('1');
  });

  it('saves and loads state from localStorage', () => {
    const state = { mode: 'shortBreak', timeRemaining: 100, isActive: true, pomodorosCompleted: 2, timestamp: Date.now() };
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
    const state = { mode: 'work', timeRemaining: 500, isActive: true, pomodorosCompleted: 0, timestamp: tenSecondsAgo };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));

    render(
      <SharedTimerProvider>
        <TestComponent />
      </SharedTimerProvider>
    );

    expect(screen.getByTestId('time-remaining')).toHaveTextContent('08:10'); // 500 - 10 = 490 seconds = 8:10
  });

  it('calls onTaskComplete callback when work session finishes', async () => {
    const mockOnTaskComplete = jest.fn(
      (taskId: string, taskData: TaskUpdateRequest): Promise<Task> => Promise.resolve({} as Task)
    );

    render(
      <SharedTimerProvider>
        <TestComponent onTaskCompleteMock={mockOnTaskComplete} />
      </SharedTimerProvider>
    );

    fireEvent.click(screen.getByText('Start/Pause'));
    await act(async () => {
      jest.advanceTimersByTime(WORK_DURATION * 1000);
    });

    expect(mockOnTaskComplete).toHaveBeenCalledTimes(1);
    expect(mockOnTaskComplete).toHaveBeenCalledWith("test-task-id", { status: "done" });
    expect(screen.getByTestId('mode')).toHaveTextContent('shortBreak');
  });
});

describe('SharedTimerContext - handleStartPause logic', () => {
  let hookResult: ReturnType<typeof useSharedTimerContext>;

  const TestHookWrapper: React.FC = () => {
    hookResult = useSharedTimerContext();
    return null;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    render(
      <SharedTimerProvider>
        <TestHookWrapper />
      </SharedTimerProvider>
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should call stopCurrentTask when pausing an active timer', async () => {
    // Spy on stopCurrentTask after initial setup and before it's called.
    // Ensure hookResult is defined. If it's not, the beforeEach didn't run as expected.
    if (!hookResult) throw new Error("Hook result not available");
    const stopCurrentTaskSpy = jest.spyOn(hookResult, 'stopCurrentTask');

    // Set up initial state: timer is active, simulate an active task
    act(() => {
      hookResult.setCurrentTaskId('test-task-id'); // Simulate an active task
      // Call handleStartPause once to make isActive true
      hookResult.handleStartPause();
    });

    // Pre-condition check
    expect(hookResult.isActive).toBe(true);

    // Call handleStartPause again to pause the timer (isActive true -> false)
    // This is when stopCurrentTask should be called
    await act(async () => {
      hookResult.handleStartPause();
    });

    expect(stopCurrentTaskSpy).toHaveBeenCalledTimes(1);
    expect(hookResult.isActive).toBe(false); // Timer should now be paused

    stopCurrentTaskSpy.mockRestore(); // Clean up spy
  });

  it('should not call stopCurrentTask when starting a timer (isActive is false)', async () => {
    if (!hookResult) throw new Error("Hook result not available");
    const stopCurrentTaskSpy = jest.spyOn(hookResult, 'stopCurrentTask');

    // Pre-condition check: timer is not active (default state after beforeEach)
    expect(hookResult.isActive).toBe(false);

    // Call handleStartPause to start the timer (isActive false -> true)
    await act(async () => {
      hookResult.handleStartPause();
    });

    expect(stopCurrentTaskSpy).not.toHaveBeenCalled();
    expect(hookResult.isActive).toBe(true); // Timer should now be active

    stopCurrentTaskSpy.mockRestore(); // Clean up spy
  });
});

describe('SharedTimerContext - handleReset logic', () => {
  let hookResult: ReturnType<typeof useSharedTimerContext> | null = null;

  // Component to capture hook result
  const TestHookWrapper = () => {
    hookResult = useSharedTimerContext();
    return null;
  };

  beforeEach(() => {
    jest.useFakeTimers(); // Added to be consistent with other describe blocks
    localStorage.clear(); // Added to be consistent
    hookResult = null; // Reset before each test
    render(
      <SharedTimerProvider>
        <TestHookWrapper />
      </SharedTimerProvider>
    );
  });

  afterEach(() => { // Added for consistency and cleanup
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should call stopCurrentTask when handleReset is called', async () => {
    if (!hookResult) throw new Error("Hook result not available for the test");

    // It's good practice to spy on the specific instance's method
    const stopCurrentTaskSpy = jest.spyOn(hookResult, 'stopCurrentTask');

    // Simulate an active task, as stopCurrentTask's logic might depend on it
    act(() => {
      if (!hookResult) throw new Error("Hook result not available during act setup");
      hookResult.setCurrentTaskId('test-task-id');
    });

    // Call handleReset
    await act(async () => {
      if (!hookResult) throw new Error("Hook result not available during act call");
      hookResult.handleReset();
    });

    expect(stopCurrentTaskSpy).toHaveBeenCalledTimes(1);
    stopCurrentTaskSpy.mockRestore(); // Clean up the spy
  });
});

describe('SharedTimerContext - switchToNextMode logic', () => {
  let hookResult: ReturnType<typeof useSharedTimerContext>; // Use existing hookResult type

  // Re-use TestHookWrapper and setup from other tests in this file
  const TestHookWrapper = () => {
    hookResult = useSharedTimerContext();
    return null;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    // hookResult is assigned during render
    render(
      <SharedTimerProvider>
        <TestHookWrapper />
      </SharedTimerProvider>
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should call stopCurrentTask when current mode is "work"', async () => {
    if (!hookResult) throw new Error("Hook result not available");

    // Default initial mode is 'work'
    expect(hookResult.mode).toBe('work');

    const stopCurrentTaskSpy = jest.spyOn(hookResult, 'stopCurrentTask');

    await act(async () => {
      await hookResult.switchToNextMode(); // work -> shortBreak
    });

    expect(stopCurrentTaskSpy).toHaveBeenCalledTimes(1);
    expect(hookResult.mode).toBe('shortBreak'); // Assuming pomodorosCompleted starts at 0
    expect(hookResult.pomodorosCompleted).toBe(1);
    stopCurrentTaskSpy.mockRestore();
  });

  it('should NOT call stopCurrentTask when current mode is "shortBreak"', async () => {
    if (!hookResult) throw new Error("Hook result not available");

    // First, transition from work -> shortBreak
    await act(async () => {
      await hookResult.switchToNextMode();
    });
    expect(hookResult.mode).toBe('shortBreak');

    const stopCurrentTaskSpy = jest.spyOn(hookResult, 'stopCurrentTask');

    await act(async () => {
      await hookResult.switchToNextMode(); // shortBreak -> work
    });

    expect(stopCurrentTaskSpy).not.toHaveBeenCalled();
    expect(hookResult.mode).toBe('work');
    stopCurrentTaskSpy.mockRestore();
  });

  it('should NOT call stopCurrentTask when current mode is "longBreak"', async () => {
    if (!hookResult) throw new Error("Hook result not available");

    const CYCLES_BEFORE_LONG_BREAK = 4; // From SharedTimerContext.tsx

    // Cycle through pomodoros to reach longBreak
    // Each full cycle: work -> (action) -> break -> (action) -> work
    for (let i = 0; i < CYCLES_BEFORE_LONG_BREAK; i++) {
      // Ensure we are in 'work' mode. If not (e.g. initial state or after a break), switch to it.
      // The default state IS 'work', so the first iteration doesn't need this.
      // After a break (e.g. shortBreak), switchToNextMode() goes to 'work'.
      if (hookResult.mode !== 'work') {
         await act(async () => { await hookResult.switchToNextMode(); });
      }
      // Now in 'work' mode. Calling switchToNextMode will increment pomodorosCompleted and go to a break.
      await act(async () => { await hookResult.switchToNextMode(); });
    }

    // After CYCLES_BEFORE_LONG_BREAK transitions from 'work', mode should be 'longBreak'
    expect(hookResult.mode).toBe('longBreak');
    expect(hookResult.pomodorosCompleted).toBe(CYCLES_BEFORE_LONG_BREAK);

    const stopCurrentTaskSpy = jest.spyOn(hookResult, 'stopCurrentTask');

    await act(async () => {
      await hookResult.switchToNextMode(); // longBreak -> work
    });

    expect(stopCurrentTaskSpy).not.toHaveBeenCalled();
    expect(hookResult.mode).toBe('work');
    // pomodorosCompleted remains the same when switching from break to work
    expect(hookResult.pomodorosCompleted).toBe(CYCLES_BEFORE_LONG_BREAK);
    stopCurrentTaskSpy.mockRestore();
  });
});
