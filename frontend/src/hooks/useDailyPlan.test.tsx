import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTodayDailyPlan, usePrevDayDailyPlan } from "hooks/useDailyPlan";
import * as dailyPlanService from "services/dailyPlanService";
import { DailyPlanResponse } from "types/dailyPlan";
import React from "react";

jest.mock("services/dailyPlanService");
const mockedDailyPlanService = dailyPlanService as jest.Mocked<
  typeof dailyPlanService
>;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const mockDailyPlan: DailyPlanResponse = {
  id: "plan1",
  user_id: "user1",
  plan_date: new Date().toISOString(),
  reviewed: true,
  time_windows: [],
  self_reflection: {
    positive: "Had a productive morning",
    negative: "Need to improve focus in the afternoon",
    follow_up_notes: "Consider taking breaks more often",
  },
};

describe("useDailyPlan hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  describe("useTodayDailyPlan", () => {
    it("should fetch today's daily plan", async () => {
      mockedDailyPlanService.getTodayDailyPlan.mockResolvedValue(mockDailyPlan);

      const { result } = renderHook(() => useTodayDailyPlan(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockDailyPlan);
      expect(mockedDailyPlanService.getTodayDailyPlan).toHaveBeenCalledTimes(1);
    });

    it("should handle errors when fetching today's daily plan", async () => {
      const errorMessage = "Failed to fetch today's plan";
      mockedDailyPlanService.getTodayDailyPlan.mockRejectedValue(
        new Error(errorMessage)
      );

      const { result } = renderHook(() => useTodayDailyPlan(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeInstanceOf(Error);
      expect((result.current.error as Error).message).toBe(errorMessage);
    });
  });

  describe("usePrevDayDailyPlan", () => {
    it("should fetch previous day's daily plan when enabled", async () => {
      mockedDailyPlanService.getPrevDayDailyPlan.mockResolvedValue(
        mockDailyPlan
      );

      const { result } = renderHook(() => usePrevDayDailyPlan(true), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(true);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockDailyPlan);
      expect(mockedDailyPlanService.getPrevDayDailyPlan).toHaveBeenCalledTimes(
        1
      );
    });

    it("should not fetch previous day's daily plan when disabled", () => {
      const { result } = renderHook(() => usePrevDayDailyPlan(false), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(mockedDailyPlanService.getPrevDayDailyPlan).not.toHaveBeenCalled();
    });

    it("should handle errors when fetching previous day's daily plan", async () => {
      const errorMessage = "Failed to fetch previous day's plan";
      mockedDailyPlanService.getPrevDayDailyPlan.mockRejectedValue(
        new Error(errorMessage)
      );

      const { result } = renderHook(() => usePrevDayDailyPlan(true), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeInstanceOf(Error);
      expect((result.current.error as Error).message).toBe(errorMessage);
    });
  });
});
// Additional tests for enhanced functionality
import { act } from "@testing-library/react";
import { useDailyPlanWithReview } from "hooks/useDailyPlan";

// Mock the message context
const mockShowMessage = jest.fn();
jest.mock("context/MessageContext", () => ({
  useMessage: () => ({
    showMessage: mockShowMessage,
  }),
}));

describe("useDailyPlanWithReview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShowMessage.mockClear();
    queryClient.clear();
  });

  it("should determine review mode correctly for approved plan", async () => {
    const approvedPlan = { ...mockDailyPlan, reviewed: true };
    mockedDailyPlanService.getTodayDailyPlan.mockResolvedValue(approvedPlan);

    const { result } = renderHook(() => useDailyPlanWithReview(), { wrapper });

    await waitFor(() => {
      expect(result.current.dailyPlan).toEqual(approvedPlan);
    });

    expect(result.current.needsReview).toBe(false);
    expect(result.current.reviewMode).toBe("approved");
  });

  it("should determine review mode correctly for unreviewed plan", async () => {
    const unreviewedPlan = { ...mockDailyPlan, reviewed: false };
    mockedDailyPlanService.getTodayDailyPlan.mockResolvedValue(unreviewedPlan);

    const { result } = renderHook(() => useDailyPlanWithReview(), { wrapper });

    await waitFor(() => {
      expect(result.current.dailyPlan).toEqual(unreviewedPlan);
    });

    expect(result.current.needsReview).toBe(true);
    expect(result.current.reviewMode).toBe("needs-review");
  });

  it("should determine review mode correctly for no plan", async () => {
    mockedDailyPlanService.getTodayDailyPlan.mockResolvedValue(null);

    const { result } = renderHook(() => useDailyPlanWithReview(), { wrapper });

    await waitFor(() => {
      expect(result.current.dailyPlan).toBeNull();
    });

    expect(result.current.needsReview).toBe(false);
    expect(result.current.reviewMode).toBe("no-plan");
  });

  it("should handle carry over time window successfully", async () => {
    const mockCarryOverResponse = {
      ...mockDailyPlan,
      reviewed: false, // Plan becomes unreviewed after carry-over
    };

    mockedDailyPlanService.getTodayDailyPlan.mockResolvedValue(mockDailyPlan);
    mockedDailyPlanService.carryOverTimeWindow.mockResolvedValue(
      mockCarryOverResponse
    );

    const { result } = renderHook(() => useDailyPlanWithReview(), { wrapper });

    await waitFor(() => {
      expect(result.current.dailyPlan).toEqual(mockDailyPlan);
    });

    await act(async () => {
      await result.current.carryOverTimeWindow("tw1", "2023-01-02");
    });

    expect(mockedDailyPlanService.carryOverTimeWindow).toHaveBeenCalledWith({
      source_plan_id: mockDailyPlan.id,
      time_window_id: "tw1",
      target_date: "2023-01-02",
    });
    expect(mockShowMessage).toHaveBeenCalledWith(
      "Time window carried over successfully!",
      "success"
    );
  });

  it("should handle carry over error when no plan available", async () => {
    mockedDailyPlanService.getTodayDailyPlan.mockResolvedValue(null);

    const { result } = renderHook(() => useDailyPlanWithReview(), { wrapper });

    await waitFor(() => {
      expect(result.current.dailyPlan).toBeNull();
    });

    await act(async () => {
      await result.current.carryOverTimeWindow("tw1", "2023-01-02");
    });

    expect(mockedDailyPlanService.carryOverTimeWindow).not.toHaveBeenCalled();
    expect(mockShowMessage).toHaveBeenCalledWith(
      "No daily plan available for carry over",
      "error"
    );
  });

  it("should handle plan approval successfully", async () => {
    const unreviewedPlan = { ...mockDailyPlan, reviewed: false };
    const mockApprovalResponse = {
      plan: { ...unreviewedPlan, reviewed: true },
      merged: false,
      merge_details: null,
    };

    const mockTimeWindows = [
      {
        time_window: {
          id: "tw1",
          description: "Work",
          start_time: 540,
          end_time: 600,
          category: {
            id: "cat1",
            name: "Work",
            color: "#blue",
            user_id: "user1",
            is_deleted: false,
          },
          day_template_id: "template1",
          user_id: "user1",
          is_deleted: false,
        },
        tasks: [],
      },
    ];

    mockedDailyPlanService.getTodayDailyPlan.mockResolvedValue(unreviewedPlan);
    mockedDailyPlanService.approveDailyPlan.mockResolvedValue(
      mockApprovalResponse
    );

    const { result } = renderHook(() => useDailyPlanWithReview(), { wrapper });

    await waitFor(() => {
      expect(result.current.dailyPlan).toEqual(unreviewedPlan);
    });

    await act(async () => {
      await result.current.approvePlan(mockTimeWindows);
    });

    expect(mockedDailyPlanService.approveDailyPlan).toHaveBeenCalledWith(
      unreviewedPlan.id
    );
    expect(mockShowMessage).toHaveBeenCalledWith(
      "Plan approved successfully!",
      "success"
    );
  });

  it("should handle plan approval with merge details", async () => {
    const unreviewedPlan = { ...mockDailyPlan, reviewed: false };
    const mockApprovalResponse = {
      plan: { ...unreviewedPlan, reviewed: true },
      merged: true,
      merge_details: ["Merged overlapping work sessions"],
    };

    mockedDailyPlanService.getTodayDailyPlan.mockResolvedValue(unreviewedPlan);
    mockedDailyPlanService.approveDailyPlan.mockResolvedValue(
      mockApprovalResponse
    );

    const { result } = renderHook(() => useDailyPlanWithReview(), { wrapper });

    await waitFor(() => {
      expect(result.current.dailyPlan).toEqual(unreviewedPlan);
    });

    await act(async () => {
      await result.current.approvePlan([]);
    });

    expect(mockShowMessage).toHaveBeenCalledWith(
      "Plan approved successfully! Merged overlapping work sessions",
      "success"
    );
  });

  it("should handle plan approval conflicts", async () => {
    const unreviewedPlan = { ...mockDailyPlan, reviewed: false };
    const conflictError = {
      status: 400,
      message: "Plan has scheduling conflicts that need to be resolved",
    };

    mockedDailyPlanService.getTodayDailyPlan.mockResolvedValue(unreviewedPlan);
    mockedDailyPlanService.approveDailyPlan.mockRejectedValue(conflictError);

    const { result } = renderHook(() => useDailyPlanWithReview(), { wrapper });

    await waitFor(() => {
      expect(result.current.dailyPlan).toEqual(unreviewedPlan);
    });

    await act(async () => {
      try {
        await result.current.approvePlan([]);
      } catch (error) {
        // Expected to throw
      }
    });

    expect(mockShowMessage).toHaveBeenCalledWith(
      "Plan has conflicts that need to be resolved",
      "error"
    );
  });
});
