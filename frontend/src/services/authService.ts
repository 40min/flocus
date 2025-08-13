import api from "./api";
import axios from "axios";
import { User } from "../types/user";
import { ApiError } from "../errors/errors";
import { API_ENDPOINTS } from "../constants/apiEndpoints";

// API Schemas matching backend
export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface UserCredentials {
  username: string;
  password: string;
}

export interface UserRegistrationData {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export const loginUser = async (
  credentials: UserCredentials
): Promise<AuthResponse> => {
  const formData = new URLSearchParams();
  formData.append("username", credentials.username);
  formData.append("password", credentials.password);

  try {
    const response = await api.post<AuthResponse>(
      API_ENDPOINTS.LOGIN,
      formData,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new ApiError(
        error.response.data?.detail || "Login failed",
        error.response.status
      );
    }
    throw error;
  }
};

export const registerUser = async (
  userData: UserRegistrationData
): Promise<User> => {
  try {
    const response = await api.post<User>(API_ENDPOINTS.REGISTER, userData);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new ApiError(
        error.response.data?.detail || "Registration failed",
        error.response.status
      );
    }
    throw error;
  }
};

export const logoutUser = (): void => {
  localStorage.removeItem("token");
  localStorage.removeItem("user"); // Assuming user details are also stored
  // Potentially call an API endpoint to invalidate the token on the server if applicable
};

// TODO: Add functions for password reset, email verification etc. if needed
