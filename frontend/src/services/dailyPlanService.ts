import api from './api';
import { DailyPlanResponse } from '../types/dailyPlan';
import { API_ENDPOINTS } from '../constants/apiEndpoints';

export const getDailyPlanByDate = async (planDate: string): Promise<DailyPlanResponse | null> => {
  try {
    const response = await api.get<DailyPlanResponse>(API_ENDPOINTS.DAILY_PLAN_BY_DATE(planDate));
    if (!response.data || Object.keys(response.data).length === 0) {
      return null;
    }
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

export const getYesterdayDailyPlan = async (): Promise<DailyPlanResponse | null> => {
  try {
    const response = await api.get<DailyPlanResponse>(API_ENDPOINTS.DAILY_PLAN_YESTERDAY);
    if (!response.data || Object.keys(response.data).length === 0) {
      return null;
    }
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

export const createDailyPlan = async (timeWindows: any[]): Promise<DailyPlanResponse> => {
  try {
    const response = await api.post<DailyPlanResponse>(API_ENDPOINTS.DAILY_PLAN, { time_windows: timeWindows });
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

export const updateDailyPlan = async (dailyPlanId: string, payload: { time_windows?: any[], reflection_content?: string, notes_content?: string, reviewed?: boolean }): Promise<DailyPlanResponse> => {
  try {
    const response = await api.put<DailyPlanResponse>(API_ENDPOINTS.DAILY_PLAN_UPDATE_BY_ID(dailyPlanId), payload);
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

export const getTodayDailyPlan = async (): Promise<DailyPlanResponse | null> => {
  try {
    const response = await api.get<DailyPlanResponse>(API_ENDPOINTS.DAILY_PLAN_TODAY);
    if (!response.data || Object.keys(response.data).length === 0) {
      return null;
    }
    return response.data;
  } catch (error: any) {
    throw error;
  }
};
