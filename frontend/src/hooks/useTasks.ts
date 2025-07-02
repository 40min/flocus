import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteTask, getAllTasks, updateTask } from '../services/taskService';

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

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dailyPlan', 'today'] });
    },
  });
};
