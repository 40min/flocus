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

  it('switches from work to short break', () => {
    render(<PomodoroTimer />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    act(() => {
      jest.advanceTimersByTime(25 * 60 * 1000);
    });

    expect(screen.getByText('05:00')).toBeInTheDocument();
    expect(screen.getByText('Short Break')).toBeInTheDocument();
    expect(screen.getByText('Completed: 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument(); // Timer should be paused
  });

  it('switches from short break to work', () => {
    render(<PomodoroTimer />);
    // Go to first break
    fireEvent.click(screen.getByLabelText('Skip break'));
    expect(screen.getByText('05:00')).toBeInTheDocument();

    // Start and finish break
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    act(() => {
      jest.advanceTimersByTime(5 * 60 * 1000);
    });

    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByText('Focus')).toBeInTheDocument();
    expect(screen.getByText('Completed: 1')).toBeInTheDocument(); // Stays at 1
  });

  it('skips the current session', () => {
    render(<PomodoroTimer />);
    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByText('Focus')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Skip break'));

    expect(screen.getByText('05:00')).toBeInTheDocument();
    expect(screen.getByText('Short Break')).toBeInTheDocument();
    expect(screen.getByText('Completed: 1')).toBeInTheDocument();
  });
});
