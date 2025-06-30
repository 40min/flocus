import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CurrentTasks from './CurrentTasks';
import { useCurrentTimeWindow } from '../hooks/useCurrentTimeWindow';
import { useSharedTimerContext } from '../context/SharedTimerContext';
import { DndContext } from '@dnd-kit/core';
import { Task } from 'types/task';
import { TimeWindow } from 'types/timeWindow';

jest.mock('../hooks/useCurrentTimeWindow');
jest.mock('../context/SharedTimerContext');

const mockedUseCurrentTimeWindow = useCurrentTimeWindow as jest.Mock;
const mockedUseSharedTimerContext = useSharedTimerContext as jest.Mock;

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

const renderWithDnd = (component: React.ReactElement) => {
  return render(
    <DndContext onDragEnd={() => {}}>
      {component}
    </DndContext>
  );
};

describe('CurrentTasks', () => {
  beforeEach(() => {
    mockedUseSharedTimerContext.mockReturnValue({
      currentTaskId: null,
    });
  });

  it('shows "no works planned" message when there is no current time window', () => {
    mockedUseCurrentTimeWindow.mockReturnValue({ currentTimeWindow: null, currentTasks: [] });
    renderWithDnd(<CurrentTasks dailyPlan={null} />);
    expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
    expect(screen.getByText('No works planned for this time.')).toBeInTheDocument();
  });

  it('shows "no tasks" message when there is a time window but no tasks', () => {
    mockedUseCurrentTimeWindow.mockReturnValue({ currentTimeWindow: mockTimeWindow, currentTasks: [] });
    renderWithDnd(<CurrentTasks dailyPlan={{} as any} />); // Pass dummy plan to trigger hook
    expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
    expect(screen.getByText('No tasks for the current time window.')).toBeInTheDocument();
    expect(screen.getByText('Drag tasks to the timer to start focusing')).toBeInTheDocument();
  });

  it('renders a list of tasks when they are available', () => {
    mockedUseCurrentTimeWindow.mockReturnValue({ currentTimeWindow: mockTimeWindow, currentTasks: mockTasks });
    renderWithDnd(<CurrentTasks dailyPlan={{} as any} />);
    expect(screen.getByText('Task One')).toBeInTheDocument();
    expect(screen.getByText('Task Two')).toBeInTheDocument();
    expect(screen.getByText('0h 30m')).toBeInTheDocument(); // Check duration formatting
    expect(screen.getByText('1h 0m')).toBeInTheDocument();
  });

  it('disables dragging for the currently active task', () => {
    mockedUseCurrentTimeWindow.mockReturnValue({ currentTimeWindow: mockTimeWindow, currentTasks: mockTasks });
    mockedUseSharedTimerContext.mockReturnValue({
      currentTaskId: 'task1', // Task One is active
    });
    renderWithDnd(<CurrentTasks dailyPlan={{} as any} />);
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
    renderWithDnd(<CurrentTasks dailyPlan={{} as any} />);

    // Use regex to match the text because ReactMarkdown breaks it into multiple elements
    expect(screen.getByText(/This is a long description with a link to/, { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/It should not be truncated./, { exact: false })).toBeInTheDocument();

    const linkElement = screen.getByRole('link', { name: 'Google' });
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveAttribute('href', 'https://www.google.com');
    expect(linkElement).toHaveAttribute('target', '_blank');
    expect(linkElement).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
