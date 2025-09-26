import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('phish_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      sessionStorage.removeItem('phish_token');
      sessionStorage.removeItem('phish_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export { api };