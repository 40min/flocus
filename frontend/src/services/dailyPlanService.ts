import api from './api';
import { DailyPlanResponse } from '../types/dailyPlan';
import { API_ENDPOINTS } from '../constants/apiEndpoints';

export const getDailyPlanByDate = async (planDate: string): Promise<DailyPlanResponse | null> => {
  try {
    const response = await api.get<DailyPlanResponse>(API_ENDPOINTS.DAILY_PLAN_BY_DATE(planDate));
    if (!response.data || Object.keys(response.data).length === 0) {
      console.log(`No daily plan found for date ${planDate}.`);
      return null;
    }
    return response.data;
  } catch (error: any) {
    console.error(`Failed to fetch daily plan for date ${planDate}:`, error);
    throw error;
  }
};

export const getYesterdayDailyPlan = async (): Promise<DailyPlanResponse | null> => {
  try {
    const response = await api.get<DailyPlanResponse>(API_ENDPOINTS.DAILY_PLAN_YESTERDAY);
    if (!response.data || Object.keys(response.data).length === 0) {
      console.log(`No daily plan found for yesterday.`);
      return null;
    }
    return response.data;
  } catch (error: any) {
    console.error(`Failed to fetch yesterday's daily plan:`, error);
    throw error;
  }
};

export const getTodayDailyPlan = async (): Promise<DailyPlanResponse | null> => {
  try {
    const response = await api.get<DailyPlanResponse>(API_ENDPOINTS.DAILY_PLAN_TODAY);
    if (!response.data || Object.keys(response.data).length === 0) {
      console.log(`No daily plan found for today.`);
      return null;
    }
    return response.data;
  } catch (error: any) {
    console.error(`Failed to fetch today's daily plan:`, error);
    throw error;
  }
};
