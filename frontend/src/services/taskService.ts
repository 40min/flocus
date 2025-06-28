import axios from 'axios';
import {
  Task, TaskCreateRequest, TaskUpdateRequest,
  LLMImprovementRequest,
  LLMImprovementResponse,
} from '../types/task';
import { ApiError, NotFoundError } from '../lib/errors';
import { API_ENDPOINTS } from '../constants/apiEndpoints';
import api from './api';

export const getAllTasks = async (categoryId?: string): Promise<Task[]> => {
  try {
    const config = categoryId ? { params: { categoryId } } : {};
    const response = await api.get<Task[]>(API_ENDPOINTS.TASKS_BASE, config);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new ApiError(error.response.data?.detail || 'Failed to get LLM improvement', error.response.status);
    }
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
    if (axios.isAxiosError(error) && error.response) {
      throw new ApiError(error.response.data?.detail || 'Failed to get LLM improvement', error.response.status);
    }
    throw error;
  }
};

export const getTaskById = async (id: string): Promise<Task> => {
  try {
    const response = await api.get<Task>(API_ENDPOINTS.TASK_BY_ID(id));
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new ApiError(error.response.data?.detail || 'Failed to get LLM improvement', error.response.status);
    }
    throw error;
  }
};

export const createTask = async (taskData: TaskCreateRequest): Promise<Task> => {
  try {
    const response = await api.post<Task>(API_ENDPOINTS.TASKS_BASE, taskData);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new ApiError(error.response.data?.detail || 'Failed to get LLM improvement', error.response.status);
    }
    throw error;
  }
};

export const updateTask = async (id: string, taskData: TaskUpdateRequest): Promise<Task> => {
  try {
    const response = await api.patch<Task>(API_ENDPOINTS.TASK_BY_ID(id), taskData);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new ApiError(error.response.data?.detail || 'Failed to get LLM improvement', error.response.status);
    }
    throw error;
  }
};

export const deleteTask = async (id: string): Promise<void> => {
  try {
    await api.delete(API_ENDPOINTS.TASK_BY_ID(id));
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 404) {
        throw new NotFoundError(`Task with id ${id} not found`);
      }
      throw new ApiError(error.response.data?.detail || 'Failed to delete task', error.response.status);
    }
    throw error;
  }
};
