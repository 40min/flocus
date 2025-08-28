import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTimerStore } from "stores/timerStore";
import { useDailyPlanWithReview } from "./useDailyPlan";
import type { Task } from "types/task";
import type { TimeWindowAllocation } from "types/dailyPlan";

/**
 * Hook for integrating carry-over workflow with existing task management
 * Handles timer state consistency and data updates during carry-over operations
 */
export const useCarryOverIntegration = () => {
  const queryClient = useQueryClient();
  const { dailyPlan, carryOverTimeWindow, isCarryingOver } =
    useDailyPlanWithReview();

  const { currentTaskId, stopCurrentTask, resetForNewTask } = useTimerStore(
    (state) => ({
      currentTaskId: state.currentTaskId,
      stopCurrentTask: state.stopCurrentTask,
      resetForNewTask: state.resetForNewTask,
    })
  );

  // Check if current timer task is in a specific time window
  const isCurrentTaskInTimeWindow = useCallback(
    (timeWindowId: string): boolean => {
      if (!currentTaskId || !dailyPlan) return false;

      const timeWindow = dailyPlan.time_windows.find(
        (tw) => tw.time_window.id === timeWindowId
      );

      return (
        timeWindow?.tasks.some((task) => task.id === currentTaskId) || false
      );
    },
    [currentTaskId, dailyPlan]
  );

  // Get tasks that would be affected by carrying over a time window
  const getAffectedTasks = useCallback(
    (timeWindowId: string): Task[] => {
      if (!dailyPlan) return [];

      const timeWindow = dailyPlan.time_windows.find(
        (tw) => tw.time_window.id === timeWindowId
      );

      // Return only unfinished tasks (these are the ones that get carried over)
      return timeWindow?.tasks.filter((task) => task.status !== "done") || [];
    },
    [dailyPlan]
  );

  // Enhanced carry over function that handles timer state
  const handleCarryOverWithTimerIntegration = useCallback(
    async (timeWindowId: string, targetDate: string) => {
      // Check if current timer task is in the time window being carried over
      const willAffectCurrentTask = isCurrentTaskInTimeWindow(timeWindowId);
      const affectedTasks = getAffectedTasks(timeWindowId);

      // Stop timer if current task is being carried over
      if (willAffectCurrentTask) {
        await stopCurrentTask();
      }

      try {
        // Perform the carry over operation
        await carryOverTimeWindow(timeWindowId, targetDate);

        // If timer was affected, reset it for new task selection
        if (willAffectCurrentTask) {
          await resetForNewTask();
        }

        // Invalidate related queries to ensure data consistency
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["dailyStats"] });

        return {
          success: true,
          affectedTasks,
          timerWasReset: willAffectCurrentTask,
        };
      } catch (error) {
        // If carry over failed and we stopped the timer, we should restart it
        // This is handled by the error handling in the parent hook
        throw error;
      }
    },
    [
      isCurrentTaskInTimeWindow,
      getAffectedTasks,
      stopCurrentTask,
      carryOverTimeWindow,
      resetForNewTask,
      queryClient,
    ]
  );

  // Check if any time windows have tasks that are currently running in timer
  const getActiveTimerTimeWindows = useMemo(() => {
    if (!currentTaskId || !dailyPlan) return [];

    return dailyPlan.time_windows.filter((tw) =>
      tw.tasks.some((task) => task.id === currentTaskId)
    );
  }, [currentTaskId, dailyPlan]);

  // Get carry-over status for each time window
  const getTimeWindowCarryOverStatus = useCallback(
    (timeWindowId: string) => {
      const affectedTasks = getAffectedTasks(timeWindowId);
      const hasUnfinishedTasks = affectedTasks.length > 0;
      const hasCurrentTimerTask = isCurrentTaskInTimeWindow(timeWindowId);

      return {
        canCarryOver: hasUnfinishedTasks,
        taskCount: affectedTasks.length,
        hasActiveTimer: hasCurrentTimerTask,
        affectedTasks,
      };
    },
    [getAffectedTasks, isCurrentTaskInTimeWindow]
  );

  // Validate carry-over operation before execution
  const validateCarryOver = useCallback(
    (
      timeWindowId: string,
      targetDate: string
    ): { valid: boolean; reason?: string } => {
      if (!dailyPlan) {
        return { valid: false, reason: "No daily plan available" };
      }

      const timeWindow = dailyPlan.time_windows.find(
        (tw) => tw.time_window.id === timeWindowId
      );

      if (!timeWindow) {
        return { valid: false, reason: "Time window not found" };
      }

      const unfinishedTasks = timeWindow.tasks.filter(
        (task) => task.status !== "done"
      );
      if (unfinishedTasks.length === 0) {
        return { valid: false, reason: "No unfinished tasks to carry over" };
      }

      // Validate target date format (basic check)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(targetDate)) {
        return { valid: false, reason: "Invalid target date format" };
      }

      // Check if target date is not in the past (basic check)
      const today = new Date().toISOString().split("T")[0];
      if (targetDate < today) {
        return { valid: false, reason: "Cannot carry over to past dates" };
      }

      return { valid: true };
    },
    [dailyPlan]
  );

  return {
    // Core functionality
    carryOverWithTimerIntegration: handleCarryOverWithTimerIntegration,
    validateCarryOver,

    // Status information
    getTimeWindowCarryOverStatus,
    getAffectedTasks,
    activeTimerTimeWindows: getActiveTimerTimeWindows,

    // State
    isCarryingOver,
    currentTaskId,

    // Helper functions
    isCurrentTaskInTimeWindow,
  };
};
