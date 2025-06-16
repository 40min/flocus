import api from './api';
import { Task, TaskCreateRequest, TaskUpdateRequest } from '../types/task';
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

// Old function, replaced by getLlmSuggestion and applyLlmSuggestion
// export const improveTaskText = async (taskId: string, fieldToImprove: string): Promise<Task> => {
//   try {
//     const response = await api.post<Task>(
//       API_ENDPOINTS.TASK_BY_ID(taskId) + '/improve-text',
//       { field_to_improve: fieldToImprove }
//     );
//     return response.data;
//   } catch (error) {
//     // TODO: Consider more specific error handling or logging here
//     throw error;
//   }
// };

export interface LlmSuggestionResponse {
  suggestion: string;
  original_text?: string;
  field_to_update: 'title' | 'description';
}

export type LlmAction = 'improve_title' | 'improve_description' | 'generate_description_from_title';

export const getLlmSuggestion = async (taskId: string, action: LlmAction): Promise<LlmSuggestionResponse> => {
  try {
    const url = `${API_ENDPOINTS.TASK_BY_ID(taskId)}/llm-suggestions`;
    const response = await api.get<LlmSuggestionResponse>(url, { params: { action } });
    return response.data;
  } catch (error) {
    // Consider more specific error handling or logging here
    throw error;
  }
};

// export const applyLlmSuggestion = async (
//   taskId: string,
//   fieldToUpdate: 'title' | 'description',
//   approvedText: string
// ): Promise<Task> => {
//   try {
//     const url = `${API_ENDPOINTS.TASK_BY_ID(taskId)}/apply-suggestion`;
//     const payload = {
//       approved_text: approvedText,
//       field_to_update: fieldToUpdate,
//     };
//     const response = await api.post<Task>(url, payload);
//     return response.data;
//   } catch (error) {
//     // Consider more specific error handling or logging here
//     throw error;
//   }
// };

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
