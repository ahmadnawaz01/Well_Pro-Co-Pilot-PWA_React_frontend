import { callFrappeMethod, fastApiClient, extractApiError } from './apiClient';
import { authStorage } from './storage';

export const authService = {
  // Login Endpoint Call: Dual Gateway (FastAPI / Frappe)
  async login(email, password) {
    await authStorage.clearAuth();

    let resData = null;
    let authError = null;

    // 1. Try FastAPI /auth/login
    try {
      const response = await fastApiClient.post('/auth/login', {
        usr: String(email).trim(),
        pwd: String(password)
      });
      resData = response.data;
    } catch (fastApiErr) {
      authError = fastApiErr;
      // 2. Fallback to Frappe direct RPC
      try {
        resData = await callFrappeMethod('login', {
          usr: String(email).trim(),
          pwd: String(password)
        });
      } catch (frappeErr) {
        authError = frappeErr;
      }
    }

    if (resData && (resData.success || resData.data)) {
      const tokenData = resData.data || resData;
      const apiKey = tokenData.api_key;
      const apiSecret = tokenData.api_secret;
      const user = tokenData.user || email;

      await authStorage.setAuth({
        apiKey,
        apiSecret,
        userEmail: user
      });

      // Verify and fetch session profile
      try {
        const sessionData = await this.verifySession();
        return { ...resData, session: sessionData };
      } catch {
        return resData;
      }
    }

    throw new Error(extractApiError(authError, 'Login failed. Please check your credentials.'), { cause: authError });
  },

  // Signup Endpoint Call: Dual Gateway (FastAPI / Frappe)
  async signup(payload) {
    await authStorage.clearAuth();

    let resData = null;
    let authError = null;

    const body = {
      email: String(payload.email).trim(),
      password: String(payload.password),
      first_name: String(payload.first_name).trim(),
      last_name: String(payload.last_name || '').trim()
    };

    try {
      const response = await fastApiClient.post('/auth/signup', body);
      resData = response.data;
    } catch (fastApiErr) {
      authError = fastApiErr;
      try {
        resData = await callFrappeMethod('signup', body);
      } catch (frappeErr) {
        authError = frappeErr;
      }
    }

    if (resData && (resData.success || resData.data)) {
      const tokenData = resData.data || resData;
      const apiKey = tokenData.api_key;
      const apiSecret = tokenData.api_secret;
      const user = tokenData.user || payload.email;

      await authStorage.setAuth({
        apiKey,
        apiSecret,
        userEmail: user
      });

      try {
        const sessionData = await this.verifySession();
        return { ...resData, session: sessionData };
      } catch {
        return resData;
      }
    }

    throw new Error(extractApiError(authError, 'Registration failed.'), { cause: authError });
  },

  // Verify Active Session on App Start
  async verifySession() {
    const { apiKey, apiSecret, userEmail, profile, consent } = await authStorage.getAuth();
    if (!apiKey || !apiSecret || apiKey === 'undefined') return null;

    try {
      let resData = null;
      try {
        const response = await fastApiClient.get('/auth/verify-session');
        resData = response.data;
      } catch {
        resData = await callFrappeMethod('verify_user_session', {}, true);
      }

      if (resData && (resData.success || resData.data)) {
        const data = resData.data || resData;
        if (data.profile) await authStorage.setProfile(data.profile);
        if (data.consent) await authStorage.setConsent(data.consent);
        return data;
      }
      return null;
    } catch (err) {
      // If device is offline or server unreachable, preserve authenticated session using local storage
      const isNetworkIssue = typeof navigator !== 'undefined' && (!navigator.onLine || err.message?.includes('Network Error') || !err.response);
      if (isNetworkIssue && userEmail) {
        return {
          user: userEmail,
          profile: profile || {},
          consent: consent || {},
          _offline_session: true
        };
      }

      // Only wipe credentials on explicit 401/403 rejected token
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        await authStorage.clearAuth();
      }
      return null;
    }
  },

  // Logout
  async logout() {
    await authStorage.clearAuth();
    window.dispatchEvent(new CustomEvent('wellpro:unauthorized'));
  }
};

export default authService;
