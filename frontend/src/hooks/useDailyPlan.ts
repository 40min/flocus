import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import {
  getTodayDailyPlan,
  getPrevDayDailyPlan,
  carryOverTimeWindow,
  updateDailyPlan as updateDailyPlanService,
  approveDailyPlan,
} from "services/dailyPlanService";
import type {
  CarryOverTimeWindowRequest,
  TimeWindowAllocation,
} from "types/dailyPlan";
import { useMessage } from "context/MessageContext";

export const useTodayDailyPlan = () => {
  return useQuery({
    queryKey: ["dailyPlan", "today"],
    queryFn: getTodayDailyPlan,
  });
};

export const usePrevDayDailyPlan = (enabled: boolean) => {
  return useQuery({
    queryKey: ["dailyPlan", "prev-day"],
    queryFn: getPrevDayDailyPlan,
    enabled,
  });
};

/**
 * Enhanced hook for daily plan management with reviewed flag handling
 */
export const useDailyPlanWithReview = () => {
  const queryClient = useQueryClient();
  const { showMessage } = useMessage();

  const { data: dailyPlan, isLoading, error } = useTodayDailyPlan();

  // Determine if plan needs review
  const needsReview = useMemo(() => {
    return dailyPlan ? !dailyPlan.reviewed : false;
  }, [dailyPlan]);

  // Determine review mode state
  const reviewMode = useMemo(() => {
    if (!dailyPlan) return "no-plan";
    if (needsReview) return "needs-review";
    return "approved";
  }, [dailyPlan, needsReview]);

  // Carry over time window mutation
  const carryOverMutation = useMutation({
    mutationFn: carryOverTimeWindow,
    onSuccess: (response) => {
      // Update the cache directly instead of invalidating to prevent loops
      queryClient.setQueryData(["dailyPlan", "today"], response);
      showMessage("Time window carried over successfully!", "success");
    },
    onError: (error) => {
      console.error("Failed to carry over time window:", error);
      showMessage("Failed to carry over time window", "error");
    },
  });

  // Plan approval mutation
  const approvePlanMutation = useMutation({
    mutationFn: async (timeWindows: TimeWindowAllocation[]) => {
      if (!dailyPlan) throw new Error("No daily plan to approve");

      // First update the plan with the current time windows
      const payload = {
        time_windows: timeWindows.map((alloc) => ({
          id: alloc.time_window.id.startsWith("temp-")
            ? undefined
            : alloc.time_window.id,
          description: alloc.time_window.description,
          start_time: alloc.time_window.start_time,
          end_time: alloc.time_window.end_time,
          category_id: alloc.time_window.category.id,
          task_ids: alloc.tasks.map((t) => t.id),
        })),
      };

      // Update the plan first
      await updateDailyPlanService(dailyPlan.id, payload);

      // Then approve it to set the reviewed flag
      return approveDailyPlan(dailyPlan.id);
    },
    onSuccess: (response) => {
      // Update query cache with approved plan
      queryClient.setQueryData(["dailyPlan", "today"], response.plan);

      // Show appropriate success message
      if (response.merged && response.merge_details) {
        showMessage(
          `Plan approved successfully! ${response.merge_details.join(", ")}`,
          "success"
        );
      } else {
        showMessage("Plan approved successfully!", "success");
      }
    },
    onError: (error: any) => {
      console.error("Failed to approve plan:", error);

      // Handle conflict errors specifically
      if (error.status === 400 && error.message.includes("conflict")) {
        showMessage("Plan has conflicts that need to be resolved", "error");
      } else {
        showMessage("Failed to approve plan", "error");
      }
    },
  });

  // Carry over time window function
  const handleCarryOverTimeWindow = useCallback(
    async (timeWindowId: string, targetDate: string) => {
      if (!dailyPlan) {
        showMessage("No daily plan available for carry over", "error");
        return;
      }

      const request: CarryOverTimeWindowRequest = {
        source_plan_id: dailyPlan.id,
        time_window_id: timeWindowId, // Now receives stable identifier from frontend
        target_date: targetDate,
      };

      return carryOverMutation.mutateAsync(request);
    },
    [dailyPlan, carryOverMutation, showMessage]
  );

  // Approve plan function
  const handleApprovePlan = useCallback(
    async (timeWindows: TimeWindowAllocation[]) => {
      return approvePlanMutation.mutateAsync(timeWindows);
    },
    [approvePlanMutation]
  );

  return {
    // Data
    dailyPlan,
    isLoading,
    error,

    // Review state
    needsReview,
    reviewMode,

    // Actions
    carryOverTimeWindow: handleCarryOverTimeWindow,
    approvePlan: handleApprovePlan,

    // Loading states
    isCarryingOver: carryOverMutation.isPending,
    isApprovingPlan: approvePlanMutation.isPending,

    // Error states
    carryOverError: carryOverMutation.error,
    approvalError: approvePlanMutation.error,
  };
};
