import localforage from 'localforage';

/**
 * WellPro IndexedDB Storage Architecture:
 * 1. authStore: API keys, secrets, authenticated session metadata
 * 2. cacheStore: Persistent offline cache for dashboard, feed timeline, records, goals
 * 3. queueStore: Outbound offline request queue supporting raw binary Blobs/Files (Audio & Camera OCR)
 */

export const authStore = localforage.createInstance({
  name: 'WellProPWA',
  storeName: 'auth_store'
});

export const cacheStore = localforage.createInstance({
  name: 'WellProPWA',
  storeName: 'data_cache_store'
});

export const queueStore = localforage.createInstance({
  name: 'WellProPWA',
  storeName: 'outbound_queue'
});

/**
 * Cache Helper for Offline Reading
 */
export const localCache = {
  async set(key, data, meta = {}) {
    try {
      const entry = {
        data,
        meta,
        cachedAt: new Date().toISOString()
      };
      await cacheStore.setItem(key, entry);
      return entry;
    } catch (err) {
      console.warn(`[LocalCache] Failed to cache "${key}":`, err);
      return null;
    }
  },

  async get(key) {
    try {
      const entry = await cacheStore.getItem(key);
      if (!entry) return null;
      return entry.data;
    } catch (err) {
      console.warn(`[LocalCache] Failed to read "${key}":`, err);
      return null;
    }
  },

  async getWithMeta(key) {
    try {
      return await cacheStore.getItem(key);
    } catch (err) {
      console.warn(`[LocalCache] Failed to read meta for "${key}":`, err);
      return null;
    }
  },

  async remove(key) {
    try {
      await cacheStore.removeItem(key);
    } catch (err) {
      console.warn(`[LocalCache] Failed to remove "${key}":`, err);
    }
  },

  async clear() {
    try {
      await cacheStore.clear();
    } catch (err) {
      console.warn('[LocalCache] Failed to clear cache store:', err);
    }
  }
};

/**
 * Queue Helper for Offline Outbound Requests (IndexedDB with Blob/File support)
 */
export const localQueue = {
  async getAll() {
    try {
      const items = [];
      await queueStore.iterate((value) => {
        if (value) items.push(value);
      });
      // Sort chronologically (oldest first for FIFO execution, or newest for display)
      return items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } catch (err) {
      console.warn('[LocalQueue] Failed to get items:', err);
      return [];
    }
  },

  async getItem(id) {
    try {
      return await queueStore.getItem(id);
    } catch (err) {
      console.warn(`[LocalQueue] Failed to get item "${id}":`, err);
      return null;
    }
  },

  async setItem(id, item) {
    try {
      await queueStore.setItem(id, item);
      return item;
    } catch (err) {
      console.error(`[LocalQueue] Failed to save item "${id}":`, err);
      throw err;
    }
  },

  async removeItem(id) {
    try {
      await queueStore.removeItem(id);
    } catch (err) {
      console.warn(`[LocalQueue] Failed to remove item "${id}":`, err);
    }
  },

  async clearFulfilled() {
    try {
      const all = await this.getAll();
      for (const item of all) {
        if (item.status === 'fulfilled') {
          await queueStore.removeItem(item.id);
        }
      }
    } catch (err) {
      console.warn('[LocalQueue] Failed to clear fulfilled items:', err);
    }
  },

  async countPending() {
    try {
      let count = 0;
      await queueStore.iterate((value) => {
        if (value && (value.status === 'pending' || value.status === 'failed')) {
          count++;
        }
      });
      return count;
    } catch (err) {
      console.warn('[LocalQueue] Failed to count pending items:', err);
      return 0;
    }
  }
};

