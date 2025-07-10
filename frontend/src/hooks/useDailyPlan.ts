import { useQuery } from '@tanstack/react-query';
import { getTodayDailyPlan, getPrevDayDailyPlan } from 'services/dailyPlanService';

export const useTodayDailyPlan = () => {
  return useQuery({
    queryKey: ['dailyPlan', 'today'],
    queryFn: getTodayDailyPlan,
  });
};

export const usePrevDayDailyPlan = (enabled: boolean) => {
  return useQuery({
    queryKey: ['dailyPlan', 'prev-day'],
    queryFn: getPrevDayDailyPlan,
    enabled,
  });
};
