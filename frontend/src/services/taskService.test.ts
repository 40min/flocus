import { getAllTasks, getTaskById, createTask, updateTask, deleteTask } from './taskService';
import api from './api';
import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { Task, TaskCreateRequest, TaskUpdateRequest } from '../types/task';

jest.mock('./api');

describe('taskService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllTasks', () => {
    it('should fetch all tasks successfully', async () => {
      const mockTasks: Task[] = [
        { id: '1', title: 'Task 1', description: 'Desc 1', status: 'pending', priority: 'medium', due_date: null, user_id: 'user1', category_id: undefined, is_deleted: false },
        { id: '2', title: 'Task 2', description: 'Desc 2', status: 'done', priority: 'low', due_date: null, user_id: 'user1', category_id: undefined, is_deleted: false },
      ];
      (api.get as jest.Mock).mockResolvedValueOnce({ data: mockTasks });

      const result = await getAllTasks();

      expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.TASKS_BASE, {});
      expect(result).toEqual(mockTasks);
    });

    it('should fetch tasks by category successfully', async () => {
      const mockTasks: Task[] = [
        { id: '1', title: 'Task 1', description: 'Desc 1', status: 'pending', priority: 'medium', due_date: null, user_id: 'user1', category_id: 'cat1', is_deleted: false },
      ];
      const categoryId = 'cat1';
      (api.get as jest.Mock).mockResolvedValueOnce({ data: mockTasks });

      const result = await getAllTasks(categoryId);

      expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.TASKS_BASE, { params: { categoryId } });
      expect(result).toEqual(mockTasks);
    });

    it('should throw an error if fetching tasks fails', async () => {
      const errorMessage = 'Failed to fetch tasks';
      (api.get as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(getAllTasks()).rejects.toThrow(errorMessage);
    });
  });

  describe('getTaskById', () => {
    const taskId = '1';
    const mockTask: Task = {
      id: taskId,
      title: 'Task 1',
      description: 'Desc 1',
      status: 'pending',
      priority: 'medium',
      due_date: null,
      user_id: 'user1',
      category_id: undefined,
      is_deleted: false,
    };

    it('should fetch a task by ID successfully', async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({ data: mockTask });

      const result = await getTaskById(taskId);

      expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.TASK_BY_ID(taskId));
      expect(result).toEqual(mockTask);
    });

    it('should throw an error if fetching a task by ID fails', async () => {
      const errorMessage = 'Failed to fetch task';
      (api.get as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(getTaskById(taskId)).rejects.toThrow(errorMessage);
    });
  });

  describe('createTask', () => {
    const newTaskData: TaskCreateRequest = { title: 'New Task', description: 'New Desc', status: 'pending', priority: 'high', due_date: null, category_id: undefined };
    const mockCreatedTask: Task = {
      id: '3',
      title: 'New Task',
      description: 'New Desc',
      status: 'pending',
      priority: 'high',
      due_date: null,
      user_id: 'user1',
      category_id: undefined,
      is_deleted: false,
    };

    it('should create a task successfully', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({ data: mockCreatedTask });

      const result = await createTask(newTaskData);

      expect(api.post).toHaveBeenCalledWith(API_ENDPOINTS.TASKS_BASE, newTaskData);
      expect(result).toEqual(mockCreatedTask);
    });

    it('should throw an error if creating a task fails', async () => {
      const errorMessage = 'Failed to create task';
      (api.post as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(createTask(newTaskData)).rejects.toThrow(errorMessage);
    });
  });

  describe('updateTask', () => {
    const taskId = '1';
    const updatedTaskData: TaskUpdateRequest = { title: 'Updated Task 1', status: 'done' };
    const mockUpdatedTask: Task = {
      id: taskId,
      title: 'Updated Task 1',
      description: 'Desc 1',
      status: 'done',
      priority: 'medium',
      due_date: null,
      user_id: 'user1',
      category_id: undefined,
      is_deleted: false,
    };

    it('should update a task successfully', async () => {
      (api.patch as jest.Mock).mockResolvedValueOnce({ data: mockUpdatedTask });

      const result = await updateTask(taskId, updatedTaskData);

      expect(api.patch).toHaveBeenCalledWith(API_ENDPOINTS.TASK_BY_ID(taskId), updatedTaskData);
      expect(result).toEqual(mockUpdatedTask);
    });

    it('should throw an error if updating a task fails', async () => {
      const errorMessage = 'Failed to update task';
      (api.patch as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(updateTask(taskId, updatedTaskData)).rejects.toThrow(errorMessage);
    });
  });

  describe('deleteTask', () => {
    const taskId = '1';

    it('should delete a task successfully', async () => {
      (api.delete as jest.Mock).mockResolvedValueOnce({});

      await deleteTask(taskId);

      expect(api.delete).toHaveBeenCalledWith(API_ENDPOINTS.TASK_BY_ID(taskId));
    });

    it('should throw an error if deleting a task fails', async () => {
      const errorMessage = 'Failed to delete task';
      (api.delete as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(deleteTask(taskId)).rejects.toThrow(errorMessage);
    });
  });
});
