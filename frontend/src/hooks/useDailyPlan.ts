import { useQuery } from '@tanstack/react-query';
import { getTodayDailyPlan, getYesterdayDailyPlan } from 'services/dailyPlanService';

export const useTodayDailyPlan = () => {
  return useQuery({
    queryKey: ['dailyPlan', 'today'],
    queryFn: getTodayDailyPlan,
  });
};

export const useYesterdayDailyPlan = (enabled: boolean) => {
  return useQuery({
    queryKey: ['dailyPlan', 'yesterday'],
    queryFn: getYesterdayDailyPlan,
    enabled,
  });
};
