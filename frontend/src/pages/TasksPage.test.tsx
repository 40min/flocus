import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthContext, AuthContextType } from 'context/AuthContext';
import TasksPage from 'pages/TasksPage';
import * as taskService from 'services/taskService';
import * as categoryService from 'services/categoryService';
import { Task, TaskStatistics } from 'types/task';
import { Category } from 'types/category';
import { User } from 'types/user';

jest.mock('services/taskService');
jest.mock('services/categoryService');

const mockedTaskService = taskService as jest.Mocked<typeof taskService>;
const mockedCategoryService = categoryService as jest.Mocked<typeof categoryService>;

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

const renderTasksPage = () => {
  return render(
    <Router>
      <AuthContext.Provider value={mockAuthContextValue}>
        <TasksPage />
      </AuthContext.Provider>
    </Router>
  );
};

describe('TasksPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedTaskService.getAllTasks.mockResolvedValue(mockTasks);
    mockedCategoryService.getAllCategories.mockResolvedValue(mockCategories);
    mockedTaskService.createTask.mockImplementation(async (taskData) => ({
      id: `newTask-${Date.now()}`,
      ...taskData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'user1',
      status: taskData.status || 'pending',
      priority: taskData.priority || 'medium',
      category: taskData.category_id ? mockCategories.find(c => c.id === taskData.category_id) : undefined,
    } as Task));
    mockedTaskService.updateTask.mockImplementation(async (id, taskData) => ({
        ...mockTasks.find(t => t.id === id)!,
        ...taskData,
        updated_at: new Date().toISOString(),
      } as Task));
    mockedTaskService.deleteTask.mockResolvedValue(undefined);
  });

  test('renders tasks page with tasks', async () => {
    renderTasksPage();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    await screen.findByText('Task 1');
    await screen.findByText('Task 2');
    // Check for new Duration column and content
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('1h')).toBeInTheDocument(); // For Task 1 (60 min)
    expect(screen.getByText('30min')).toBeInTheDocument(); // For Task 2 (30 min)
  });

  test('opens and submits create task form', async () => {
    renderTasksPage();
    await waitFor(() => expect(mockedTaskService.getAllTasks).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByText('New Task'));
    expect(screen.getByText('Create New Task')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New Test Task' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'New Description' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'in_progress' } });
    fireEvent.change(screen.getByLabelText('Priority'), { target: { value: 'high' } });
    // fireEvent.change(screen.getByLabelText('Due Date'), { target: { value: '2024-12-31' } }); // DatePicker is tricky
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'cat1' } });

    fireEvent.click(screen.getByText('Create Task'));

    await waitFor(() => {
      expect(mockedTaskService.createTask).toHaveBeenCalledWith(expect.objectContaining({
        title: 'New Test Task',
        description: 'New Description',
        status: 'in_progress',
        priority: 'high',
        category_id: 'cat1',
      }));
    });
    expect(mockedTaskService.getAllTasks).toHaveBeenCalledTimes(2); // Called again after create
  });

  test('opens and submits edit task form', async () => {
    renderTasksPage();
    await screen.findByText('Task 1');

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);

    expect(screen.getByText('Edit Task')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Task 1');

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Updated Task 1' } });
    fireEvent.click(screen.getByText('Update Task'));

    await waitFor(() => {
      expect(mockedTaskService.updateTask).toHaveBeenCalledWith('task1', expect.objectContaining({
        title: 'Updated Task 1',
      }));
    });
    expect(mockedTaskService.getAllTasks).toHaveBeenCalledTimes(2);
  });

  test('deletes a task', async () => {
    renderTasksPage();
    await screen.findByText('Task 1');

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockedTaskService.deleteTask).toHaveBeenCalledWith('task1');
    });
    expect(mockedTaskService.getAllTasks).toHaveBeenCalledTimes(2);
  });

  test('shows loading state', async () => {
    mockedTaskService.getAllTasks.mockImplementation(() => new Promise(() => {})); // Never resolves
    renderTasksPage();
    expect(await screen.findByText('Loading tasks...')).toBeInTheDocument();
  });

  test('shows error state', async () => {
    mockedTaskService.getAllTasks.mockRejectedValue(new Error('Failed to fetch'));
    renderTasksPage();
    expect(await screen.findByText('Failed to fetch tasks.')).toBeInTheDocument();
  });

  test('closes form when cancel button is clicked', async () => {
    renderTasksPage();
    await waitFor(() => expect(mockedTaskService.getAllTasks).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByText('New Task'));
    expect(screen.getByText('Create New Task')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Create New Task')).not.toBeInTheDocument();
  });

  test('displays "No tasks found" message when there are no tasks', async () => {
    mockedTaskService.getAllTasks.mockResolvedValue([]);
    renderTasksPage();

    await waitFor(() => {
      expect(screen.getByText('No tasks found. Add a task to get started!')).toBeInTheDocument();
    });

  });

  test('form fields are reset when opening create form after editing', async () => {
    renderTasksPage();
    await screen.findByText('Task 1');

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
    renderTasksPage();
    await screen.findByText('Task 1'); // Ensure tasks are loaded

    const statsButtons = screen.getAllByLabelText('view statistics');
    expect(statsButtons.length).toBe(mockTasks.length);

    fireEvent.click(statsButtons[0]); // Click stats icon for the first task

    await waitFor(() => {
      expect(screen.getByText(`Mocked TaskStatisticsModal for ${mockTasks[0].title}`)).toBeInTheDocument();
    });
  });
});
