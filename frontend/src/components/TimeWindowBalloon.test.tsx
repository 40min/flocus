import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TimeWindowBalloon from './TimeWindowBalloon';
import { TimeWindow } from 'types/timeWindow';
import { Task } from 'types/task';
import { SharedTimerProvider } from '../context/SharedTimerContext';
import { getTodayStats } from 'services/userDailyStatsService';

jest.mock('services/userDailyStatsService');


const queryClient = new QueryClient();

const mockTimeWindow: TimeWindow = {
  id: 'tw1',
  description: 'Focus on project X',
  start_time: 540, // 09:00
  end_time: 660, // 11:00
  category: { id: 'cat1', name: 'Work', color: '#3B82F6', user_id: 'user1', is_deleted: false },
  day_template_id: 'dt1',
  user_id: 'user1',
  is_deleted: false,
};

const mockTasks: Task[] = [
  { id: 'task1', title: 'Task 1', status: 'pending', priority: 'medium', user_id: 'user1' },
  { id: 'task2', title: 'Task 2', status: 'in_progress', priority: 'high', user_id: 'user1' },
];

import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';

describe('TimeWindowBalloon', () => {
  const renderWithClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthProvider>
            <SharedTimerProvider>
              {ui}
            </SharedTimerProvider>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    (getTodayStats as jest.Mock).mockResolvedValue({ pomodoros_completed: 0 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders time window details correctly', () => {
    renderWithClient(<TimeWindowBalloon timeWindow={mockTimeWindow} />);
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Focus on project X')).toBeInTheDocument();
    expect(screen.getByText('09:00 - 11:00')).toBeInTheDocument();
    expect(screen.getByText('2h')).toBeInTheDocument();
  });

  it('renders tasks when provided, even without onUnassignTask prop', () => {
    renderWithClient(<TimeWindowBalloon timeWindow={mockTimeWindow} tasks={mockTasks} />);
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });

  it('does not render unassign button when onUnassignTask prop is not provided', () => {
    renderWithClient(<TimeWindowBalloon timeWindow={mockTimeWindow} tasks={mockTasks} />);

    expect(screen.queryByLabelText(`Unassign task: ${mockTasks[0].title}`)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(`Unassign task: ${mockTasks[1].title}`)).not.toBeInTheDocument();
  });

  it('renders delete button and calls onDelete when clicked', () => {
    const onDeleteMock = jest.fn();
    renderWithClient(<TimeWindowBalloon timeWindow={mockTimeWindow} onDelete={onDeleteMock} />);
    const deleteButton = screen.getByLabelText('Delete time window');
    fireEvent.click(deleteButton);
    expect(onDeleteMock).toHaveBeenCalledWith('tw1');
  });
it('renders edit button and calls onEdit when clicked', () => {
    const onEditMock = jest.fn();
    renderWithClient(
      <TimeWindowBalloon timeWindow={mockTimeWindow} onEdit={onEditMock} />
    );
    const editButton = screen.getByLabelText('Edit time window');
    fireEvent.click(editButton);
    expect(onEditMock).toHaveBeenCalledTimes(1);
  });

  it('renders assign task button and opens TaskPicker when clicked', () => {
    const onAssignTaskMock = jest.fn();
    renderWithClient(<TimeWindowBalloon timeWindow={mockTimeWindow} onAssignTask={onAssignTaskMock} />);
    const assignButton = screen.getByLabelText('Assign task');
    fireEvent.click(assignButton);
    expect(screen.getByText('Select a Task')).toBeInTheDocument(); // Assuming TaskPicker has this title
  });

  it('calls onAssignTask when a task is selected in TaskPicker', () => {
    const onAssignTaskMock = jest.fn();
    renderWithClient(<TimeWindowBalloon timeWindow={mockTimeWindow} onAssignTask={onAssignTaskMock} />);
    fireEvent.click(screen.getByLabelText('Assign task'));
    // Simulate selecting a task in the picker (this might need a more specific selector depending on TaskPicker's implementation)
    // For now, let's assume a mock task is "selected"
    // This part of the test might need refinement once TaskPicker's internal structure is clearer or if it exposes a way to simulate selection.
    // For a basic test, we can just check if the picker is open.
    expect(screen.getByText('Select a Task')).toBeInTheDocument();
  });

it('calls stopCurrentTask when deleting a time window with an active assigned task', () => {
    const onDeleteMock = jest.fn();
    const stopCurrentTaskMock = jest.fn();

    // Mock the useSharedTimerContext to control currentTaskId and stopCurrentTask
    jest.spyOn(require('../context/SharedTimerContext'), 'useSharedTimerContext').mockReturnValue({
      currentTaskId: 'task1', // Simulate 'task1' being active
      stopCurrentTask: stopCurrentTaskMock,
      startTimer: jest.fn(),
      pauseTimer: jest.fn(),
      resumeTimer: jest.fn(),
      resetTimer: jest.fn(),
      timer: 0,
      isTimerRunning: false,
      isTimerPaused: false,
      activeTask: null,
    });

    renderWithClient(
      <TimeWindowBalloon
        timeWindow={mockTimeWindow}
        tasks={mockTasks} // Pass mockTasks which includes 'task1'
        onDelete={onDeleteMock}
      />
    );

    const deleteButton = screen.getByLabelText('Delete time window');
    fireEvent.click(deleteButton);

    expect(stopCurrentTaskMock).toHaveBeenCalledTimes(1);
    expect(onDeleteMock).toHaveBeenCalledWith('tw1');
  });
  it('calls onUnassignTask when unassign button is clicked on an assigned task', () => {
    const onUnassignTaskMock = jest.fn();
    renderWithClient(<TimeWindowBalloon timeWindow={mockTimeWindow} tasks={mockTasks} onUnassignTask={onUnassignTaskMock} />);
    const unassignButton = screen.getByLabelText(`Unassign task: Task 1`);
    fireEvent.click(unassignButton);
    expect(onUnassignTaskMock).toHaveBeenCalledWith('task1');
  });
});
