import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PomodoroTimer from './PomodoroTimer';
import { useSharedDataContext } from '../context/SharedDataContext';
import { Task, TaskUpdateRequest } from '../types/task';

// Mock the context to control its values
jest.mock('../context/SharedDataContext', () => {
  const originalModule = jest.requireActual('../context/SharedDataContext');
  return {
    ...originalModule,
    useSharedDataContext: jest.fn(),
  };
});

const mockedUseSharedDataContext = useSharedDataContext as jest.Mock;

describe('PomodoroTimer', () => {
  const mockContextValue = {
    mode: 'work' as const,
    timeRemaining: 1500, // 25:00
    isActive: false,
    pomodorosCompleted: 0,
    handleStartPause: jest.fn(),
    handleReset: jest.fn(),
    handleSkip: jest.fn(),
    registerOnWorkComplete: jest.fn(),
    unregisterOnWorkComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseSharedDataContext.mockReturnValue(mockContextValue);
  });

  it('renders initial state from context', () => {
    render(<PomodoroTimer />);
    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByText('Focus')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
    expect(screen.getByText('Completed: 0')).toBeInTheDocument();
  });

  it('displays pause button when timer is active', () => {
    mockedUseSharedDataContext.mockReturnValue({ ...mockContextValue, isActive: true });
    render(<PomodoroTimer />);
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });

  it('calls handleStartPause on start/pause button click', () => {
    render(<PomodoroTimer />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    expect(mockContextValue.handleStartPause).toHaveBeenCalledTimes(1);
  });

  it('calls handleReset on reset button click', () => {
    render(<PomodoroTimer />);
    fireEvent.click(screen.getByLabelText('Reset timer'));
    expect(mockContextValue.handleReset).toHaveBeenCalledTimes(1);
  });

  it('calls handleSkip on skip button click', () => {
    render(<PomodoroTimer />);
    fireEvent.click(screen.getByLabelText('Skip break'));
    expect(mockContextValue.handleSkip).toHaveBeenCalledTimes(1);
  });

  it('registers and unregisters onWorkComplete callback', () => {
    const onTaskComplete = jest.fn(
      (taskId: string, taskData: TaskUpdateRequest): Promise<Task> => Promise.resolve({} as Task)
    );
    const { unmount } = render(
      <PomodoroTimer currentTaskId="task-123" onTaskComplete={onTaskComplete} />
    );

    expect(mockContextValue.registerOnWorkComplete).toHaveBeenCalledTimes(1);
    expect(mockContextValue.registerOnWorkComplete).toHaveBeenCalledWith(expect.any(Function));

    unmount();
    expect(mockContextValue.unregisterOnWorkComplete).toHaveBeenCalledTimes(1);
  });
});
