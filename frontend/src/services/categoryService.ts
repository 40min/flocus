import api from './api';
import { Category, CategoryCreateRequest, CategoryUpdateRequest } from '../types/category';
import { API_ENDPOINTS } from '../constants/apiEndpoints';

export const getAllCategories = async (): Promise<Category[]> => {
  try {
    const response = await api.get<Category[]>(API_ENDPOINTS.CATEGORIES_BASE);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    throw error;
  }
};

export const createCategory = async (categoryData: CategoryCreateRequest): Promise<Category> => {
  try {
    const response = await api.post<Category>(API_ENDPOINTS.CATEGORIES_BASE, categoryData);
    return response.data;
  } catch (error) {
    console.error('Failed to create category:', error);
    throw error;
  }
};

export const updateCategory = async (id: string, categoryData: CategoryUpdateRequest): Promise<Category> => {
  try {
    const response = await api.patch<Category>(API_ENDPOINTS.CATEGORY_BY_ID(id), categoryData);
    return response.data;
  } catch (error) {
    console.error('Failed to update category:', error);
    throw error;
  }
};

export const deleteCategory = async (id: string): Promise<void> => {
  try {
    await api.delete(API_ENDPOINTS.CATEGORY_BY_ID(id));
  } catch (error) {
    console.error('Failed to delete category:', error);
    throw error;
  }
};
