import axios from "axios";
import api from "./api";
import { API_ENDPOINTS } from "../constants/apiEndpoints";
import { UserDailyStats } from "../types/userDailyStats";
import { ApiError } from "../errors/errors";

export const getTodayStats = async (): Promise<UserDailyStats> => {
  try {
    const response = await api.get<UserDailyStats>(
      API_ENDPOINTS.DAILY_STATS_TODAY
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new ApiError(
        error.response.data?.detail || "Failed to fetch daily stats",
        error.response.status
      );
    }
    throw error;
  }
};

export const incrementTimeSpent = async (seconds: number): Promise<void> => {
  try {
    await api.post(API_ENDPOINTS.DAILY_STATS_INCREMENT_TIME, { seconds });
  } catch (error) {
    // Fail silently for activity tracking to not bother the user
    console.error("Failed to increment time spent:", error);
  }
};

export const incrementPomodoro = async (): Promise<void> => {
  try {
    await api.post(API_ENDPOINTS.DAILY_STATS_INCREMENT_POMODORO);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new ApiError(
        error.response.data?.detail || "Failed to increment pomodoro count",
        error.response.status
      );
    }
    throw error;
  }
};
