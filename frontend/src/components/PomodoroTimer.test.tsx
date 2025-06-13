import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PomodoroTimer from './PomodoroTimer';
import { useSharedTimerContext } from '../context/SharedTimerContext';

// Mock the useSharedTimerContext hook
jest.mock('../context/SharedTimerContext', () => ({
  useSharedTimerContext: jest.fn(),
}));

const mockUseSharedTimerContext = useSharedTimerContext as jest.Mock;

describe('PomodoroTimer', () => {
  const mockContextValue = {
    mode: 'work',
    timeRemaining: 25 * 60,
    isActive: false,
    pomodorosCompleted: 0,
    handleStartPause: jest.fn(),
    handleReset: jest.fn(),
    handleSkip: jest.fn(),
    formatTime: (seconds: number) => {
      const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
      const secs = (seconds % 60).toString().padStart(2, '0');
      return `${mins}:${secs}`;
    },
    isBreak: false,
    timerColor: 'border-gray-700',
    buttonBgColor: 'bg-white hover:bg-gray-200',
    buttonTextColor: 'text-gray-900',
    modeText: {
      work: 'Focus',
      shortBreak: 'Short Break',
      longBreak: 'Long Break',
    },
    currentTaskId: undefined,
    onTaskComplete: undefined,
    setCurrentTaskId: jest.fn(),
    setOnTaskComplete: jest.fn(),
  };

  beforeEach(() => {
    mockUseSharedTimerContext.mockReturnValue(mockContextValue);
    jest.clearAllMocks();
  });

  it('renders initial state from context', () => {
    render(<PomodoroTimer />);
    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByText('Focus')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
    expect(screen.getByText('Completed: 0')).toBeInTheDocument();
  });

  it('calls handleStartPause when start/pause button is clicked', () => {
    render(<PomodoroTimer />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    expect(mockContextValue.handleStartPause).toHaveBeenCalledTimes(1);
  });

  it('calls handleReset when reset button is clicked', () => {
    render(<PomodoroTimer />);
    fireEvent.click(screen.getByLabelText('Reset timer'));
    expect(mockContextValue.handleReset).toHaveBeenCalledTimes(1);
  });

  it('calls handleSkip when skip button is clicked', () => {
    render(<PomodoroTimer />);
    fireEvent.click(screen.getByLabelText('Skip break'));
    expect(mockContextValue.handleSkip).toHaveBeenCalledTimes(1);
  });

  it('displays pause button when timer is active from context', () => {
    mockUseSharedTimerContext.mockReturnValue({
      ...mockContextValue,
      isActive: true,
    });
    render(<PomodoroTimer />);
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });

  it('displays correct time and mode based on context', () => {
    mockUseSharedTimerContext.mockReturnValue({
      ...mockContextValue,
      mode: 'shortBreak',
      timeRemaining: 5 * 60,
      pomodorosCompleted: 1,
    });
    render(<PomodoroTimer />);
    expect(screen.getByText('05:00')).toBeInTheDocument();
    expect(screen.getByText('Short Break')).toBeInTheDocument();
    expect(screen.getByText('Completed: 1')).toBeInTheDocument();
  });
});
