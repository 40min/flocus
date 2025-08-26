import { useEffect } from "react";
import { useTimer } from "./useTimer";
import { useOptimisticTaskUpdate } from "./useOptimisticTaskUpdate";
import { useTimerStore } from "../stores/timerStore";
import { TaskStatus } from "../types/task";

/**
 * Hook that connects the timer store with optimistic update functions
 * This ensures timer operations immediately reflect in the UI via optimistic updates
 */
export const useTimerWithOptimisticUpdates = () => {
  const timer = useTimer();
  const { updateStatus, updateWorkingTime } = useOptimisticTaskUpdate();
  const setOptimisticUpdateFunctions = useTimerStore(
    (state) => state.setOptimisticUpdateFunctions
  );

  // Connect optimistic update functions to the timer store
  useEffect(() => {
    const optimisticUpdateStatus = (taskId: string, status: TaskStatus) => {
      updateStatus.mutate({ taskId, status });
    };

    const optimisticUpdateWorkingTime = (
      taskId: string,
      additionalMinutes: number
    ) => {
      updateWorkingTime.mutate({ taskId, additionalMinutes });
    };

    setOptimisticUpdateFunctions(
      optimisticUpdateStatus,
      optimisticUpdateWorkingTime
    );
  }, [updateStatus, updateWorkingTime, setOptimisticUpdateFunctions]);

  return {
    ...timer,
    // Expose mutation states for UI feedback
    isUpdatingStatus: updateStatus.isPending,
    isUpdatingWorkingTime: updateWorkingTime.isPending,
    statusUpdateError: updateStatus.error,
    workingTimeUpdateError: updateWorkingTime.error,
  };
};
