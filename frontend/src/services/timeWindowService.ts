import api from './api';
import { TimeWindow, TimeWindowCreateRequest, TimeWindowUpdateRequest } from '../types/timeWindow';
import { API_ENDPOINTS } from '../constants/apiEndpoints';

export const getAllTimeWindows = async (): Promise<TimeWindow[]> => {
  try {
    const response = await api.get<TimeWindow[]>(API_ENDPOINTS.TIME_WINDOWS_BASE);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createTimeWindow = async (timeWindowData: TimeWindowCreateRequest): Promise<TimeWindow> => {
    try {
      const response = await api.post<TimeWindow>(API_ENDPOINTS.TIME_WINDOWS_BASE, timeWindowData);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

   export const updateTimeWindow = async (id: string, timeWindowData: TimeWindowUpdateRequest): Promise<TimeWindow> => {
     try {
       const response = await api.patch<TimeWindow>(API_ENDPOINTS.TIME_WINDOW_BY_ID(id), timeWindowData);
       return response.data;
     } catch (error) {
       throw error;
     }
   };

  export const deleteTimeWindow = async (id: string): Promise<void> => {
    try {
      await api.delete(API_ENDPOINTS.TIME_WINDOW_BY_ID(id));
    } catch (error) {
      throw error;
    }
  }
