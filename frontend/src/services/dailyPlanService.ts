import api from './api';
import { DailyPlanResponse } from '../types/dailyPlan';
import { API_ENDPOINTS } from '../constants/apiEndpoints';

export const getDailyPlanByDate = async (planDate: string): Promise<DailyPlanResponse> => {
  try {
    const response = await api.get<DailyPlanResponse>(API_ENDPOINTS.DAILY_PLAN_BY_DATE(planDate));
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      console.log(`No daily plan found for date ${planDate}.`);
      return null as unknown as DailyPlanResponse;
    }
    console.error(`Failed to fetch daily plan for date ${planDate}:`, error);
    throw error;
  }
};

export const getYesterdayDailyPlan = async (): Promise<DailyPlanResponse | null> => {
  try {
    const response = await api.get<DailyPlanResponse>(API_ENDPOINTS.DAILY_PLAN_YESTERDAY);
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      console.log(`No daily plan found for yesterday.`);
      return null;
    }
    console.error(`Failed to fetch yesterday's daily plan:`, error);
    throw error;
  }
};

export const getTodayDailyPlan = async (): Promise<DailyPlanResponse | null> => {
  try {
    const response = await api.get<DailyPlanResponse>(API_ENDPOINTS.DAILY_PLAN_TODAY);
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      console.log(`No daily plan found for today.`);
      return null;
    }
    console.error(`Failed to fetch today's daily plan:`, error);
    throw error;
  }
};
