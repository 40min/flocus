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
