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
  time_windows: [],
  reviewed: false,
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
