import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext, AuthContextType } from 'context/AuthContext';
import TasksPage from 'pages/TasksPage';
import * as taskService from 'services/taskService';
import { Task } from 'types/task';
import { Category } from 'types/category';
import { User } from 'types/user';
import { useTasks, useTasksByCategory } from 'hooks/useTasks';
import { useCategories } from 'hooks/useCategories';

jest.mock('services/taskService');
jest.mock('services/taskService');
jest.mock('hooks/useTasks');
jest.mock('hooks/useCategories');

const mockedTaskService = taskService as jest.Mocked<typeof taskService>;

const mockUser: User = { id: 'user1', username: 'testuser', email: 'test@example.com', first_name: 'Test', last_name: 'User' };
const mockAuthContextValue: AuthContextType = {
  isAuthenticated: true,
  user: mockUser,
  token: 'test-token',
  login: jest.fn(),
  logout: jest.fn(),
  isLoading: false,
};

const mockCategories: Category[] = [
  { id: 'cat1', name: 'Work', user_id: 'user1', is_deleted: false, color: '#3B82F6' },
  { id: 'cat2', name: 'Personal', user_id: 'user1', is_deleted: false, color: '#10B981' },
];

const mockTasks: Task[] = [
  {
    id: 'task1', title: 'Task 1', description: 'Description 1', status: 'pending', priority: 'medium',
    category_id: 'cat1', category: mockCategories[0], user_id: 'user1', due_date: '2024-01-01',
    created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z',
    statistics: { was_taken_at: '2023-01-01T10:00:00Z', lasts_min: 60 }
  },
  {
    id: 'task2', title: 'Task 2', description: 'Description 2', status: 'in_progress', priority: 'high', user_id: 'user1',
    created_at: '2023-01-02T00:00:00Z', updated_at: '2023-01-02T00:00:00Z',
    statistics: { lasts_min: 30 }
  },
];

// Mock the TaskStatisticsModal
jest.mock('components/modals/TaskStatisticsModal', () => ({
  __esModule: true,
  default: jest.fn(({ isOpen, onClose, task }) => isOpen && task ? <div>Mocked TaskStatisticsModal for {task.title}</div> : null),
}));

const queryClient = new QueryClient();

const renderTasksPage = (
  tasksData: Task[] = mockTasks,
  tasksLoading: boolean = false,
  tasksError: Error | null = null,
  categoriesData: Category[] = mockCategories,
  categoriesLoading: boolean = false,
  categoriesError: Error | null = null
) => {
  (useTasks as jest.Mock).mockReturnValue({
    data: tasksData,
    isLoading: tasksLoading,
    error: tasksError,
  });
(useTasksByCategory as jest.Mock).mockReturnValue({
    data: tasksData,
    isLoading: tasksLoading,
    error: tasksError,
  });

  (useCategories as jest.Mock).mockReturnValue({
    data: categoriesData, // Corrected: use 'data' to match the actual hook
    isLoading: categoriesLoading,
    error: categoriesError,
  });

  return render(
    <Router>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={mockAuthContextValue}>
          <TasksPage />
        </AuthContext.Provider>
      </QueryClientProvider>
    </Router>
  );
};

describe('TasksPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedTaskService.createTask.mockImplementation(async (taskData) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      return {
        id: `newTask-${Date.now()}`,
        ...taskData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: 'user1',
        status: taskData.status || 'pending',
        priority: taskData.priority || 'medium',
        category: taskData.category_id ? mockCategories.find(c => c.id === taskData.category_id) : undefined,
      } as Task;
    });
    mockedTaskService.updateTask.mockImplementation(async (id, taskData) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      return {
        ...mockTasks.find(t => t.id === id)!,
        ...taskData,
        updated_at: new Date().toISOString(),
      } as Task;
    });
    mockedTaskService.deleteTask.mockImplementation(async (id) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      return undefined;
    });
  });

  test('renders tasks page with tasks', async () => {
    renderTasksPage(mockTasks);
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(await screen.findByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('1h')).toBeInTheDocument();
    expect(screen.getByText('30min')).toBeInTheDocument();
  });

  test('opens and submits create task form', async () => {
    renderTasksPage([]); // Start with no tasks

    fireEvent.click(screen.getByText('New Task'));

    // Wait for the modal to appear and categories to be loaded
    await screen.findByText('Create New Task');
    const createTaskModal = screen.getByRole('dialog', { name: 'Create New Task' });
    const categorySelect = await within(createTaskModal!).findByLabelText('Category'); // Get the select element

    // Wait for category options to be populated (e.g., 'Work' which is 'cat1')
    // This ensures the select is ready before we try to change its value.
    await waitFor(() => {
      expect(within(createTaskModal).getByRole('option', { name: 'Work' })).toBeInTheDocument();
    });

    // Fill out the form
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New Test Task' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'New Description' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'in_progress' } });
    fireEvent.change(screen.getByLabelText('Priority'), { target: { value: 'high' } });
    fireEvent.change(categorySelect, { target: { value: 'cat1' } }); // Use the obtained select element

    // Ensure React has processed the state update for the category
    await waitFor(() => expect(categorySelect).toHaveValue('cat1'));

    // Submit the form
    fireEvent.click(screen.getByText('Create Task'));

    // Wait for the async createTask call to be made with the correct data
    await waitFor(() => {
      expect(mockedTaskService.createTask).toHaveBeenCalledWith(expect.objectContaining({
        title: 'New Test Task',
        description: 'New Description',
        status: 'in_progress',
        priority: 'high',
        category_id: 'cat1',
      }));
    });
  });

  test('opens and submits edit task form', async () => {
    renderTasksPage(mockTasks);
    expect(await screen.findByText('Task 1')).toBeInTheDocument();

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);

    await screen.findByText('Edit Task');
    expect(screen.getByLabelText('Title')).toHaveValue('Task 1');

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Updated Task 1' } });
    fireEvent.click(screen.getByText('Update Task'));

    await waitFor(() => {
      expect(mockedTaskService.updateTask).toHaveBeenCalledWith('task1', expect.objectContaining({
        title: 'Updated Task 1',
      }));
    });
  });

  test('deletes a task', async () => {
    renderTasksPage(mockTasks);
    expect(await screen.findByText('Task 1')).toBeInTheDocument();

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockedTaskService.deleteTask).toHaveBeenCalledWith('task1');
    });
  });

  test('shows loading state', async () => {
    renderTasksPage([], true);
    const loadingMessages = screen.getAllByText('Loading tasks...');
    expect(loadingMessages).toHaveLength(2);
  });

  test('shows error state', async () => {
    renderTasksPage([], false, new Error('Failed to fetch tasks.'));
    expect(screen.getByText('Error: Failed to fetch tasks.')).toBeInTheDocument();
  });

  test('shows error state for categories', async () => {
    renderTasksPage([], false, null, [], false, new Error('Failed to load categories.'));
    expect(screen.getByText('Failed to load categories.')).toBeInTheDocument();
  });

  test('closes form when cancel button is clicked', async () => {
    renderTasksPage(mockTasks);

    fireEvent.click(screen.getByText('New Task'));
    expect(screen.getByText('Create New Task')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.queryByText('Create New Task')).not.toBeInTheDocument();
    });
  });

  test('displays "No tasks found" message when there are no tasks', async () => {
    renderTasksPage([]);

    await waitFor(() => {
      expect(screen.getByText('No tasks found. Add a task to get started!')).toBeInTheDocument();
    });

  });

  test('form fields are reset when opening create form after editing', async () => {
    renderTasksPage(mockTasks);
    expect(await screen.findByText('Task 1')).toBeInTheDocument();

    // Open edit form for Task 1
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);
    await waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue('Task 1'));

    // Close edit form
    fireEvent.click(screen.getByText('Cancel'));

    // Open create form
    fireEvent.click(screen.getByText('New Task'));
    await waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue(''));
    expect(screen.getByLabelText('Description')).toHaveValue('');
    expect(screen.getByLabelText('Status')).toHaveValue('pending');
    expect(screen.getByLabelText('Priority')).toHaveValue('medium');
  });

  test('opens statistics modal when stats icon is clicked', async () => {
    renderTasksPage(mockTasks);
    expect(await screen.findByText('Task 1')).toBeInTheDocument();

    const statsButtons = screen.getAllByLabelText('view statistics');
    expect(statsButtons.length).toBe(mockTasks.length);

    fireEvent.click(statsButtons[0]); // Click stats icon for the first task

    await waitFor(() => {
      expect(screen.getByText(`Mocked TaskStatisticsModal for ${mockTasks[0].title}`)).toBeInTheDocument();
    });
  });
});
