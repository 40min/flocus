import api from './api';
import { DailyPlanResponse } from '../types/dailyPlan';
import { API_ENDPOINTS } from '../constants/apiEndpoints';

export const getDailyPlanByDate = async (planDate: string): Promise<DailyPlanResponse> => {
  try {
    const response = await api.get<DailyPlanResponse>(API_ENDPOINTS.DAILY_PLAN_BY_DATE(planDate));
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch daily plan for date ${planDate}:`, error);
    throw error;
  }
};
