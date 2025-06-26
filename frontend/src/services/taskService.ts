import api from './api';
import {
  Task, TaskCreateRequest, TaskUpdateRequest,
  LLMImprovementRequest,
  LLMImprovementResponse,
} from '../types/task';
import { API_ENDPOINTS } from '../constants/apiEndpoints';

export const getAllTasks = async (categoryId?: string): Promise<Task[]> => {
  try {
    const config = categoryId ? { params: { categoryId } } : {};
    const response = await api.get<Task[]>(API_ENDPOINTS.TASKS_BASE, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};


export const getLlmImprovement = async (
  payload: LLMImprovementRequest
): Promise<LLMImprovementResponse> => {
  try {
    const response = await api.post<LLMImprovementResponse>(
      API_ENDPOINTS.LLM_IMPROVE_TEXT,
      payload
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getTaskById = async (id: string): Promise<Task> => {
  try {
    const response = await api.get<Task>(API_ENDPOINTS.TASK_BY_ID(id));
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createTask = async (taskData: TaskCreateRequest): Promise<Task> => {
  try {
    const response = await api.post<Task>(API_ENDPOINTS.TASKS_BASE, taskData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateTask = async (id: string, taskData: TaskUpdateRequest): Promise<Task> => {
  try {
    const response = await api.patch<Task>(API_ENDPOINTS.TASK_BY_ID(id), taskData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteTask = async (id: string): Promise<void> => {
  try {
    await api.delete(API_ENDPOINTS.TASK_BY_ID(id));
  } catch (error) {
    throw error;
  }
};
