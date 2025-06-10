import { getAllCategories, createCategory, updateCategory, deleteCategory } from './categoryService';
import api from './api';
import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { Category, CategoryCreateRequest, CategoryUpdateRequest } from '../types/category';

jest.mock('./api');

describe('categoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllCategories', () => {
    it('should fetch all categories successfully', async () => {
      const mockCategories: Category[] = [
        { id: '1', name: 'Work', user_id: 'user1', is_deleted: false },
        { id: '2', name: 'Personal', user_id: 'user1', is_deleted: false },
      ];
      (api.get as jest.Mock).mockResolvedValueOnce({ data: mockCategories });

      const result = await getAllCategories();

      expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.CATEGORIES_BASE);
      expect(result).toEqual(mockCategories);
    });

    it('should throw an error if fetching categories fails', async () => {
      const errorMessage = 'Failed to fetch categories';
      (api.get as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(getAllCategories()).rejects.toThrow(errorMessage);
    });
  });

  describe('createCategory', () => {
    const newCategoryData: CategoryCreateRequest = { name: 'New Category' };
    const mockCreatedCategory: Category = { id: '3', name: 'New Category', user_id: 'user1', is_deleted: false };

    it('should create a category successfully', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({ data: mockCreatedCategory });

      const result = await createCategory(newCategoryData);

      expect(api.post).toHaveBeenCalledWith(API_ENDPOINTS.CATEGORIES_BASE, newCategoryData);
      expect(result).toEqual(mockCreatedCategory);
    });

    it('should throw an error if creating a category fails', async () => {
      const errorMessage = 'Failed to create category';
      (api.post as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(createCategory(newCategoryData)).rejects.toThrow(errorMessage);
    });
  });

  describe('updateCategory', () => {
    const categoryId = '1';
    const updatedCategoryData: CategoryUpdateRequest = { name: 'Updated Work' };
    const mockUpdatedCategory: Category = { id: '1', name: 'Updated Work', user_id: 'user1', is_deleted: false };

    it('should update a category successfully', async () => {
      (api.patch as jest.Mock).mockResolvedValueOnce({ data: mockUpdatedCategory });

      const result = await updateCategory(categoryId, updatedCategoryData);

      expect(api.patch).toHaveBeenCalledWith(API_ENDPOINTS.CATEGORY_BY_ID(categoryId), updatedCategoryData);
      expect(result).toEqual(mockUpdatedCategory);
    });

    it('should throw an error if updating a category fails', async () => {
      const errorMessage = 'Failed to update category';
      (api.patch as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(updateCategory(categoryId, updatedCategoryData)).rejects.toThrow(errorMessage);
    });
  });

  describe('deleteCategory', () => {
    const categoryId = '1';

    it('should delete a category successfully', async () => {
      (api.delete as jest.Mock).mockResolvedValueOnce({});

      await deleteCategory(categoryId);

      expect(api.delete).toHaveBeenCalledWith(API_ENDPOINTS.CATEGORY_BY_ID(categoryId));
    });

    it('should throw an error if deleting a category fails', async () => {
      const errorMessage = 'Failed to delete category';
      (api.delete as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(deleteCategory(categoryId)).rejects.toThrow(errorMessage);
    });
  });
});
