import api from './api';
import { User } from '../types/user';
import { API_ENDPOINTS } from '../constants/apiEndpoints';

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const response = await api.get<User[]>(`${API_ENDPOINTS.USERS_BASE}/`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
};

export const getCurrentUser = async (): Promise<User> => {
  try {
    const response = await api.get<User>(API_ENDPOINTS.USERS_ME);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch current user:', error);
    throw error;
  }
};

export const getUserById = async (id: string): Promise<User> => {
  try {
    const response = await api.get<User>(API_ENDPOINTS.USER_BY_ID(id));
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw error;
  }
};

export const updateUser = async (id: string, userData: Partial<User>): Promise<User> => {
  try {
    const response = await api.put<User>(API_ENDPOINTS.USER_BY_ID(id), userData);
    return response.data;
  } catch (error) {
    console.error('Failed to update user:', error);
    throw error;
  }
};
