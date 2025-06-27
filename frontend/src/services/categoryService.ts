 import api from './api';
import axios from 'axios';
import { Category, CategoryCreateRequest, CategoryUpdateRequest } from '../types/category';
import { ApiError, NotFoundError } from '../lib/errors';
import { API_ENDPOINTS } from '../constants/apiEndpoints';

export const getAllCategories = async (): Promise<Category[]> => {
  try {
    const response = await api.get<Category[]>(API_ENDPOINTS.CATEGORIES_BASE);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new ApiError(error.response.data?.detail || 'Failed to fetch categories', error.response.status);
    }
    throw error;
  }
};

export const createCategory = async (categoryData: CategoryCreateRequest): Promise<Category> => {
  try {
    const response = await api.post<Category>(API_ENDPOINTS.CATEGORIES_BASE, categoryData);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new ApiError(error.response.data?.detail || 'Failed to create category', error.response.status);
    }
    throw error;
  }
};

export const updateCategory = async (id: string, categoryData: CategoryUpdateRequest): Promise<Category> => {
  try {
    const response = await api.patch<Category>(API_ENDPOINTS.CATEGORY_BY_ID(id), categoryData);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 404) {
        throw new NotFoundError(`Category with id ${id} not found`);
      }
      throw new ApiError(error.response.data?.detail || 'Failed to update category', error.response.status);
    }
    throw error;
  }
};

export const deleteCategory = async (id: string): Promise<void> => {
  try {
    await api.delete(API_ENDPOINTS.CATEGORY_BY_ID(id));
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 404) {
        throw new NotFoundError(`Category with id ${id} not found`);
      }
      throw new ApiError(error.response.data?.detail || 'Failed to delete category', error.response.status);
    }
    throw error;
  }
};
