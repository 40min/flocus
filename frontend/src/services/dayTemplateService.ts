import api from './api';
import { DayTemplateCreateRequest, DayTemplateUpdateRequest, DayTemplateResponse } from '../types/dayTemplate';
import { API_ENDPOINTS } from '../constants/apiEndpoints';

export const getAllDayTemplates = async (): Promise<DayTemplateResponse[]> => {
  try {
    const response = await api.get<DayTemplateResponse[]>(API_ENDPOINTS.DAY_TEMPLATES_BASE);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getDayTemplateById = async (id: string): Promise<DayTemplateResponse> => {
  try {
    const response = await api.get<DayTemplateResponse>(API_ENDPOINTS.DAY_TEMPLATE_BY_ID(id));
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createDayTemplate = async (templateData: DayTemplateCreateRequest): Promise<DayTemplateResponse> => {
  try {
    const response = await api.post<DayTemplateResponse>(API_ENDPOINTS.DAY_TEMPLATES_BASE, templateData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateDayTemplate = async (id: string, templateData: DayTemplateUpdateRequest): Promise<DayTemplateResponse> => {
  try {
    const response = await api.patch<DayTemplateResponse>(API_ENDPOINTS.DAY_TEMPLATE_BY_ID(id), templateData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteDayTemplate = async (id: string): Promise<void> => {
  try {
    await api.delete(API_ENDPOINTS.DAY_TEMPLATE_BY_ID(id));
  } catch (error) {
    throw error;
  }
};
