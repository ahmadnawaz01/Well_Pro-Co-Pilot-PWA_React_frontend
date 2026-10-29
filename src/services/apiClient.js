import axios from 'axios';
import { authStorage } from './storage';

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_BASE_URL || 'http://localhost:8000';
const FASTAPI_URL = import.meta.env.VITE_FASTAPI_BASE_URL || 'http://localhost:8080';

// Axios Client for Frappe Backend (Port 8000)
export const frappeClient = axios.create({
  baseURL: `${FRAPPE_URL}/api/method`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Axios Client for FastAPI Backend (Port 8080)
export const fastApiClient = axios.create({
  baseURL: `${FASTAPI_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Token Injection Interceptor
const attachAuthToken = async (config) => {
  const { apiKey, apiSecret } = await authStorage.getAuth();

  if (apiKey && apiSecret && apiKey !== 'undefined' && apiSecret !== 'undefined' && apiKey !== 'null') {
    config.headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
  } else {
    delete config.headers['Authorization'];
  }
  return config;
};

frappeClient.interceptors.request.use(attachAuthToken, (err) => Promise.reject(err));
fastApiClient.interceptors.request.use(attachAuthToken, (err) => Promise.reject(err));

// 401 Unauthorized Handling Interceptor
const handleAuthError = async (error) => {
  if (error.response && error.response.status === 401) {
    await authStorage.clearAuth();
    window.dispatchEvent(new CustomEvent('wellpro:unauthorized'));
  }
  return Promise.reject(error);
};

frappeClient.interceptors.response.use((res) => res, handleAuthError);
fastApiClient.interceptors.response.use((res) => res, handleAuthError);