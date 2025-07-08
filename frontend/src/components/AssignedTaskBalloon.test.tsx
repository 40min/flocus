import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AssignedTaskBalloon from './AssignedTaskBalloon';
import { Task, TaskStatus } from '../types/task';
import { Category } from '../types/category';

describe('AssignedTaskBalloon', () => {
  const mockCategory: Category = {
    id: 'cat1',
    name: 'Work',
    user_id: 'user123',
    is_deleted: false,
  };

  const mockTask: Task = {
    id: 'task1',
    title: 'Test Task',
    description: 'This is a test task',
    status: 'pending',
    priority: 'medium',
    category_id: mockCategory.id,
    category: mockCategory,
    user_id: 'user123',
    due_date: null,
    created_at: '2023-01-01T10:00:00Z',
    updated_at: '2023-01-01T10:00:00Z',
  };

  it('renders the task title', () => {
    render(<AssignedTaskBalloon task={mockTask} onUnassign={jest.fn()} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('calls onUnassign when the unassign button is clicked', () => {
    const handleUnassign = jest.fn();
    render(<AssignedTaskBalloon task={mockTask} onUnassign={handleUnassign} />);
    const unassignButton = screen.getByLabelText(`Unassign task: ${mockTask.title}`);
    fireEvent.click(unassignButton);
    expect(handleUnassign).toHaveBeenCalledWith('task1');
  });

  it('does not render the unassign button when onUnassign prop is not provided', () => {
    render(<AssignedTaskBalloon task={mockTask} />);
    expect(screen.queryByLabelText(`Unassign task: ${mockTask.title}`)).not.toBeInTheDocument();
  });
  // New tests for status icons
  it.each([
    ['pending' as TaskStatus, 'Pending'],
    ['in_progress' as TaskStatus, 'In Progress'],
    ['done' as TaskStatus, 'Done'],
    ['blocked' as TaskStatus, 'Blocked'],
  ])('renders the correct icon for "%s" status', (status, title) => {
    const taskWithStatus: Task = { ...mockTask, status };
    render(<AssignedTaskBalloon task={taskWithStatus} />);
    expect(screen.getByTitle(title)).toBeInTheDocument();
  });
});
