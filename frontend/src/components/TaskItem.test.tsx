import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskItem from './TaskItem';
import { Task } from '../types/task';

describe('TaskItem', () => {
  const mockTask: Task = {
    id: 'task1',
    title: 'A very long task title that should be truncated',
    status: 'pending',
    priority: 'medium',
    user_id: 'user1',
  };

  const mockProps = {
    task: mockTask,
    baseBgColor: 'bg-blue-100',
    baseBorderColor: 'border-blue-200',
    baseTextColor: 'text-blue-800',
    hoverBgColor: 'hover:bg-blue-200',
    hoverBorderColor: 'hover:border-blue-300',
    hoverShadowColor: 'hover:shadow-blue-500/20',
  };

  it('renders the task title', () => {
    render(<TaskItem {...mockProps} />);
    expect(screen.getByText(mockTask.title)).toBeInTheDocument();
  });

  it('has the correct aria-label', () => {
    render(<TaskItem {...mockProps} />);
    expect(screen.getByLabelText(`Task: ${mockTask.title}`)).toBeInTheDocument();
  });

  it('applies all color and hover classes correctly', () => {
    render(<TaskItem {...mockProps} />);
    const taskElement = screen.getByLabelText(`Task: ${mockTask.title}`);
    expect(taskElement).toHaveClass(mockProps.baseBgColor);
    expect(taskElement).toHaveClass(mockProps.baseBorderColor);
    expect(taskElement).toHaveClass(mockProps.baseTextColor);
    expect(taskElement).toHaveClass(mockProps.hoverBgColor);
    expect(taskElement).toHaveClass(mockProps.hoverBorderColor);
    expect(taskElement).toHaveClass(mockProps.hoverShadowColor);
  });
});
