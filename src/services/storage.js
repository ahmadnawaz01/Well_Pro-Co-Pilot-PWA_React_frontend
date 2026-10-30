import localforage from 'localforage';

// Configure IndexedDB instance for secure local storage
localforage.config({
  name: 'WellProPWA',
  storeName: 'auth_store'
});

export const authStorage = {
  async setAuth({ apiKey, apiSecret, userEmail, profile, consent }) {
    await localforage.setItem('api_key', apiKey);
    await localforage.setItem('api_secret', apiSecret);
    await localforage.setItem('user_email', userEmail);
    if (profile) await localforage.setItem('user_profile', profile);
    if (consent) await localforage.setItem('user_consent', consent);
  },

  async getAuth() {
    const apiKey = await localforage.getItem('api_key');
    const apiSecret = await localforage.getItem('api_secret');
    const userEmail = await localforage.getItem('user_email');
    const profile = await localforage.getItem('user_profile');
    const consent = await localforage.getItem('user_consent');
    return { apiKey, apiSecret, userEmail, profile, consent };
  },

  async setProfile(profile) {
    await localforage.setItem('user_profile', profile);
  },

  async getProfile() {
    return await localforage.getItem('user_profile');
  },

  async setConsent(consent) {
    await localforage.setItem('user_consent', consent);
  },

  async getConsent() {
    return await localforage.getItem('user_consent');
  },

  async clearAuth() {
    await localforage.removeItem('api_key');
    await localforage.removeItem('api_secret');
    await localforage.removeItem('user_email');
    await localforage.removeItem('user_profile');
    await localforage.removeItem('user_consent');
  }
};
