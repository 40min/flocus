import api from './api';
import axios from 'axios';
import { TimeWindow, TimeWindowCreateRequest, TimeWindowUpdateRequest } from '../types/timeWindow';
import { ApiError, NotFoundError } from '../lib/errors';
import { API_ENDPOINTS } from '../constants/apiEndpoints';

export const getAllTimeWindows = async (): Promise<TimeWindow[]> => {
  try {
    const response = await api.get<TimeWindow[]>(API_ENDPOINTS.TIME_WINDOWS_BASE);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new ApiError(error.response.data?.detail || 'Failed to fetch time windows', error.response.status);
    }
    throw error;
  }
};

export const createTimeWindow = async (timeWindowData: TimeWindowCreateRequest): Promise<TimeWindow> => {
    try {
      const response = await api.post<TimeWindow>(API_ENDPOINTS.TIME_WINDOWS_BASE, timeWindowData);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new ApiError(error.response.data?.detail || 'Failed to create time window', error.response.status);
      }
      throw error;
    }
  };

   export const updateTimeWindow = async (id: string, timeWindowData: TimeWindowUpdateRequest): Promise<TimeWindow> => {
     try {
       const response = await api.patch<TimeWindow>(API_ENDPOINTS.TIME_WINDOW_BY_ID(id), timeWindowData);
       return response.data;
     } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 404) {
          throw new NotFoundError(`Time window with id ${id} not found`);
        }
        throw new ApiError(error.response.data?.detail || 'Failed to update time window', error.response.status);
      }
      throw error;
     }
   };

  export const deleteTimeWindow = async (id: string): Promise<void> => {
    try {
      await api.delete(API_ENDPOINTS.TIME_WINDOW_BY_ID(id));
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 404) {
          throw new NotFoundError(`Time window with id ${id} not found`);
        }
        throw new ApiError(error.response.data?.detail || 'Failed to delete time window', error.response.status);
      }
      throw error;
    }
  }
