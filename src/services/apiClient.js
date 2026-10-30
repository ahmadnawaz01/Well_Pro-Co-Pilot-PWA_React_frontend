import axios from 'axios';
import { authStorage } from './storage';

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_BASE_URL || 'http://localhost:8000';
const FASTAPI_URL = import.meta.env.VITE_FASTAPI_BASE_URL || 'http://localhost:8080';

/**
 * Robust error extractor for Frappe RPC exceptions and server responses
 */
export function extractFrappeError(error, fallbackMsg = 'Request failed') {
  if (!error) return fallbackMsg;
  if (!error.response) {
    return 'Unable to reach backend server. Please verify the service is running at ' + FRAPPE_URL;
  }

  const data = error.response.data;
  if (data) {
    if (typeof data.message === 'string') return data.message;
    if (data.message && typeof data.message.message === 'string') return data.message.message;
    if (data.message && typeof data.message.error === 'string') return data.message.error;
    
    // Frappe python traceback / exception name extraction
    if (data.exception) {
      const parts = String(data.exception).split(':');
      const clean = parts[parts.length - 1].trim();
      if (clean) return clean;
    }

    // Frappe server messages (JSON encoded string)
    if (data._server_messages) {
      try {
        const msgs = JSON.parse(data._server_messages);
        const parsed = msgs.map((m) => {
          try {
            return JSON.parse(m).message;
          } catch {
            return m;
          }
        });
        if (parsed.length) return parsed.join('; ');
      } catch {
        // ignore parse error
      }
    }
  }

  return error.message || fallbackMsg;
}

// Axios Client for Frappe ERPNext Backend (Port 8000)
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

/**
 * Universal helper to call WellPro Frappe RPC methods cleanly
 * Uses the canonical endpoint path: /well_pro.well_pro_app.api.<method>
 */
export async function callFrappeMethod(methodName, payload = {}, isGet = false) {
  const endpoint = `/well_pro.well_pro_app.api.${methodName}`;
  const response = isGet
    ? await frappeClient.get(endpoint, { params: payload })
    : await frappeClient.post(endpoint, payload);

  // Frappe automatically wraps whitelisted returns inside top-level {"message": {...}}
  return response.data?.message || response.data;
}
