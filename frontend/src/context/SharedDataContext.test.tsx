import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { SharedDataProvider, useSharedDataContext, TimerState } from './SharedDataContext';

const TestComponent: React.FC<{ onWorkComplete?: () => Promise<void> }> = ({ onWorkComplete }) => {
  const {
    mode,
    timeRemaining,
    isActive,
    pomodorosCompleted,
    handleStartPause,
    handleReset,
    handleSkip,
    registerOnWorkComplete,
    unregisterOnWorkComplete,
  } = useSharedDataContext();

  React.useEffect(() => {
    if (onWorkComplete) {
      registerOnWorkComplete(onWorkComplete);
    }
    return () => {
      if (onWorkComplete) {
        unregisterOnWorkComplete();
      }
    };
  }, [onWorkComplete, registerOnWorkComplete, unregisterOnWorkComplete]);

  return (
    <div>
      <div data-testid="mode">{mode}</div>
      <div data-testid="timeRemaining">{timeRemaining}</div>
      <div data-testid="isActive">{String(isActive)}</div>
      <div data-testid="pomodorosCompleted">{pomodorosCompleted}</div>
      <button onClick={handleStartPause}>StartPause</button>
      <button onClick={handleReset}>Reset</button>
      <button onClick={handleSkip}>Skip</button>
    </div>
  );
};

const WORK_DURATION = 25 * 60;
const SHORT_BREAK_DURATION = 5 * 60;
const LOCAL_STORAGE_KEY = 'pomodoroTimerState';

describe('SharedDataContext', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('provides initial state', () => {
    render(
      <SharedDataProvider>
        <TestComponent />
      </SharedDataProvider>
    );
    expect(screen.getByTestId('mode')).toHaveTextContent('work');
    expect(screen.getByTestId('timeRemaining')).toHaveTextContent(String(WORK_DURATION));
    expect(screen.getByTestId('isActive')).toHaveTextContent('false');
    expect(screen.getByTestId('pomodorosCompleted')).toHaveTextContent('0');
  });

  it('starts and pauses the timer', () => {
    render(<SharedDataProvider><TestComponent /></SharedDataProvider>);
    fireEvent.click(screen.getByText('StartPause'));
    expect(screen.getByTestId('isActive')).toHaveTextContent('true');
    act(() => { jest.advanceTimersByTime(2000); });
    expect(screen.getByTestId('timeRemaining')).toHaveTextContent(String(WORK_DURATION - 2));
    fireEvent.click(screen.getByText('StartPause'));
    expect(screen.getByTestId('isActive')).toHaveTextContent('false');
    act(() => { jest.advanceTimersByTime(2000); });
    expect(screen.getByTestId('timeRemaining')).toHaveTextContent(String(WORK_DURATION - 2));
  });

  it('resets the timer', () => {
    render(<SharedDataProvider><TestComponent /></SharedDataProvider>);
    fireEvent.click(screen.getByText('StartPause'));
    act(() => { jest.advanceTimersByTime(5000); });
    fireEvent.click(screen.getByText('Reset'));
    expect(screen.getByTestId('timeRemaining')).toHaveTextContent(String(WORK_DURATION));
    expect(screen.getByTestId('isActive')).toHaveTextContent('false');
  });

  it('switches from work to short break after timer finishes', () => {
    render(<SharedDataProvider><TestComponent /></SharedDataProvider>);
    fireEvent.click(screen.getByText('StartPause'));
    act(() => { jest.advanceTimersByTime(WORK_DURATION * 1000); });
    expect(screen.getByTestId('mode')).toHaveTextContent('shortBreak');
    expect(screen.getByTestId('timeRemaining')).toHaveTextContent(String(SHORT_BREAK_DURATION));
    expect(screen.getByTestId('pomodorosCompleted')).toHaveTextContent('1');
    expect(screen.getByTestId('isActive')).toHaveTextContent('false');
  });

  it('skips the current session', () => {
    render(<SharedDataProvider><TestComponent /></SharedDataProvider>);
    fireEvent.click(screen.getByText('Skip'));
    expect(screen.getByTestId('mode')).toHaveTextContent('shortBreak');
    expect(screen.getByTestId('pomodorosCompleted')).toHaveTextContent('1');
  });

  it('saves and loads state from localStorage', () => {
    const state: TimerState = { mode: 'shortBreak', timeRemaining: 100, isActive: true, pomodorosCompleted: 2, timestamp: Date.now() };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    render(<SharedDataProvider><TestComponent /></SharedDataProvider>);
    expect(screen.getByTestId('mode')).toHaveTextContent('shortBreak');
    expect(screen.getByTestId('timeRemaining')).toHaveTextContent('100');
    expect(screen.getByTestId('isActive')).toHaveTextContent('true');
    expect(screen.getByTestId('pomodorosCompleted')).toHaveTextContent('2');
  });

  it('calculates elapsed time on load', () => {
    const tenSecondsAgo = Date.now() - 10000;
    const state: TimerState = { mode: 'work', timeRemaining: 500, isActive: true, pomodorosCompleted: 0, timestamp: tenSecondsAgo };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    render(<SharedDataProvider><TestComponent /></SharedDataProvider>);
    expect(screen.getByTestId('timeRemaining')).toHaveTextContent('490');
  });

  it('calls onWorkComplete callback when work session finishes', async () => {
    const onWorkComplete = jest.fn(() => Promise.resolve());
    render(
      <SharedDataProvider>
        <TestComponent onWorkComplete={onWorkComplete} />
      </SharedDataProvider>
    );

    fireEvent.click(screen.getByText('StartPause'));
    await act(async () => {
      jest.advanceTimersByTime(WORK_DURATION * 1000);
    });

    expect(onWorkComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('mode')).toHaveTextContent('shortBreak');
  });
});
