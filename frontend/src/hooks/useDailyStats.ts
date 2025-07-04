import { useQuery } from '@tanstack/react-query';
import { getTodayStats } from '../services/userDailyStatsService';

export const useDailyStats = () => {
  return useQuery({
    queryKey: ['dailyStats'],
    queryFn: getTodayStats,
  });
};
