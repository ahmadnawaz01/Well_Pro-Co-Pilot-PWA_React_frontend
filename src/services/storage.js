import localforage from 'localforage';

// Configure IndexedDB instance for secure local storage
localforage.config({
  name: 'WellProPWA',
  storeName: 'auth_store'
});

export const authStorage = {
  async setAuth({ apiKey, apiSecret, userEmail }) {
    await localforage.setItem('api_key', apiKey);
    await localforage.setItem('api_secret', apiSecret);
    await localforage.setItem('user_email', userEmail);
  },

  async getAuth() {
    const apiKey = await localforage.getItem('api_key');
    const apiSecret = await localforage.getItem('api_secret');
    const userEmail = await localforage.getItem('user_email');
    return { apiKey, apiSecret, userEmail };
  },

  async clearAuth() {
    await localforage.removeItem('api_key');
    await localforage.removeItem('api_secret');
    await localforage.removeItem('user_email');
  }
};