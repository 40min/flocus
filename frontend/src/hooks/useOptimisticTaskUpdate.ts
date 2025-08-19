import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTask } from "../services/taskService";
import { Task, TaskStatus } from "../types/task";

 // TypeScript interfaces for mutation variables
export interface UpdateWorkingTimeVariables {
  taskId: string;
  additionalMinutes: number;
}

export interface UpdateStatusVariables {
  taskId: string;
  status: TaskStatus;
}

export interface UpdateTaskContext {
  previousTasks: Task[] | undefined;
}

/**
 * Specialized hook for optimistic task updates with different mutation types
 * Provides separate mutations for working time updates (cache approach) and status updates (UI approach)
 */
export const useOptimisticTaskUpdate = () => {
  const queryClient = useQueryClient();

  // For working time updates using cache manipulation approach
  const updateWorkingTime = useMutation<
    Task,
    Error,
    UpdateWorkingTimeVariables,
    UpdateTaskContext
  >({
    mutationFn: ({ taskId, additionalMinutes }: UpdateWorkingTimeVariables) =>
      updateTask(taskId, { add_lasts_minutes: additionalMinutes }),

    // Optimistic update using cache manipulation
    onMutate: async ({
      taskId,
      additionalMinutes,
    }: UpdateWorkingTimeVariables) => {
      // Cancel outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: ["tasks"] });

      // Snapshot the previous value for rollback
      const previousTasks = queryClient.getQueryData<Task[]>(["tasks"]);

      // Optimistically update the cache
      queryClient.setQueryData<Task[]>(["tasks"], (old) => {
        if (!old || !Array.isArray(old)) return old;

        return old.map((task) => {
          if (task.id === taskId) {
            const currentMinutes = task.statistics?.lasts_minutes || 0;
            return {
              ...task,
              statistics: {
                ...task.statistics,
                lasts_minutes: currentMinutes + additionalMinutes,
              },
            };
          }
          return task;
        });
      });

      // Return context object with the snapshotted value for rollback
      return { previousTasks };
    },

    // Rollback on error
    onError: (
      err: Error,
      variables: UpdateWorkingTimeVariables,
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

  // For status updates using simpler UI approach
  const updateStatus = useMutation<Task, Error, UpdateStatusVariables>({
    mutationFn: ({ taskId, status }: UpdateStatusVariables) =>
      updateTask(taskId, { status }),

    // For status updates, we use the simpler UI approach
    // The optimistic state is handled via mutation.variables in the UI components
    // This avoids complex cache manipulation for simple status changes
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  return {
    updateWorkingTime,
    updateStatus,
  };
};
