import { callFrappeMethod, extractFrappeError } from './apiClient';
import { authStorage } from './storage';

export const authService = {
  // Login Endpoint Call
  // POST /api/method/well_pro.well_pro_app.api.login
  async login(email, password) {
    await authStorage.clearAuth();

    try {
      const resData = await callFrappeMethod('login', {
        usr: String(email).trim(),
        pwd: String(password)
      });

      if (resData && resData.success && resData.data) {
        const { api_key, api_secret, user } = resData.data;
        await authStorage.setAuth({
          apiKey: api_key,
          apiSecret: api_secret,
          userEmail: user || email
        });

        // Fetch user profile and consent settings
        try {
          const sessionData = await this.verifySession();
          return { ...resData, session: sessionData };
        } catch {
          return resData;
        }
      }
      throw new Error(resData?.message || 'Login failed');
    } catch (err) {
      throw new Error(extractFrappeError(err, 'Login failed. Please check your credentials.'), { cause: err });
    }
  },

  // Signup Endpoint Call
  // POST /api/method/well_pro.well_pro_app.api.signup
  async signup(payload) {
    await authStorage.clearAuth();

    try {
      const resData = await callFrappeMethod('signup', {
        email: String(payload.email).trim(),
        password: String(payload.password),
        first_name: String(payload.first_name).trim(),
        last_name: String(payload.last_name || '').trim()
      });

      if (resData && resData.success && resData.data) {
        const { api_key, api_secret, user } = resData.data;
        await authStorage.setAuth({
          apiKey: api_key,
          apiSecret: api_secret,
          userEmail: user || payload.email
        });

        try {
          const sessionData = await this.verifySession();
          return { ...resData, session: sessionData };
        } catch {
          return resData;
        }
      }
      throw new Error(resData?.message || 'Registration failed');
    } catch (err) {
      throw new Error(extractFrappeError(err, 'Registration failed.'), { cause: err });
    }
  },

  // Verify Active Session on App Start
  // GET /api/method/well_pro.well_pro_app.api.verify_user_session
  async verifySession() {
    const { apiKey, apiSecret } = await authStorage.getAuth();
    if (!apiKey || !apiSecret || apiKey === 'undefined') return null;

    try {
      const resData = await callFrappeMethod('verify_user_session', {}, true);
      if (resData && resData.success && resData.data) {
        const data = resData.data;
        if (data.profile) await authStorage.setProfile(data.profile);
        if (data.consent) await authStorage.setConsent(data.consent);
        return data;
      }
      return null;
    } catch {
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
