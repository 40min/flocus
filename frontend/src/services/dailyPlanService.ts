import api from "./api";
import axios from "axios";
import {
  DailyPlanResponse,
  SelfReflection,
  CarryOverTimeWindowRequest,
  PlanApprovalResponse,
} from "../types/dailyPlan";
import { API_ENDPOINTS } from "../constants/apiEndpoints";
import { ApiError } from "../errors/errors";

export const getDailyPlanByDate = async (
  planDate: string
): Promise<DailyPlanResponse | null> => {
  try {
    const response = await api.get<DailyPlanResponse>(
      API_ENDPOINTS.DAILY_PLAN_BY_DATE(planDate)
    );
    if (!response.data || Object.keys(response.data).length === 0) {
      return null;
    }
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 404) return null;
      throw new ApiError(
        error.response.data?.detail || "Failed to get daily plan",
        error.response.status
      );
    }
    throw error;
  }
};

export const getPrevDayDailyPlan =
  async (): Promise<DailyPlanResponse | null> => {
    try {
      const response = await api.get<DailyPlanResponse>(
        API_ENDPOINTS.DAILY_PLAN_PREV_DAY
      );
      if (!response.data || Object.keys(response.data).length === 0) {
        return null;
      }
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 404) return null;
        throw new ApiError(
          error.response.data?.detail || "Failed to get daily plan",
          error.response.status
        );
      }
      throw error;
    }
  };

export const createDailyPlan = async (
  timeWindows: any[]
): Promise<DailyPlanResponse> => {
  try {
    const response = await api.post<DailyPlanResponse>(
      API_ENDPOINTS.DAILY_PLAN,
      { time_windows: timeWindows }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new ApiError(
        error.response.data?.detail || "Failed to create daily plan",
        error.response.status
      );
    }
    throw error;
  }
};

export const getLlmReflectionSuggestion = async (
  text: string
): Promise<string> => {
  const response = await api.post<{ improved_text: string }>(
    API_ENDPOINTS.LLM_IMPROVE_REFLECTION,
    { text }
  );
  return response.data.improved_text;
};

export const updateDailyPlan = async (
  dailyPlanId: string,
  payload: { time_windows?: any[]; self_reflection?: SelfReflection }
): Promise<PlanApprovalResponse> => {
  try {
    const response = await api.put<PlanApprovalResponse>(
      API_ENDPOINTS.DAILY_PLAN_UPDATE_BY_ID(dailyPlanId),
      payload
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new ApiError(
        error.response.data?.detail || "Failed to update daily plan",
        error.response.status
      );
    }
        throw error;
  }
};

export const approveDailyPlan = async (
  dailyPlanId: string
): Promise<PlanApprovalResponse> => {
  try {
    const response = await api.put<PlanApprovalResponse>(
      API_ENDPOINTS.DAILY_PLAN_APPROVE(dailyPlanId)
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new ApiError(
        error.response.data?.detail || "Failed to approve daily plan",
        error.response.status
      );
    }
    throw error;
  }
};

export const getTodayDailyPlan =
  async (): Promise<DailyPlanResponse | null> => {
    try {
      const response = await api.get<DailyPlanResponse>(
        API_ENDPOINTS.DAILY_PLAN_TODAY
      );
      if (!response.data || Object.keys(response.data).length === 0) {
        return null;
      }
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 404) return null;
        throw new ApiError(
          error.response.data?.detail || "Failed to get daily plan",
          error.response.status
        );
      }
      throw error;
    }
  };

export const carryOverTimeWindow = async (
  request: CarryOverTimeWindowRequest
): Promise<DailyPlanResponse> => {
  try {
    const response = await api.post<DailyPlanResponse>(
      API_ENDPOINTS.DAILY_PLAN_CARRY_OVER,
      request
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new ApiError(
        error.response.data?.detail || "Failed to carry over time window",
        error.response.status
      );
    }
    throw error;
  }
};
