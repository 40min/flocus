import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PomodoroTimer from './PomodoroTimer';

describe('PomodoroTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear(); // Clear localStorage before each test
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks(); // Restore all mocks after each test
  });

  it('renders initial state correctly', () => {
    render(<PomodoroTimer />);
    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByText('Focus')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
    expect(screen.getByText('Completed: 0')).toBeInTheDocument();
  });

  it('starts and pauses the timer', () => {
    render(<PomodoroTimer />);

    // Start timer
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();

    // Advance time
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByText('24:58')).toBeInTheDocument();

    // Pause timer
    fireEvent.click(screen.getByRole('button', { name: /pause/i }));
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();

    // Time should not advance further
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByText('24:58')).toBeInTheDocument();
  });

  it('resets the timer', () => {
    render(<PomodoroTimer />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByText('24:55')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Reset timer'));
    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
  });

  it('switches from work to short break', async () => {
    render(<PomodoroTimer />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    await act(async () => {
      jest.advanceTimersByTime(25 * 60 * 1000);
    });

    expect(screen.getByText('05:00')).toBeInTheDocument();
    expect(screen.getByText('Short Break')).toBeInTheDocument();
    expect(screen.getByText('Completed: 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument(); // Timer should be paused
  });

  it('switches from short break to work', async () => {
    render(<PomodoroTimer />);
    // Go to first break
    fireEvent.click(screen.getByLabelText('Skip break'));
    // The state update from skipping needs to be processed before assertion
    await screen.findByText('05:00'); // Use findByText to wait for the element to appear
    expect(screen.getByText('Short Break')).toBeInTheDocument();

    // Start and finish break
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    await act(async () => {
      jest.advanceTimersByTime(5 * 60 * 1000);
    });

    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByText('Focus')).toBeInTheDocument();
    expect(screen.getByText('Completed: 1')).toBeInTheDocument(); // Stays at 1
  });

  it('skips the current session', async () => {
    render(<PomodoroTimer />);
    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByText('Focus')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Skip break'));
    await screen.findByText('05:00'); // Wait for the element to appear

    expect(screen.getByText('Short Break')).toBeInTheDocument();
    expect(screen.getByText('Completed: 1')).toBeInTheDocument();
  });

  it('calls onTaskComplete with correct data when work session finishes', async () => {
    const mockOnTaskComplete = jest.fn(() => Promise.resolve({} as any)); // Mock return value
    const taskId = 'task-123';

    render(<PomodoroTimer currentTaskId={taskId} onTaskComplete={mockOnTaskComplete} />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    await act(async () => {
      jest.advanceTimersByTime(25 * 60 * 1000);
    });

    expect(mockOnTaskComplete).toHaveBeenCalledTimes(1);
    expect(mockOnTaskComplete).toHaveBeenCalledWith(taskId, { status: 'done' });
  });

  it('calls onTaskComplete when work session is skipped', async () => {
    const mockOnTaskComplete = jest.fn(() => Promise.resolve({} as any));
    const taskId = 'task-123';

    render(<PomodoroTimer currentTaskId={taskId} onTaskComplete={mockOnTaskComplete} />);

    // Skip work session
    fireEvent.click(screen.getByLabelText('Skip break'));
    await screen.findByText('05:00'); // Wait for the element to appear

    expect(mockOnTaskComplete).toHaveBeenCalledTimes(1);
    expect(mockOnTaskComplete).toHaveBeenCalledWith(taskId, { status: 'done' });
    expect(screen.getByText('Short Break')).toBeInTheDocument(); // Should be in short break
  });

  it('does not call onTaskComplete when a break session completes naturally', async () => {
    const mockOnTaskComplete = jest.fn(() => Promise.resolve({} as any));
    const taskId = 'task-123';

    render(<PomodoroTimer currentTaskId={taskId} onTaskComplete={mockOnTaskComplete} />);

    // Complete a work session to get into a break
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    await act(async () => {
      jest.advanceTimersByTime(25 * 60 * 1000);
    });
    expect(mockOnTaskComplete).toHaveBeenCalledTimes(1); // onTaskComplete called for work session
    mockOnTaskComplete.mockClear(); // Clear the mock calls

    // Start and finish the break session
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    await act(async () => {
      jest.advanceTimersByTime(5 * 60 * 1000);
    });

    expect(mockOnTaskComplete).not.toHaveBeenCalled(); // Should not be called for break session
    expect(screen.getByText('25:00')).toBeInTheDocument(); // Should be back to work
    expect(screen.getByText('Focus')).toBeInTheDocument();
  });

  it('does not call onTaskComplete if currentTaskId is not provided', async () => {
    const mockOnTaskComplete = jest.fn(() => Promise.resolve({} as any));

    render(<PomodoroTimer onTaskComplete={mockOnTaskComplete} />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    await act(async () => {
      jest.advanceTimersByTime(25 * 60 * 1000);
    });

    expect(mockOnTaskComplete).not.toHaveBeenCalled();
  });

  it('does not call onTaskComplete if onTaskComplete prop is not provided', async () => {
    const taskId = 'task-123';

    render(<PomodoroTimer currentTaskId={taskId} />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    await act(async () => {
      jest.advanceTimersByTime(25 * 60 * 1000);
    });

    // No error should be thrown, and no call should happen
    // We can't directly assert not called if it's not a mock, but the test should pass without errors.
  });
});
