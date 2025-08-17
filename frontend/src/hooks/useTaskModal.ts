import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Task } from "types/task";

interface UseTaskModalOptions {
  /**
   * Additional query keys to invalidate on successful submission
   */
  additionalQueryKeys?: string[][];
}

export const useTaskModal = (options: UseTaskModalOptions = {}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const queryClient = useQueryClient();

  const openCreateModal = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleSubmitSuccess = () => {
    // Always invalidate tasks query
    queryClient.invalidateQueries({ queryKey: ["tasks"] });

    // Invalidate additional query keys if provided
    options.additionalQueryKeys?.forEach((queryKey) => {
      queryClient.invalidateQueries({ queryKey });
    });

    setEditingTask(null);
    setIsModalOpen(false);
  };

  return {
    isModalOpen,
    editingTask,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmitSuccess,
  };
};
