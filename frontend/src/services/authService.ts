import api from './api';

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

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export const loginUser = async (credentials: UserCredentials): Promise<AuthResponse> => {
  const formData = new URLSearchParams();
  formData.append('username', credentials.username);
  formData.append('password', credentials.password);

  try {
    const response = await api.post<AuthResponse>('/users/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

export const registerUser = async (userData: UserRegistrationData): Promise<User> => {
  try {
    const response = await api.post<User>('/users/register', userData);
    return response.data;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
};

// TODO: Add functions for password reset, email verification etc. if needed