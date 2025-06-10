import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTodayDailyPlan, useYesterdayDailyPlan } from 'hooks/useDailyPlan';
import * as dailyPlanService from 'services/dailyPlanService';
import { DailyPlanResponse } from 'types/dailyPlan';
import React from 'react';

jest.mock('services/dailyPlanService');
const mockedDailyPlanService = dailyPlanService as jest.Mocked<typeof dailyPlanService>;

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
  id: 'plan1',
  user_id: 'user1',
  plan_date: new Date().toISOString(),
  time_windows: [],
  reviewed: false,
};

describe('useDailyPlan hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  describe('useTodayDailyPlan', () => {
    it('should fetch today\'s daily plan', async () => {
      mockedDailyPlanService.getTodayDailyPlan.mockResolvedValue(mockDailyPlan);

      const { result } = renderHook(() => useTodayDailyPlan(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockDailyPlan);
      expect(mockedDailyPlanService.getTodayDailyPlan).toHaveBeenCalledTimes(1);
    });

    it('should handle errors when fetching today\'s daily plan', async () => {
      const errorMessage = 'Failed to fetch today\'s plan';
      mockedDailyPlanService.getTodayDailyPlan.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useTodayDailyPlan(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeInstanceOf(Error);
      expect((result.current.error as Error).message).toBe(errorMessage);
    });
  });

  describe('useYesterdayDailyPlan', () => {
    it('should fetch yesterday\'s daily plan when enabled', async () => {
      mockedDailyPlanService.getYesterdayDailyPlan.mockResolvedValue(mockDailyPlan);

      const { result } = renderHook(() => useYesterdayDailyPlan(true), { wrapper });

      expect(result.current.isLoading).toBe(true);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockDailyPlan);
      expect(mockedDailyPlanService.getYesterdayDailyPlan).toHaveBeenCalledTimes(1);
    });

    it('should not fetch yesterday\'s daily plan when disabled', () => {
      const { result } = renderHook(() => useYesterdayDailyPlan(false), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(mockedDailyPlanService.getYesterdayDailyPlan).not.toHaveBeenCalled();
    });

    it('should handle errors when fetching yesterday\'s daily plan', async () => {
      const errorMessage = 'Failed to fetch yesterday\'s plan';
      mockedDailyPlanService.getYesterdayDailyPlan.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useYesterdayDailyPlan(true), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeInstanceOf(Error);
      expect((result.current.error as Error).message).toBe(errorMessage);
    });
  });
});
