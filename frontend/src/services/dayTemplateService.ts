import api from "./api";
import axios from "axios";
import {
  DayTemplateCreateRequest,
  DayTemplateUpdateRequest,
  DayTemplateResponse,
} from "../types/dayTemplate";
import { ApiError, NotFoundError } from "../errors/errors";
import { API_ENDPOINTS } from "../constants/apiEndpoints";

export const getAllDayTemplates = async (): Promise<DayTemplateResponse[]> => {
  try {
    const response = await api.get<DayTemplateResponse[]>(
      API_ENDPOINTS.DAY_TEMPLATES_BASE
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new ApiError(
        error.response.data?.detail || "Failed to fetch day templates",
        error.response.status
      );
    }
    throw error;
  }
};

export const getDayTemplateById = async (
  id: string
): Promise<DayTemplateResponse> => {
  try {
    const response = await api.get<DayTemplateResponse>(
      API_ENDPOINTS.DAY_TEMPLATE_BY_ID(id)
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 404) {
        throw new NotFoundError(`Template with id ${id} not found`);
      }
      throw new ApiError(
        error.response.data?.detail || "Failed to fetch template",
        error.response.status
      );
    }
    throw error;
  }
};

export const createDayTemplate = async (
  templateData: DayTemplateCreateRequest
): Promise<DayTemplateResponse> => {
  try {
    const response = await api.post<DayTemplateResponse>(
      API_ENDPOINTS.DAY_TEMPLATES_BASE,
      templateData
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new ApiError(
        error.response.data?.detail || "Failed to create template",
        error.response.status
      );
    }
    throw error;
  }
};

export const updateDayTemplate = async (
  id: string,
  templateData: DayTemplateUpdateRequest
): Promise<DayTemplateResponse> => {
  try {
    const response = await api.patch<DayTemplateResponse>(
      API_ENDPOINTS.DAY_TEMPLATE_BY_ID(id),
      templateData
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 404) {
        throw new NotFoundError(`Template with id ${id} not found`);
      }
      throw new ApiError(
        error.response.data?.detail || "Failed to update template",
        error.response.status
      );
    }
    throw error;
  }
};

export const deleteDayTemplate = async (id: string): Promise<void> => {
  try {
    await api.delete(API_ENDPOINTS.DAY_TEMPLATE_BY_ID(id));
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 404) {
        throw new NotFoundError(`Template with id ${id} not found`);
      }
      throw new ApiError(
        error.response.data?.detail || "Failed to delete template",
        error.response.status
      );
    }
    throw error;
  }
};
