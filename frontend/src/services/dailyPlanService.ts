import api from './api';
import axios from 'axios';
import { DailyPlanResponse } from '../types/dailyPlan';
import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { ApiError } from '../lib/errors';

export const getDailyPlanByDate = async (planDate: string): Promise<DailyPlanResponse | null> => {
  try {
    const response = await api.get<DailyPlanResponse>(API_ENDPOINTS.DAILY_PLAN_BY_DATE(planDate));
    if (!response.data || Object.keys(response.data).length === 0) {
      return null;
    }
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 404) return null;
      throw new ApiError(error.response.data?.detail || 'Failed to get daily plan', error.response.status);
    }
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
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 404) return null;
      throw new ApiError(error.response.data?.detail || 'Failed to get daily plan', error.response.status);
    }
    throw error;
  }
};

export const createDailyPlan = async (timeWindows: any[]): Promise<DailyPlanResponse> => {
  try {
    const response = await api.post<DailyPlanResponse>(API_ENDPOINTS.DAILY_PLAN, { time_windows: timeWindows });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new ApiError(error.response.data?.detail || 'Failed to create daily plan', error.response.status);
    }
    throw error;
  }
};

export const updateDailyPlan = async (dailyPlanId: string, payload: { time_windows?: any[], reflection_content?: string, notes_content?: string, reviewed?: boolean }): Promise<DailyPlanResponse> => {
  try {
    const response = await api.put<DailyPlanResponse>(API_ENDPOINTS.DAILY_PLAN_UPDATE_BY_ID(dailyPlanId), payload);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new ApiError(error.response.data?.detail || 'Failed to update daily plan', error.response.status);
    }
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
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 404) return null;
      throw new ApiError(error.response.data?.detail || 'Failed to get daily plan', error.response.status);
    }
    throw error;
  }
};
