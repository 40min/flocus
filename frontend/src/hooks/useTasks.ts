import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllTasks, updateTask } from '../services/taskService';

export const useTasks = () => {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: () => getAllTasks(),
  });
};

export const useTasksByCategory = (categoryId: string) => {
  return useQuery({
    queryKey: ['tasks', { categoryId }],
    queryFn: () => getAllTasks(categoryId),
    enabled: !!categoryId,
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, taskData }: { taskId: string; taskData: any }) => updateTask(taskId, taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};
