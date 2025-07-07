import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CurrentTasks from './CurrentTasks';
import { useCurrentTimeWindow } from '../hooks/useCurrentTimeWindow';
import { useSharedTimerContext } from '../context/SharedTimerContext';
import { DndContext } from '@dnd-kit/core';
import { Task } from 'types/task';
import { TimeWindow } from 'types/timeWindow';
import { useDeleteTask, useUpdateTask } from 'hooks/useTasks';
import { SharedTimerProvider } from '../context/SharedTimerContext';
import { getTodayStats } from '../services/userDailyStatsService';

jest.mock('../hooks/useCurrentTimeWindow');
jest.mock('../context/SharedTimerContext', () => ({
  ...jest.requireActual('../context/SharedTimerContext'),
  useSharedTimerContext: jest.fn(),
}));
jest.mock('hooks/useTasks');
jest.mock('../services/userDailyStatsService');

const mockedUseCurrentTimeWindow = useCurrentTimeWindow as jest.Mock;
const mockedUseSharedTimerContext = useSharedTimerContext as jest.Mock;
const mockedUseDeleteTask = useDeleteTask as jest.Mock;
const mockedUseUpdateTask = useUpdateTask as jest.Mock;

const mockTimeWindow: TimeWindow = {
  id: 'tw1',
  description: 'Morning Focus',
  start_time: 540,
  end_time: 720,
  category: { id: 'cat1', name: 'Work', user_id: 'user1', is_deleted: false },
  day_template_id: 'dt1',
  user_id: 'user1',
  is_deleted: false,
};

const mockTasks: Task[] = [
  { id: 'task1', title: 'Task One', status: 'pending', priority: 'medium', user_id: 'user1', statistics: { lasts_min: 30 } },
  { id: 'task2', title: 'Task Two', status: 'pending', priority: 'high', user_id: 'user1', statistics: { lasts_min: 60 } },
];

const queryClient = new QueryClient();

const renderWithDnd = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <SharedTimerProvider>
        <DndContext onDragEnd={() => {}}>
          {component}
        </DndContext>
      </SharedTimerProvider>
    </QueryClientProvider>
  );
};

describe('CurrentTasks', () => {
  const mockHandleStartPause = jest.fn();
  const mockStopCurrentTask = jest.fn();
  const mockDeleteTask = jest.fn();
  const mockUpdateTask = jest.fn();
  const mockOnSelectTask = jest.fn();
  const mockSetCurrentTaskId = jest.fn();
  const mockSetIsActive = jest.fn();
  const mockSetCurrentTaskName = jest.fn();
  const mockSetCurrentTaskDescription = jest.fn();
  const mockHandleMarkAsDone = jest.fn();

  beforeEach(() => {
    (getTodayStats as jest.Mock).mockResolvedValue({ pomodoros_completed: 0 });
    mockedUseSharedTimerContext.mockReturnValue({
      currentTaskId: null,
      isActive: false,
      handleStartPause: mockHandleStartPause,
      stopCurrentTask: mockStopCurrentTask,
      setCurrentTaskId: mockSetCurrentTaskId,
      setIsActive: mockSetIsActive,
      setCurrentTaskName: mockSetCurrentTaskName,
      setCurrentTaskDescription: mockSetCurrentTaskDescription,
      handleMarkAsDone: mockHandleMarkAsDone,
    });
    mockedUseDeleteTask.mockReturnValue({
      mutate: mockDeleteTask,
    });
    mockedUseUpdateTask.mockReturnValue({
      mutate: mockUpdateTask,
      isPending: false,
    });
    jest.clearAllMocks();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows "no works planned" message when there is no current time window', () => {
    mockedUseCurrentTimeWindow.mockReturnValue({ currentTimeWindow: null, currentTasks: [] });
    renderWithDnd(<CurrentTasks dailyPlan={null} onSelectTask={mockOnSelectTask} />);
    expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
    expect(screen.getByText('No works planned for this time.')).toBeInTheDocument();
  });

  it('shows "no tasks" message when there is a time window but no tasks', () => {
    mockedUseCurrentTimeWindow.mockReturnValue({ currentTimeWindow: mockTimeWindow, currentTasks: [] });
    renderWithDnd(<CurrentTasks dailyPlan={{} as any} onSelectTask={mockOnSelectTask} />); // Pass dummy plan to trigger hook
    expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
    expect(screen.getByText('No tasks for the current time window.')).toBeInTheDocument();
    expect(screen.getByText('Drag tasks to the timer to start focusing')).toBeInTheDocument();
  });

  it('renders a list of tasks when they are available', () => {
    mockedUseCurrentTimeWindow.mockReturnValue({ currentTimeWindow: mockTimeWindow, currentTasks: mockTasks });
    renderWithDnd(<CurrentTasks dailyPlan={{} as any} onSelectTask={mockOnSelectTask} />);
    expect(screen.getByText('Task One')).toBeInTheDocument();
    expect(screen.getByText('Task Two')).toBeInTheDocument();
    expect(screen.getByText('0h 30m')).toBeInTheDocument(); // Check duration formatting
    expect(screen.getByText('1h 0m')).toBeInTheDocument();
  });

  it('disables dragging for the currently active task', () => {
    mockedUseCurrentTimeWindow.mockReturnValue({ currentTimeWindow: mockTimeWindow, currentTasks: mockTasks });
    mockedUseSharedTimerContext.mockReturnValue({
      currentTaskId: 'task1', // Task One is active
      isActive: true,
      handleStartPause: mockHandleStartPause,
      stopCurrentTask: mockStopCurrentTask,
      setCurrentTaskId: mockSetCurrentTaskId,
      setIsActive: mockSetIsActive,
      setCurrentTaskName: mockSetCurrentTaskName,
      setCurrentTaskDescription: mockSetCurrentTaskDescription,
      handleMarkAsDone: mockHandleMarkAsDone,
    });
    renderWithDnd(<CurrentTasks dailyPlan={{} as any} onSelectTask={mockOnSelectTask} />);
    // eslint-disable-next-line testing-library/no-node-access
    const taskOneCard = screen.getByLabelText('Drag task: Task One').parentElement;
    expect(taskOneCard).toHaveClass('cursor-not-allowed', 'opacity-70');
  });

  it('renders a task with a long description and a markdown link', () => {
    const longDescriptionTask: Task[] = [
      {
        id: 'task3',
        title: 'Task with Link',
        description: 'This is a long description with a link to [Google](https://www.google.com). It should not be truncated.',
        status: 'pending',
        priority: 'low',
        user_id: 'user1',
      },
    ];
    mockedUseCurrentTimeWindow.mockReturnValue({ currentTimeWindow: mockTimeWindow, currentTasks: longDescriptionTask });
    renderWithDnd(<CurrentTasks dailyPlan={{} as any} onSelectTask={mockOnSelectTask} />);

    // Use regex to match the text because ReactMarkdown breaks it into multiple elements
    expect(screen.getByText(/This is a long description with a link to/, { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/It should not be truncated./, { exact: false })).toBeInTheDocument();

    const linkElement = screen.getByRole('link', { name: 'Google' });
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveAttribute('href', 'https://www.google.com');
    expect(linkElement).toHaveAttribute('target', '_blank');
    expect(linkElement).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('disables "Start task" button when a task is active', () => {
    mockedUseCurrentTimeWindow.mockReturnValue({ currentTimeWindow: mockTimeWindow, currentTasks: mockTasks });
    mockedUseSharedTimerContext.mockReturnValue({
      currentTaskId: 'task1',
      isActive: true,
      handleStartPause: mockHandleStartPause,
      stopCurrentTask: mockStopCurrentTask,
      setCurrentTaskId: mockSetCurrentTaskId,
      setIsActive: mockSetIsActive,
      setCurrentTaskName: mockSetCurrentTaskName,
      setCurrentTaskDescription: mockSetCurrentTaskDescription,
      handleMarkAsDone: mockHandleMarkAsDone,
    });
    renderWithDnd(<CurrentTasks dailyPlan={{} as any} onSelectTask={mockOnSelectTask} />);

    const startButton = screen.getAllByRole('button', { name: 'Start task' })[0];
    expect(startButton).toBeDisabled();
  });

  it('calls handleStartPause when "Pause task" button is clicked for the active task', () => {
    mockedUseCurrentTimeWindow.mockReturnValue({ currentTimeWindow: mockTimeWindow, currentTasks: mockTasks });
    mockedUseSharedTimerContext.mockReturnValue({
      currentTaskId: 'task1',
      isActive: true,
      handleStartPause: mockHandleStartPause,
      stopCurrentTask: mockStopCurrentTask,
      setCurrentTaskId: mockSetCurrentTaskId,
      setIsActive: mockSetIsActive,
      setCurrentTaskName: mockSetCurrentTaskName,
      setCurrentTaskDescription: mockSetCurrentTaskDescription,
      handleMarkAsDone: mockHandleMarkAsDone,
    });
    renderWithDnd(<CurrentTasks dailyPlan={{} as any} onSelectTask={mockOnSelectTask} />);

    const pauseButton = screen.getAllByRole('button', { name: 'Pause task' })[0];
    fireEvent.click(pauseButton);

    expect(mockHandleStartPause).toHaveBeenCalledTimes(1);
  });

  it('disables "Pause task" button when timer is not active or it is not the active task', () => {
    mockedUseCurrentTimeWindow.mockReturnValue({ currentTimeWindow: mockTimeWindow, currentTasks: mockTasks });
    // Case 1: Timer not active
    mockedUseSharedTimerContext.mockReturnValue({
      currentTaskId: 'task1',
      isActive: false,
      handleStartPause: mockHandleStartPause,
      stopCurrentTask: mockStopCurrentTask,
      setCurrentTaskId: mockSetCurrentTaskId,
      setIsActive: mockSetIsActive,
      setCurrentTaskName: mockSetCurrentTaskName,
      setCurrentTaskDescription: mockSetCurrentTaskDescription,
      handleMarkAsDone: mockHandleMarkAsDone,
    });
    const { rerender } = renderWithDnd(<CurrentTasks dailyPlan={{} as any} onSelectTask={mockOnSelectTask} />);
    let pauseButton = screen.getAllByRole('button', { name: 'Pause task' })[0];
    expect(pauseButton).toBeDisabled();

    // Case 2: Timer active, but different task is active
    mockedUseSharedTimerContext.mockReturnValue({
      currentTaskId: 'another-task-id',
      isActive: true,
      handleStartPause: mockHandleStartPause,
      stopCurrentTask: mockStopCurrentTask,
      setCurrentTaskId: mockSetCurrentTaskId,
      setIsActive: mockSetIsActive,
      setCurrentTaskName: mockSetCurrentTaskName,
      setCurrentTaskDescription: mockSetCurrentTaskDescription,
      handleMarkAsDone: mockHandleMarkAsDone,
    });
    rerender(<CurrentTasks dailyPlan={{} as any} onSelectTask={mockOnSelectTask} />);
    pauseButton = screen.getAllByRole('button', { name: 'Pause task' })[0];
    expect(pauseButton).toBeDisabled();
  });

  it('calls deleteTask when "Delete task" button is clicked and confirmed', async () => {
    mockedUseCurrentTimeWindow.mockReturnValue({ currentTimeWindow: mockTimeWindow, currentTasks: mockTasks });
    renderWithDnd(<CurrentTasks dailyPlan={{} as any} onSelectTask={mockOnSelectTask} />);

    const deleteButton = screen.getAllByRole('button', { name: 'Delete task' })[0];
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete the task "Task One"?');
    await waitFor(() => expect(mockDeleteTask).toHaveBeenCalledWith('task1'));
    expect(mockStopCurrentTask).not.toHaveBeenCalled();
  });

  it('calls stopCurrentTask and then deleteTask when "Delete task" is clicked for the active task and confirmed', async () => {
    mockedUseCurrentTimeWindow.mockReturnValue({ currentTimeWindow: mockTimeWindow, currentTasks: mockTasks });
    mockedUseSharedTimerContext.mockReturnValue({
      currentTaskId: 'task1',
      isActive: true,
      handleStartPause: mockHandleStartPause,
      stopCurrentTask: mockStopCurrentTask,
      setCurrentTaskId: mockSetCurrentTaskId,
      setIsActive: mockSetIsActive,
      setCurrentTaskName: mockSetCurrentTaskName,
      setCurrentTaskDescription: mockSetCurrentTaskDescription,
      handleMarkAsDone: mockHandleMarkAsDone,
    });
    renderWithDnd(<CurrentTasks dailyPlan={{} as any} onSelectTask={mockOnSelectTask} />);

    const deleteButton = screen.getAllByRole('button', { name: 'Delete task' })[0];
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete the task "Task One"?');
    await waitFor(() => expect(mockStopCurrentTask).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockDeleteTask).toHaveBeenCalledWith('task1'));
  });

  it('does not call deleteTask if confirmation is cancelled', () => {
    jest.spyOn(window, 'confirm').mockReturnValue(false);
    mockedUseCurrentTimeWindow.mockReturnValue({ currentTimeWindow: mockTimeWindow, currentTasks: mockTasks });
    renderWithDnd(<CurrentTasks dailyPlan={{} as any} onSelectTask={mockOnSelectTask} />);

    const deleteButton = screen.getAllByRole('button', { name: 'Delete task' })[0];
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete the task "Task One"?');
    expect(mockDeleteTask).not.toHaveBeenCalled();
    expect(mockStopCurrentTask).not.toHaveBeenCalled();
  });

  it('calls handleMarkAsDone when "Mark as Done" is clicked', async () => {
    mockedUseCurrentTimeWindow.mockReturnValue({ currentTimeWindow: mockTimeWindow, currentTasks: mockTasks });
    mockedUseSharedTimerContext.mockReturnValue({
      currentTaskId: null,
      isActive: false,
      handleStartPause: mockHandleStartPause,
      stopCurrentTask: mockStopCurrentTask,
      setCurrentTaskId: mockSetCurrentTaskId,
      setIsActive: mockSetIsActive,
      setCurrentTaskName: mockSetCurrentTaskName,
      setCurrentTaskDescription: mockSetCurrentTaskDescription,
      handleMarkAsDone: mockHandleMarkAsDone,
    });
    renderWithDnd(<CurrentTasks dailyPlan={{} as any} onSelectTask={mockOnSelectTask} />);

    const markAsDoneButton = screen.getAllByRole('button', { name: 'Mark as Done' })[0];
    fireEvent.click(markAsDoneButton);

    await waitFor(() => expect(mockHandleMarkAsDone).toHaveBeenCalledWith('task1'));
  });

  it('disables "Mark as Done" button if update is pending', () => {
    mockedUseCurrentTimeWindow.mockReturnValue({ currentTimeWindow: mockTimeWindow, currentTasks: mockTasks });
    mockedUseUpdateTask.mockReturnValue({
      mutate: mockUpdateTask,
      isPending: true, // Simulate pending update
    });
    renderWithDnd(<CurrentTasks dailyPlan={{} as any} onSelectTask={mockOnSelectTask} />);
    const markAsDoneButton = screen.getAllByRole('button', { name: 'Mark as Done' })[0];
    expect(markAsDoneButton).toBeDisabled();
  });

  it('does not render tasks with status "done"', () => {
    const tasksWithDone: Task[] = [
      { id: 'task1', title: 'Task One', status: 'pending', priority: 'medium', user_id: 'user1' },
      { id: 'task2', title: 'Task Two', status: 'done', priority: 'high', user_id: 'user1' },
      { id: 'task3', title: 'Task Three', status: 'pending', priority: 'low', user_id: 'user1' },
    ];
    mockedUseCurrentTimeWindow.mockReturnValue({ currentTimeWindow: mockTimeWindow, currentTasks: tasksWithDone });
    renderWithDnd(<CurrentTasks dailyPlan={{} as any} onSelectTask={mockOnSelectTask} />);

    expect(screen.getByText('Task One')).toBeInTheDocument();
    expect(screen.queryByText('Task Two')).not.toBeInTheDocument(); // Task Two should be filtered out
    expect(screen.getByText('Task Three')).toBeInTheDocument();
  });
});
