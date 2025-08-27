import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteTask,
  getAllTasks,
  updateTask,
  createTask,
} from "../services/taskService";
import { Task, TaskUpdateRequest, TaskCreateRequest } from "../types/task";
import { useMessage } from "../context/MessageContext";
import { createErrorHandler } from "../utils/errorHandling";

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

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  const { showMessage } = useMessage();

  return useMutation<Task, Error, UpdateTaskVariables>({
    mutationFn: ({ taskId, taskData }: UpdateTaskVariables) =>
      updateTask(taskId, taskData),

    // Simple success handling - just invalidate queries to refetch fresh data
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["daily-plan"] });
    },

    // Simple error handling - let the UI handle error display
    onError: (error: Error, variables: UpdateTaskVariables) => {
      console.error("Task update failed:", error);

      // Use standardized error handler for user feedback
      const errorHandler = createErrorHandler("update", showMessage, {
        taskId: variables.taskId,
        taskData: variables.taskData,
      });

      errorHandler(error, variables);
    },
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { showMessage } = useMessage();

  return useMutation<Task, Error, TaskCreateRequest>({
    mutationFn: (taskData: TaskCreateRequest) => createTask(taskData),

    // No optimistic updates for task creation - just invalidate cache on success
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dailyPlan", "today"] });
      showMessage("Task created successfully", "success");
    },

    onError: (err: Error, variables: TaskCreateRequest) => {
      // Use standardized error handler
      const errorHandler = createErrorHandler("create", showMessage, {
        taskData: variables,
      });

      errorHandler(err, variables);
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  const { showMessage } = useMessage();

  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dailyPlan", "today"] });
      showMessage("Task deleted successfully", "success");
    },

    onError: (err: Error, taskId: string) => {
      // Use standardized error handler
      const errorHandler = createErrorHandler("delete", showMessage, {
        taskId,
      });

      errorHandler(err, taskId);
    },
  });
};
