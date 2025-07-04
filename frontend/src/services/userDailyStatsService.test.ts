import { getTodayStats, incrementTimeSpent, incrementPomodoro } from './userDailyStatsService';
import api from './api';
import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { UserDailyStats } from '../types/userDailyStats';

jest.mock('./api');

describe('userDailyStatsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTodayStats', () => {
    it('should fetch today\'s stats successfully', async () => {
      const mockStats: UserDailyStats = {
        date: new Date().toISOString(),
        total_seconds_spent: 120,
        pomodoros_completed: 1,
      };
      (api.get as jest.Mock).mockResolvedValueOnce({ data: mockStats });

      const result = await getTodayStats();

      expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.DAILY_STATS_TODAY);
      expect(result).toEqual(mockStats);
    });

    it('should throw an error if fetching stats fails', async () => {
      const errorMessage = 'Failed to fetch stats';
      (api.get as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(getTodayStats()).rejects.toThrow(errorMessage);
    });
  });

  describe('incrementTimeSpent', () => {
    it('should send a request to increment time spent', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({});

      await incrementTimeSpent(60);

      expect(api.post).toHaveBeenCalledWith(API_ENDPOINTS.DAILY_STATS_INCREMENT_TIME, { seconds: 60 });
    });

    it('should log an error if the request fails but not throw', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const errorMessage = 'API Error';
      (api.post as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await incrementTimeSpent(60);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to increment time spent:', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });

  describe('incrementPomodoro', () => {
    it('should send a request to increment pomodoros', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({});
      await incrementPomodoro();
      expect(api.post).toHaveBeenCalledWith(API_ENDPOINTS.DAILY_STATS_INCREMENT_POMODORO);
    });

    it('should throw an error if the request fails', async () => {
      const errorMessage = 'Failed to increment pomodoro';
      (api.post as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));
      await expect(incrementPomodoro()).rejects.toThrow(errorMessage);
    });
  });
});
