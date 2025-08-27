import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteTask,
  getAllTasks,
  updateTask,
  createTask,
} from "../services/taskService";
import { Task, TaskUpdateRequest, TaskCreateRequest } from "../types/task";
import { useMessage } from "../context/MessageContext";
import {
  handleMutationError,
  shouldRetryMutation,
  getRetryDelay,
} from "../utils/errorHandling";

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

    // Add retry configuration using TanStack Query patterns
    retry: shouldRetryMutation,
    retryDelay: getRetryDelay,

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["daily-plan"] });
    },

    onError: (error: Error, variables: UpdateTaskVariables) => {
      handleMutationError(error, "update", showMessage, {
        taskId: variables.taskId,
        taskData: variables.taskData,
      });
    },
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { showMessage } = useMessage();

  return useMutation<Task, Error, TaskCreateRequest>({
    mutationFn: (taskData: TaskCreateRequest) => createTask(taskData),

    // Add retry configuration
    retry: shouldRetryMutation,
    retryDelay: getRetryDelay,

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dailyPlan", "today"] });
      showMessage("Task created successfully", "success");
    },

    onError: (error: Error, variables: TaskCreateRequest) => {
      handleMutationError(error, "create", showMessage, {
        taskData: variables,
      });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  const { showMessage } = useMessage();

  return useMutation({
    mutationFn: deleteTask,

    // Add retry configuration
    retry: shouldRetryMutation,
    retryDelay: getRetryDelay,

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dailyPlan", "today"] });
      showMessage("Task deleted successfully", "success");
    },

    onError: (error: Error, taskId: string) => {
      handleMutationError(error, "delete", showMessage, {
        taskId,
      });
    },
  });
};
