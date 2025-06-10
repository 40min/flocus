import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TimeWindowBalloon from './TimeWindowBalloon';
import { TimeWindow } from 'types/timeWindow';
import { Task } from 'types/task';

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

describe('TimeWindowBalloon', () => {
  it('renders time window details correctly', () => {
    render(<TimeWindowBalloon timeWindow={mockTimeWindow} />);
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Focus on project X')).toBeInTheDocument();
    expect(screen.getByText('09:00 - 11:00')).toBeInTheDocument();
    expect(screen.getByText('2h')).toBeInTheDocument();
  });

  it('renders tasks when provided', () => {
    render(<TimeWindowBalloon timeWindow={mockTimeWindow} tasks={mockTasks} />);
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });

  it('renders delete button and calls onDelete when clicked', () => {
    const onDeleteMock = jest.fn();
    render(<TimeWindowBalloon timeWindow={mockTimeWindow} onDelete={onDeleteMock} />);
    const deleteButton = screen.getByLabelText('Delete time window');
    fireEvent.click(deleteButton);
    expect(onDeleteMock).toHaveBeenCalledWith('tw1');
  });
});
