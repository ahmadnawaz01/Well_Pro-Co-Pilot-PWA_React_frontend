import axios from 'axios';
import { authStorage } from './storage';

/**
 * Dynamically resolves the base URL for Frappe backend.
 * Works seamlessly on localhost, mobile network IPs (e.g. 192.168.x.x), or deployed ngrok/production domains.
 */
export const getFrappeBaseUrl = () => {
  const envUrl = (import.meta.env.VITE_FRAPPE_BASE_URL || '').trim();

  if (typeof window !== 'undefined' && window.location) {
    const { hostname, protocol, port } = window.location;

    // In Vite dev/preview server, route via proxy unless explicitly pointing to an external HTTPS/ngrok domain
    if (port === '5173' || port === '4173') {
      if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
        return '/api/method';
      }
    }

    if (envUrl) {
      // If envUrl points to localhost but client is accessing via LAN IP, replace localhost with current host
      let resolved = envUrl;
      if (resolved.includes('localhost') && hostname !== 'localhost' && hostname !== '127.0.0.1') {
        resolved = resolved.replace('localhost', hostname);
      }
      return `${resolved.replace(/\/+$/, '')}/api/method`;
    }

    // Direct host fallback with Frappe port 8000
    return `${protocol}//${hostname}:8000/api/method`;
  }

  if (envUrl) {
    return `${envUrl.replace(/\/+$/, '')}/api/method`;
  }
  return 'http://localhost:8000/api/method';
};

/**
 * Dynamically resolves the base URL for FastAPI backend.
 */
export const getFastApiBaseUrl = () => {
  const envUrl = (import.meta.env.VITE_FASTAPI_BASE_URL || '').trim();

  if (typeof window !== 'undefined' && window.location) {
    const { hostname, protocol, port } = window.location;

    // In Vite dev/preview server, route via proxy for zero-CORS LAN support
    if (port === '5173' || port === '4173') {
      if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
        return '/api/v1';
      }
    }

    if (envUrl) {
      let resolved = envUrl;
      if (resolved.includes('localhost') && hostname !== 'localhost' && hostname !== '127.0.0.1') {
        resolved = resolved.replace('localhost', hostname);
      }
      return `${resolved.replace(/\/+$/, '')}/api/v1`;
    }

    return `${protocol}//${hostname}:8080/api/v1`;
  }

  if (envUrl) {
    return `${envUrl.replace(/\/+$/, '')}/api/v1`;
  }
  return 'http://localhost:8080/api/v1';
};

/**
 * Universal error extractor for FastAPI and Frappe RPC exceptions
 */
export function extractApiError(error, fallbackMsg = 'Request failed') {
  if (!error) return fallbackMsg;
  const actualError = error.cause || error;

  // If response exists, extract backend validation message
  const data = actualError.response?.data;
  if (data) {
    // FastAPI detail format (string or validation array)
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
    }

    // Frappe format
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

  // Network / Connection Error
  if (!actualError.response) {
    if (actualError.message && !actualError.message.includes('object Object') && actualError.message !== 'Request failed') {
      return actualError.message;
    }
    return 'Unable to reach backend server. Please verify your internet or Wi-Fi connection.';
  }

  return actualError.message || fallbackMsg;
}

// Backward compatibility alias
export const extractFrappeError = extractApiError;

// Axios Client for Frappe ERPNext Backend
export const frappeClient = axios.create({
  baseURL: getFrappeBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'ngrok-skip-browser-warning': '69420'
  }
});

// Axios Client for FastAPI Backend
export const fastApiClient = axios.create({
  baseURL: getFastApiBaseUrl(),
  headers: {
    'Accept': 'application/json',
    'ngrok-skip-browser-warning': '69420'
  }
});

// Update baseURL dynamically in case window is re-evaluated
frappeClient.interceptors.request.use((config) => {
  if (!config.baseURL || config.baseURL === 'http://localhost:8000/api/method') {
    config.baseURL = getFrappeBaseUrl();
  }
  return config;
});

fastApiClient.interceptors.request.use((config) => {
  if (!config.baseURL || config.baseURL === 'http://localhost:8080/api/v1') {
    config.baseURL = getFastApiBaseUrl();
  }
  return config;
});

// Token & Ngrok Bypass Injection Interceptor
const attachAuthToken = async (config) => {
  config.headers['ngrok-skip-browser-warning'] = '69420';
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
    // Only clear credentials if not currently attempting a verification check
    const isVerify = error.config?.url?.includes('verify');
    if (!isVerify) {
      await authStorage.clearAuth();
      window.dispatchEvent(new CustomEvent('wellpro:unauthorized'));
    }
  }
  return Promise.reject(error);
};

frappeClient.interceptors.response.use((res) => res, handleAuthError);
fastApiClient.interceptors.response.use((res) => res, handleAuthError);

/**
 * Universal helper to call WellPro Frappe RPC methods cleanly
 * Uses canonical path: /well_pro.well_pro_app.api.<method>
 * with automatic fallback to /well_pro.api.<method>
 */
export async function callFrappeMethod(methodName, payload = {}, isGet = false) {
  const canonicalEndpoint = `/well_pro.well_pro_app.api.${methodName}`;
  const fallbackEndpoint = `/well_pro.api.${methodName}`;

  try {
    const response = isGet
      ? await frappeClient.get(canonicalEndpoint, { params: payload })
      : await frappeClient.post(canonicalEndpoint, payload);

    return response.data?.message || response.data;
  } catch (err) {
    // If canonical method returned 404 or 403, attempt top-level alias
    if (err.response?.status === 404 || err.response?.status === 403) {
      try {
        const fallbackRes = isGet
          ? await frappeClient.get(fallbackEndpoint, { params: payload })
          : await frappeClient.post(fallbackEndpoint, payload);
        return fallbackRes.data?.message || fallbackRes.data;
      } catch {
        throw err;
      }
    }
    throw err;
  }
}
