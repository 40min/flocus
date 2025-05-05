import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig, AxiosError } from 'axios';

const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const config: AxiosRequestConfig = {
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};

const api: AxiosInstance = axios.create(config);

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response && error.response.status === 401) {
      // Handle unauthorized errors (e.g., redirect to login)
      localStorage.removeItem('access_token');
      // Consider using React Router's navigation instead of window.location
      // import { useNavigate } from 'react-router-dom';
      // const navigate = useNavigate(); navigate('/login');
      console.error("Unauthorized access - redirecting to login");
      // For now, using window.location, but should be updated if using React Router
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;