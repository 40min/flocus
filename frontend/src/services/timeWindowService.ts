import api from './api';
import { TimeWindow, TimeWindowCreateRequest, TimeWindowUpdateRequest } from '../types/timeWindow';
import { API_ENDPOINTS } from '../constants/apiEndpoints';

export const getAllTimeWindows = async (): Promise<TimeWindow[]> => {
  try {
    const response = await api.get<TimeWindow[]>(API_ENDPOINTS.TIME_WINDOWS_BASE);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch time windows:', error);
    throw error;
  }
};

export const createTimeWindow = async (timeWindowData: TimeWindowCreateRequest): Promise<TimeWindow> => {
    try {
      const response = await api.post<TimeWindow>(API_ENDPOINTS.TIME_WINDOWS_BASE, timeWindowData);
      return response.data;
    } catch (error) {
      console.error('Failed to create time window:', error);
      throw error;
    }
  };

  export const updateTimeWindow = async (id: string, timeWindowData: TimeWindowUpdateRequest): Promise<TimeWindow> => {
    try {
      // Assuming TIME_WINDOW_BY_ID endpoint exists or create one
      const response = await api.patch<TimeWindow>(`${API_ENDPOINTS.TIME_WINDOWS_BASE}/${id}`, timeWindowData);
      return response.data;
    } catch (error) {
      console.error(`Failed to update time window with id ${id}:`, error);
      throw error;
    }
  };

// Add deleteTimeWindow if needed
