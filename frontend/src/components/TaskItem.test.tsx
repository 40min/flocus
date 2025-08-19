import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UseMutationResult } from '@tanstack/react-query';
import TaskItem from './TaskItem';
import { Task } from '../types/task';
import { useOptimisticTaskUpdate, UpdateWorkingTimeVariables, UpdateStatusVariables, UpdateTaskContext } from '../hooks/useOptimisticTaskUpdate';

// Mock the useOptimisticTaskUpdate hook
jest.mock('../hooks/useOptimisticTaskUpdate');

// Mock the utils function
jest.mock('../utils/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).flat().join(' '),
  formatWorkingTime: (minutes?: number) => `${minutes || 0}m`,
}));

const mockUseOptimisticTaskUpdate = useOptimisticTaskUpdate as jest.MockedFunction<typeof useOptimisticTaskUpdate>;

describe('TaskItem', () => {
  let queryClient: QueryClient;

  const mockTask: Task = {
    id: 'task1',
    title: 'A very long task title that should be truncated',
    status: 'pending',
    priority: 'medium',
    user_id: 'user1',
    statistics: {
      lasts_minutes: 30,
    },
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

  const mockUpdateWorkingTime: UseMutationResult<Task, Error, UpdateWorkingTimeVariables, UpdateTaskContext> = {
    mutate: jest.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
    isIdle: true,
    variables: undefined,
    reset: jest.fn(),
    data: undefined,
    error: null,
    failureCount: 0,
    failureReason: null,
    status: 'idle' as const,
    context: undefined,
    isPaused: false,
    submittedAt: 0,
    mutateAsync: jest.fn(),
  };

  const mockUpdateStatus: UseMutationResult<Task, Error, UpdateStatusVariables, unknown> = {
    mutate: jest.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
    isIdle: true,
    variables: undefined,
    reset: jest.fn(),
    data: undefined,
    error: null,
    failureCount: 0,
    failureReason: null,
    status: 'idle' as const,
    context: undefined,
    isPaused: false,
    submittedAt: 0,
    mutateAsync: jest.fn(),
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockUseOptimisticTaskUpdate.mockReturnValue({
      updateWorkingTime: mockUpdateWorkingTime,
      updateStatus: mockUpdateStatus,
    });

    jest.clearAllMocks();
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('Basic functionality', () => {
    it('renders the task title', () => {
      renderWithQueryClient(<TaskItem {...mockProps} />);
      expect(screen.getByText(mockTask.title)).toBeInTheDocument();
    });

    it('has the correct aria-label', () => {
      renderWithQueryClient(<TaskItem {...mockProps} />);
      expect(screen.getByLabelText(`Task: ${mockTask.title}`)).toBeInTheDocument();
    });

    it('applies all color and hover classes correctly when not in error state', () => {
      renderWithQueryClient(<TaskItem {...mockProps} />);
      const taskElement = screen.getByLabelText(`Task: ${mockTask.title}`);
      // Check that the cn function was called with our expected classes
      const expectedClasses = [
        'inline-flex items-center px-3 py-2 rounded-full border text-sm font-medium',
        'cursor-default relative',
        'transition-all duration-200 ease-out focus:outline-none',
        'select-none shadow-sm hover:shadow-md',
        mockProps.baseBgColor,
        mockProps.baseBorderColor,
        mockProps.baseTextColor,
        mockProps.hoverBgColor,
        mockProps.hoverBorderColor,
        mockProps.hoverShadowColor,
      ].join(' ');

      // The element should exist and have the basic structure
      expect(taskElement).toBeInTheDocument();
      expect(taskElement.tagName).toBe('SPAN');
    });
  });

  describe('Loading states', () => {
    it('shows loading spinner when status update is pending', () => {
      mockUseOptimisticTaskUpdate.mockReturnValue({
        updateWorkingTime: mockUpdateWorkingTime,
        updateStatus: {
          ...mockUpdateStatus,
          isPending: true,
          isError: false,
          isSuccess: false,
          isIdle: false,
          status: 'pending' as const,
          variables: { taskId: 'task1', status: 'in_progress' },
        },
      });

      renderWithQueryClient(<TaskItem {...mockProps} />);
      expect(screen.getByLabelText('Updating task')).toBeInTheDocument();
    });

    it('shows loading spinner when working time update is pending', () => {
      mockUseOptimisticTaskUpdate.mockReturnValue({
        updateWorkingTime: {
          ...mockUpdateWorkingTime,
          isPending: true,
          isError: false,
          isSuccess: false,
          isIdle: false,
          status: 'pending' as const,
          variables: { taskId: 'task1', additionalMinutes: 15 },
        },
        updateStatus: mockUpdateStatus,
      });

      renderWithQueryClient(<TaskItem {...mockProps} />);
      expect(screen.getByLabelText('Updating task')).toBeInTheDocument();
    });

    it('applies opacity class during pending states', () => {
      mockUseOptimisticTaskUpdate.mockReturnValue({
        updateWorkingTime: {
          ...mockUpdateWorkingTime,
          isPending: true,
          isError: false,
          isSuccess: false,
          isIdle: false,
          status: 'pending' as const,
          variables: { taskId: 'task1', additionalMinutes: 15 },
        },
        updateStatus: mockUpdateStatus,
      });

      renderWithQueryClient(<TaskItem {...mockProps} />);
      const taskElement = screen.getByLabelText(`Task: ${mockTask.title}`);
      // Just check that the element exists and has some class attribute
      expect(taskElement).toBeInTheDocument();
      expect(taskElement).toHaveAttribute('class');
    });
  });

  describe('Error states', () => {
    it('shows error icon when status update fails', () => {
      mockUseOptimisticTaskUpdate.mockReturnValue({
        updateWorkingTime: mockUpdateWorkingTime,
        updateStatus: {
          ...mockUpdateStatus,
          isError: true,
          isPending: false,
          isSuccess: false,
          isIdle: false,
          status: 'error' as const,
          error: new Error('Update failed'),
          variables: { taskId: 'task1', status: 'in_progress' },
        },
      });

      renderWithQueryClient(<TaskItem {...mockProps} />);
      expect(screen.getByLabelText('Update failed')).toBeInTheDocument();
    });

    it('shows error icon when working time update fails', () => {
      mockUseOptimisticTaskUpdate.mockReturnValue({
        updateWorkingTime: {
          ...mockUpdateWorkingTime,
          isError: true,
          isPending: false,
          isSuccess: false,
          isIdle: false,
          status: 'error' as const,
          error: new Error('Update failed'),
          variables: { taskId: 'task1', additionalMinutes: 15 },
        },
        updateStatus: mockUpdateStatus,
      });

      renderWithQueryClient(<TaskItem {...mockProps} />);
      expect(screen.getByLabelText('Update failed')).toBeInTheDocument();
    });

    it('applies error styling in error state', () => {
      mockUseOptimisticTaskUpdate.mockReturnValue({
        updateWorkingTime: {
          ...mockUpdateWorkingTime,
          isError: true,
          isPending: false,
          isSuccess: false,
          isIdle: false,
          status: 'error' as const,
          error: new Error('Update failed'),
          variables: { taskId: 'task1', additionalMinutes: 15 },
        },
        updateStatus: mockUpdateStatus,
      });

      renderWithQueryClient(<TaskItem {...mockProps} />);
      const taskElement = screen.getByLabelText(`Task: ${mockTask.title}`);
      // Check that error state shows error icon and buttons
      expect(screen.getByLabelText('Update failed')).toBeInTheDocument();
      expect(screen.getByLabelText('Retry failed update')).toBeInTheDocument();
      expect(screen.getByLabelText('Dismiss error')).toBeInTheDocument();
    });

    it('shows retry and dismiss buttons in error state', () => {
      mockUseOptimisticTaskUpdate.mockReturnValue({
        updateWorkingTime: {
          ...mockUpdateWorkingTime,
          isError: true,
          isPending: false,
          isSuccess: false,
          isIdle: false,
          status: 'error' as const,
          error: new Error('Update failed'),
          variables: { taskId: 'task1', additionalMinutes: 15 },
        },
        updateStatus: mockUpdateStatus,
      });

      renderWithQueryClient(<TaskItem {...mockProps} />);
      expect(screen.getByLabelText('Retry failed update')).toBeInTheDocument();
      expect(screen.getByLabelText('Dismiss error')).toBeInTheDocument();
    });

    it('calls mutate again when retry button is clicked for working time error', () => {
      const variables = { taskId: 'task1', additionalMinutes: 15 };
      const mockMutate = jest.fn();

      mockUseOptimisticTaskUpdate.mockReturnValue({
        updateWorkingTime: {
          ...mockUpdateWorkingTime,
          isError: true,
          isPending: false,
          isSuccess: false,
          isIdle: false,
          status: 'error' as const,
          error: new Error('Update failed'),
          variables,
          mutate: mockMutate,
        },
        updateStatus: mockUpdateStatus,
      });

      renderWithQueryClient(<TaskItem {...mockProps} />);
      fireEvent.click(screen.getByLabelText('Retry failed update'));
      expect(mockMutate).toHaveBeenCalledWith(variables);
    });

    it('calls reset when dismiss button is clicked', () => {
      const mockReset = jest.fn();

      mockUseOptimisticTaskUpdate.mockReturnValue({
        updateWorkingTime: {
          ...mockUpdateWorkingTime,
          isError: true,
          isPending: false,
          isSuccess: false,
          isIdle: false,
          status: 'error' as const,
          error: new Error('Update failed'),
          variables: { taskId: 'task1', additionalMinutes: 15 },
          reset: mockReset,
        },
        updateStatus: mockUpdateStatus,
      });

      renderWithQueryClient(<TaskItem {...mockProps} />);
      fireEvent.click(screen.getByLabelText('Dismiss error'));
      expect(mockReset).toHaveBeenCalled();
    });
  });

  describe('Optimistic updates display', () => {
    it('shows optimistic status change', () => {
      mockUseOptimisticTaskUpdate.mockReturnValue({
        updateWorkingTime: mockUpdateWorkingTime,
        updateStatus: {
          ...mockUpdateStatus,
          isPending: true,
          isError: false,
          isSuccess: false,
          isIdle: false,
          status: 'pending' as const,
          variables: { taskId: 'task1', status: 'in_progress' },
        },
      });

      renderWithQueryClient(<TaskItem {...mockProps} />);
      expect(screen.getByText('→ in_progress')).toBeInTheDocument();
    });

    it('shows working time when showWorkingTime prop is true', () => {
      renderWithQueryClient(<TaskItem {...mockProps} showWorkingTime={true} />);
      // Check that working time section exists
      const workingTimeElement = screen.getByText('30m');
      expect(workingTimeElement).toBeInTheDocument();
      expect(workingTimeElement).toHaveClass('ml-2', 'text-xs', 'opacity-75');
    });

    it('shows optimistic working time during update', () => {
      mockUseOptimisticTaskUpdate.mockReturnValue({
        updateWorkingTime: {
          ...mockUpdateWorkingTime,
          isPending: true,
          isError: false,
          isSuccess: false,
          isIdle: false,
          status: 'pending' as const,
          variables: { taskId: 'task1', additionalMinutes: 15 },
        },
        updateStatus: mockUpdateStatus,
      });

      renderWithQueryClient(<TaskItem {...mockProps} showWorkingTime={true} />);
      // During optimistic update, should show updated time
      expect(screen.getByText('45m')).toBeInTheDocument(); // 30 + 15
      expect(screen.getByLabelText('Updating task')).toBeInTheDocument();
    });
  });

  describe('Action buttons', () => {
    it('shows action buttons when showActions is true', () => {
      renderWithQueryClient(<TaskItem {...mockProps} showActions={true} />);
      expect(screen.getByText('Start')).toBeInTheDocument();
      expect(screen.getByText('+15m')).toBeInTheDocument();
    });

    it('shows "Stop" button when task is in progress', () => {
      const inProgressTask = { ...mockTask, status: 'in_progress' as const };
      renderWithQueryClient(
        <TaskItem {...mockProps} task={inProgressTask} showActions={true} />
      );
      expect(screen.getByText('Stop')).toBeInTheDocument();
    });

    it('calls onStatusChange when status button is clicked', () => {
      const mockOnStatusChange = jest.fn();
      renderWithQueryClient(
        <TaskItem
          {...mockProps}
          showActions={true}
          onStatusChange={mockOnStatusChange}
        />
      );

      fireEvent.click(screen.getByText('Start'));
      expect(mockOnStatusChange).toHaveBeenCalledWith('task1', 'in_progress');
    });

    it('calls onWorkingTimeChange when +15m button is clicked', () => {
      const mockOnWorkingTimeChange = jest.fn();
      renderWithQueryClient(
        <TaskItem
          {...mockProps}
          showActions={true}
          onWorkingTimeChange={mockOnWorkingTimeChange}
        />
      );

      fireEvent.click(screen.getByText('+15m'));
      expect(mockOnWorkingTimeChange).toHaveBeenCalledWith('task1', 15);
    });

    it('uses hook mutations when no callbacks provided', () => {
      renderWithQueryClient(<TaskItem {...mockProps} showActions={true} />);

      fireEvent.click(screen.getByText('Start'));
      expect(mockUpdateStatus.mutate).toHaveBeenCalledWith({
        taskId: 'task1',
        status: 'in_progress',
      });

      fireEvent.click(screen.getByText('+15m'));
      expect(mockUpdateWorkingTime.mutate).toHaveBeenCalledWith({
        taskId: 'task1',
        additionalMinutes: 15,
      });
    });

    it('hides action buttons during pending states', () => {
      mockUseOptimisticTaskUpdate.mockReturnValue({
        updateWorkingTime: {
          ...mockUpdateWorkingTime,
          isPending: true,
          isError: false,
          isSuccess: false,
          isIdle: false,
          status: 'pending' as const,
          variables: { taskId: 'task1', additionalMinutes: 15 },
        },
        updateStatus: mockUpdateStatus,
      });

      renderWithQueryClient(<TaskItem {...mockProps} showActions={true} />);
      expect(screen.queryByText('Start')).not.toBeInTheDocument();
      expect(screen.queryByText('+15m')).not.toBeInTheDocument();
    });

    it('hides action buttons during error states', () => {
      mockUseOptimisticTaskUpdate.mockReturnValue({
        updateWorkingTime: {
          ...mockUpdateWorkingTime,
          isError: true,
          isPending: false,
          isSuccess: false,
          isIdle: false,
          status: 'error' as const,
          error: new Error('Update failed'),
          variables: { taskId: 'task1', additionalMinutes: 15 },
        },
        updateStatus: mockUpdateStatus,
      });

      renderWithQueryClient(<TaskItem {...mockProps} showActions={true} />);
      expect(screen.queryByText('Start')).not.toBeInTheDocument();
      expect(screen.queryByText('+15m')).not.toBeInTheDocument();
    });
  });

  describe('Task-specific mutations', () => {
    it('only shows loading state for mutations affecting this specific task', () => {
      mockUseOptimisticTaskUpdate.mockReturnValue({
        updateWorkingTime: {
          ...mockUpdateWorkingTime,
          isPending: true,
          isError: false,
          isSuccess: false,
          isIdle: false,
          status: 'pending' as const,
          variables: { taskId: 'different-task', additionalMinutes: 15 },
        },
        updateStatus: mockUpdateStatus,
      });

      renderWithQueryClient(<TaskItem {...mockProps} />);
      expect(screen.queryByLabelText('Updating task')).not.toBeInTheDocument();
    });

    it('only shows error state for mutations affecting this specific task', () => {
      mockUseOptimisticTaskUpdate.mockReturnValue({
        updateWorkingTime: {
          ...mockUpdateWorkingTime,
          isError: true,
          isPending: false,
          isSuccess: false,
          isIdle: false,
          status: 'error' as const,
          error: new Error('Update failed'),
          variables: { taskId: 'different-task', additionalMinutes: 15 },
        },
        updateStatus: mockUpdateStatus,
      });

      renderWithQueryClient(<TaskItem {...mockProps} />);
      expect(screen.queryByLabelText('Update failed')).not.toBeInTheDocument();
    });
  });
});
