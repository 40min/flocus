import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteTask,
  getAllTasks,
  updateTask,
  createTask,
} from "../services/taskService";
import { Task, TaskUpdateRequest, TaskCreateRequest } from "../types/task";

export const useTasks = () => {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: () => getAllTasks(),
  });
};

export const useTasksByCategory = (categoryId: string) => {
  return useQuery({
    queryKey: ["tasks", { categoryId }],
    queryFn: () => getAllTasks(categoryId),
    enabled: !!categoryId,
  });
};

export const usePendingTasksByCategory = (categoryId: string) => {
  return useQuery({
    queryKey: ["tasks", { categoryId, status: "pending" }],
    queryFn: () => getAllTasks(categoryId, "pending"),
    enabled: !!categoryId,
  });
};

interface UpdateTaskVariables {
  taskId: string;
  taskData: TaskUpdateRequest;
}

interface UpdateTaskContext {
  previousTasks: Task[] | undefined;
}

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation<Task, Error, UpdateTaskVariables, UpdateTaskContext>({
    mutationFn: ({ taskId, taskData }: UpdateTaskVariables) =>
      updateTask(taskId, taskData),

    // Optimistic update using cache manipulation
    onMutate: async ({ taskId, taskData }: UpdateTaskVariables) => {
      // Cancel outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["tasks"] });

      // Snapshot the previous value for rollback
      const previousTasks = queryClient.getQueryData<Task[]>(["tasks"]);

      // Optimistically update the cache
      queryClient.setQueryData<Task[]>(["tasks"], (old) => {
        if (!old || !Array.isArray(old)) return old;

        return old.map((task) => {
          if (task.id === taskId) {
            // Handle special case for add_lasts_minutes
            if (taskData.add_lasts_minutes !== undefined) {
              const currentMinutes = task.statistics?.lasts_minutes || 0;
              return {
                ...task,
                statistics: {
                  ...task.statistics,
                  lasts_minutes: currentMinutes + taskData.add_lasts_minutes,
                },
              };
            }
            // Handle regular field updates
            return { ...task, ...taskData };
          }
          return task;
        });
      });

      // Return context object with the snapshotted value for rollback
      return { previousTasks };
    },

    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (
      err: Error,
      variables: UpdateTaskVariables,
      context: UpdateTaskContext | undefined
    ) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks"], context.previousTasks);
      }
    },

    // Always refetch after error or success to ensure consistency with server
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation<Task, Error, TaskCreateRequest>({
    mutationFn: (taskData: TaskCreateRequest) => createTask(taskData),

    // No optimistic updates for task creation - just invalidate cache on success
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dailyPlan", "today"] });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dailyPlan", "today"] });
    },
  });
};
