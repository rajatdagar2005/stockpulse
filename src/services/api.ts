import axios from 'axios';

export const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('stockpulse_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiration or 401s
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't auto-redirect if checking /api/auth/me during initial app boot
      const isAuthCheck = error.config?.url?.includes('/auth/me') || error.config?.url?.includes('/auth/login');
      if (!isAuthCheck) {
        localStorage.removeItem('stockpulse_token');
        localStorage.removeItem('stockpulse_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
