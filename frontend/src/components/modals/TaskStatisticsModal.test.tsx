import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskStatisticsModal from './TaskStatisticsModal';
import { Task } from 'types/task';
import { formatDateTime } from '../../lib/utils';

const mockTaskWithStats: Task = {
  id: 'task1',
  title: 'Test Task with Stats',
  status: 'pending',
  priority: 'medium',
  user_id: 'user1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  statistics: {
    was_taken_at: '2023-01-01T10:00:00Z',
    was_started_at: '2023-01-01T10:05:00Z',
    was_stopped_at: '2023-01-01T11:00:00Z',
    lasts_min: 55,
  },
};

const mockTaskWithoutStats: Task = {
  id: 'task2',
  title: 'Test Task without Stats',
  status: 'pending',
  priority: 'medium',
  user_id: 'user1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('TaskStatisticsModal', () => {
  test('renders nothing if not open', () => {
    const { container } = render(
      <TaskStatisticsModal isOpen={false} onClose={jest.fn()} task={mockTaskWithStats} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders nothing if task is null', () => {
    const { container } = render(
      <TaskStatisticsModal isOpen={true} onClose={jest.fn()} task={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders modal with task title and statistics when open and task with stats is provided', () => {
    render(<TaskStatisticsModal isOpen={true} onClose={jest.fn()} task={mockTaskWithStats} />);

    expect(screen.getByText(`Statistics for "${mockTaskWithStats.title}"`)).toBeInTheDocument();
    expect(screen.getByText('First Taken:')).toBeInTheDocument();
    expect(screen.getByText(formatDateTime(mockTaskWithStats.statistics!.was_taken_at))).toBeInTheDocument();

    expect(screen.getByText('Last Started:')).toBeInTheDocument();
    expect(screen.getByText(formatDateTime(mockTaskWithStats.statistics!.was_started_at))).toBeInTheDocument();

    expect(screen.getByText('Last Stopped:')).toBeInTheDocument();
    expect(screen.getByText(formatDateTime(mockTaskWithStats.statistics!.was_stopped_at))).toBeInTheDocument();

    expect(screen.getByText('Total Active Time:')).toBeInTheDocument();
    expect(screen.getByText('55min')).toBeInTheDocument();
  });

  test('renders "N/A" for statistics if task has no statistics object', () => {
    render(<TaskStatisticsModal isOpen={true} onClose={jest.fn()} task={mockTaskWithoutStats} />);

    expect(screen.getByText(`Statistics for "${mockTaskWithoutStats.title}"`)).toBeInTheDocument();
    // Check that N/A appears for each stat field
    const nTexts = screen.getAllByText('N/A');
    expect(nTexts.length).toBe(4); // was_taken_at, was_started_at, was_stopped_at, lasts_min
  });

  test('renders "N/A" for specific missing statistic fields', () => {
    const taskWithPartialStats: Task = {
      ...mockTaskWithStats,
      statistics: {
        lasts_min: 30,
      },
    };
    render(<TaskStatisticsModal isOpen={true} onClose={jest.fn()} task={taskWithPartialStats} />);

    expect(screen.getByText('First Taken:')).toBeInTheDocument();
    expect(screen.getAllByText('N/A').length).toBeGreaterThanOrEqual(3); // was_taken_at, was_started_at, was_stopped_at
    expect(screen.getByText('Total Active Time:')).toBeInTheDocument();
    expect(screen.getByText('30min')).toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    const handleClose = jest.fn();
    render(<TaskStatisticsModal isOpen={true} onClose={handleClose} task={mockTaskWithStats} />);

    fireEvent.click(screen.getByText('Close'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
