import { useQuery } from '@tanstack/react-query';
import { getAllCategories } from 'services/categoryService';

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: getAllCategories,
  });
};
