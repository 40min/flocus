import { useQuery } from '@tanstack/react-query';
import { getAllTasks } from 'services/taskService';

export const useTasks = () => {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: getAllTasks,
  });
};
