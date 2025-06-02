import api from './api';
import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { Task, TaskCreateRequest, TaskUpdateRequest } from '../types/task';
import { getAllTasks, getTaskById, createTask, updateTask, deleteTask } from './taskService';

jest.mock('./api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('taskService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    status: 'todo',
    priority: 'medium',
    user_id: 'user1',
  };

  it('getAllTasks should fetch tasks', async () => {
    mockedApi.get.mockResolvedValue({ data: [mockTask] });
    const tasks = await getAllTasks();
    expect(mockedApi.get).toHaveBeenCalledWith(API_ENDPOINTS.TASKS_BASE);
    expect(tasks).toEqual([mockTask]);
  });

  it('getTaskById should fetch a single task', async () => {
    mockedApi.get.mockResolvedValue({ data: mockTask });
    const task = await getTaskById('1');
    expect(mockedApi.get).toHaveBeenCalledWith(API_ENDPOINTS.TASK_BY_ID('1'));
    expect(task).toEqual(mockTask);
  });

  it('createTask should create a task', async () => {
    const newTaskData: TaskCreateRequest = {
      title: 'New Task',
      status: 'todo',
      priority: 'high',
    };
    const createdTask: Task = {
      ...newTaskData,
      id: '2',
      user_id: 'user1',
      category_id: newTaskData.category_id ?? undefined,
    };
    mockedApi.post.mockResolvedValue({ data: createdTask });

    const result = await createTask(newTaskData);
    expect(mockedApi.post).toHaveBeenCalledWith(API_ENDPOINTS.TASKS_BASE, newTaskData);
    expect(result).toEqual(createdTask);
  });

  it('updateTask should update a task', async () => {
    const taskId = '1';
    const updates: TaskUpdateRequest = { title: 'Updated Task Title' };
    const updatedTask: Task = {
      ...mockTask,
      ...updates,
      category_id: updates.hasOwnProperty('category_id')
        ? (updates.category_id ?? undefined)
        : mockTask.category_id,
    };
    mockedApi.patch.mockResolvedValue({ data: updatedTask });

    const result = await updateTask(taskId, updates);
    expect(mockedApi.patch).toHaveBeenCalledWith(API_ENDPOINTS.TASK_BY_ID(taskId), updates);
    expect(result).toEqual(updatedTask);
  });

  it('deleteTask should delete a task', async () => {
    const taskId = '1';
    mockedApi.delete.mockResolvedValue({});

    await deleteTask(taskId);
    expect(mockedApi.delete).toHaveBeenCalledWith(API_ENDPOINTS.TASK_BY_ID(taskId));
  });

  it('should throw error if API call fails', async () => {
    const error = new Error('API Error');
    mockedApi.get.mockRejectedValue(error);
    await expect(getAllTasks()).rejects.toThrow('API Error');
  });
});
