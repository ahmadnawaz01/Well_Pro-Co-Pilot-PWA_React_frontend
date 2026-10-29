import { frappeClient } from './apiClient';
import { authStorage } from './storage';

export const authService = {
  // Login Endpoint Call
  async login(email, password) {
    await authStorage.clearAuth();

    // Sends POST request to http://localhost:8000/api/method/well_pro.well_pro_app.api.login
    const response = await frappeClient.post('/well_pro.well_pro_app.api.login', {
      usr: String(email).trim(),
      pwd: String(password)
    });

    const resData = response.data.message || response.data;
    if (resData.success && resData.data) {
      const { api_key, api_secret, user } = resData.data;
      await authStorage.setAuth({
        apiKey: api_key,
        apiSecret: api_secret,
        userEmail: user || email
      });
      return resData;
    }
    throw new Error(resData.message || 'Login failed');
  },

  // Signup Endpoint Call
  async signup(payload) {
    await authStorage.clearAuth();

    // Sends POST request to http://localhost:8000/api/method/well_pro.well_pro_app.api.signup
    const response = await frappeClient.post('/well_pro.well_pro_app.api.signup', {
      email: String(payload.email).trim(),
      password: String(payload.password),
      first_name: String(payload.first_name).trim(),
      last_name: String(payload.last_name || '').trim()
    });

    const resData = response.data.message || response.data;
    if (resData.success && resData.data) {
      const { api_key, api_secret, user } = resData.data;
      await authStorage.setAuth({
        apiKey: api_key,
        apiSecret: api_secret,
        userEmail: user || payload.email
      });
      return resData;
    }
    throw new Error(resData.message || 'Registration failed');
  },

  // Verify Active Session on App Start
  async verifySession() {
    const { apiKey, apiSecret } = await authStorage.getAuth();
    if (!apiKey || !apiSecret || apiKey === 'undefined') return null;

    try {
      // Sends GET request to http://localhost:8000/api/method/well_pro.well_pro_app.api.verify_user_session
      const response = await frappeClient.get('/well_pro.well_pro_app.api.verify_user_session');
      const resData = response.data.message || response.data;
      if (resData.success) {
        return resData.data;
      }
      return null;
    } catch (err) {
      await authStorage.clearAuth();
      return null;
    }
  },

  // Logout
  async logout() {
    await authStorage.clearAuth();
    window.dispatchEvent(new CustomEvent('wellpro:unauthorized'));
  }
};