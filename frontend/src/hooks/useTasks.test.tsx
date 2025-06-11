import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTasks, useTasksByCategory } from 'hooks/useTasks';
import * as taskService from 'services/taskService';
import { Task } from 'types/task';

jest.mock('services/taskService');
const mockedTaskService = taskService as jest.Mocked<typeof taskService>;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

const mockTasks: Task[] = [
  { id: '1', title: 'Task 1', status: 'pending', priority: 'medium', user_id: 'user1' },
  { id: '2', title: 'Task 2', status: 'done', priority: 'high', user_id: 'user1' },
];

describe('useTasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('should fetch tasks and return them', async () => {
    mockedTaskService.getAllTasks.mockResolvedValue(mockTasks);

    const { result } = renderHook(() => useTasks(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual(mockTasks);
    expect(result.current.error).toBe(null);
    expect(mockedTaskService.getAllTasks).toHaveBeenCalledTimes(1);
  });

  it('should handle errors when fetching tasks', async () => {
    const errorMessage = 'Failed to fetch tasks';
    mockedTaskService.getAllTasks.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useTasks(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe(errorMessage);
    expect(mockedTaskService.getAllTasks).toHaveBeenCalledTimes(1);
  });
});

describe('useTasksByCategory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('should fetch tasks by category and return them', async () => {
    const categoryId = 'cat1';
    const mockCategoryTasks: Task[] = [
      { id: '3', title: 'Category Task 1', status: 'pending', priority: 'low', user_id: 'user1', category_id: categoryId },
    ];
    mockedTaskService.getAllTasks.mockResolvedValue(mockCategoryTasks);

    const { result } = renderHook(() => useTasksByCategory(categoryId), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual(mockCategoryTasks);
    expect(result.current.error).toBe(null);
    expect(mockedTaskService.getAllTasks).toHaveBeenCalledWith(categoryId);
    expect(mockedTaskService.getAllTasks).toHaveBeenCalledTimes(1);
  });

  it('should handle errors when fetching tasks by category', async () => {
    const categoryId = 'cat1';
    const errorMessage = 'Failed to fetch category tasks';
    mockedTaskService.getAllTasks.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useTasksByCategory(categoryId), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe(errorMessage);
    expect(mockedTaskService.getAllTasks).toHaveBeenCalledWith(categoryId);
    expect(mockedTaskService.getAllTasks).toHaveBeenCalledTimes(1);
  });

  it('should not fetch tasks if categoryId is not provided', async () => {
    mockedTaskService.getAllTasks.mockResolvedValue(mockTasks);

    const { result } = renderHook(() => useTasksByCategory(''), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(mockedTaskService.getAllTasks).not.toHaveBeenCalled();
  });
});
