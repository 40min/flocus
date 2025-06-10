import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCategories } from 'hooks/useCategories';
import * as categoryService from 'services/categoryService';
import { Category } from 'types/category';
import React from 'react';

jest.mock('services/categoryService');
const mockedCategoryService = categoryService as jest.Mocked<typeof categoryService>;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const mockCategories: Category[] = [
  { id: '1', name: 'Work', user_id: 'user1', is_deleted: false },
  { id: '2', name: 'Personal', user_id: 'user1', is_deleted: false },
];

describe('useCategories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('should fetch categories and return them', async () => {
    mockedCategoryService.getAllCategories.mockResolvedValue(mockCategories);

    const { result } = renderHook(() => useCategories(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual(mockCategories);
    expect(result.current.error).toBe(null);
    expect(mockedCategoryService.getAllCategories).toHaveBeenCalledTimes(1);
  });

  it('should handle errors when fetching categories', async () => {
    const errorMessage = 'Failed to fetch categories';
    mockedCategoryService.getAllCategories.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useCategories(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe(errorMessage);
    expect(mockedCategoryService.getAllCategories).toHaveBeenCalledTimes(1);
  });
});
