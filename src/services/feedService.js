import { callFrappeMethod, fastApiClient, extractApiError } from './apiClient';
import { offlineQueueService } from './offlineQueueService';
import { localCache } from './localDb';

// All 6 user-tracking DocTypes in WellPro
export const TRACKING_DOCTYPES = [
  { doctype: 'Financial Transaction', dateField: 'transaction_date', label: 'Financial' },
  { doctype: 'Financial Snapshot', dateField: 'snapshot_date', label: 'Snapshot' },
  { doctype: 'Health Activity', dateField: 'logged_at', label: 'Fitness' },
  { doctype: 'Health Daily Record', dateField: 'record_date', label: 'Daily Health' },
  { doctype: 'Social Activity', dateField: 'logged_at', label: 'Social' },
  { doctype: 'Subjective Wellbeing Checkin', dateField: 'date', label: 'Wellbeing' }
];

const FEED_CACHE_KEY = 'wellpro_cached_feed_records';

export const feedService = {
  /**
   * Retrieves paginated records for a specific DocType scoped to the authenticated user.
   * Tries Frappe RPC first, with automatic fallback to FastAPI /records and IndexedDB offline cache.
   */
  async getUserRecords(doctype, { limit = 50, offset = 0, order_by, fromDate, toDate } = {}) {
    const params = {
      doctype,
      limit: Math.max(1, Math.min(limit, 200)),
      offset: Math.max(0, offset)
    };

    if (order_by) params.order_by = order_by;
    if (fromDate) params.from_date = fromDate;
    if (toDate) params.to_date = toDate;

    let resData = null;

    // 1. Try Frappe get_user_records
    try {
      resData = await callFrappeMethod('get_user_records', {
        doctype,
        limit: params.limit,
        offset: params.offset,
        order_by,
        from_date: fromDate,
        to_date: toDate
      }, true);
    } catch (frappeErr) {
      // 2. Fallback to FastAPI /records
      try {
        const response = await fastApiClient.get('/records', { params });
        resData = response.data;
      } catch (fastApiErr) {
        console.warn(`Failed fetching records for ${doctype}:`, frappeErr.message || fastApiErr.message);
      }
    }

    if (resData) {
      const records = Array.isArray(resData.data)
        ? resData.data
        : Array.isArray(resData.records)
        ? resData.records
        : Array.isArray(resData)
        ? resData
        : [];

      // Cache records for this doctype
      await localCache.set(`records_${doctype}`, records);

      return {
        records,
        count: resData.count || records.length,
        limit: resData.limit || params.limit,
        offset: resData.offset || params.offset
      };
    }

    // 3. Offline Cache Recovery for this doctype
    const cached = await localCache.get(`records_${doctype}`);
    if (Array.isArray(cached) && cached.length > 0) {
      return {
        records: cached,
        count: cached.length,
        limit: params.limit,
        offset: params.offset,
        _fromCache: true
      };
    }

    return { records: [], count: 0, limit: params.limit, offset: params.offset };
  },

  /**
   * Fetches and aggregates records across all 6 tracking DocTypes into a unified chronological feed.
   * Features automatic offline recovery from IndexedDB local storage cache.
   */
  async getUnifiedFeed({ fromDate, toDate, limitPerType = 50 } = {}) {
    try {
      const fetchPromises = TRACKING_DOCTYPES.map(async ({ doctype, dateField }) => {
        try {
          const { records } = await this.getUserRecords(doctype, {
            limit: limitPerType,
            order_by: `${dateField} desc`,
            fromDate,
            toDate
          });

          return records.map((record) => ({
            ...record,
            _doctype: doctype,
            _timestamp:
              record.logged_at ||
              record.transaction_date ||
              record.record_date ||
              record.snapshot_date ||
              record.date ||
              record.creation
          }));
        } catch (err) {
          console.warn(`Failed fetching feed records for ${doctype}:`, err);
          return [];
        }
      });

      const results = await Promise.all(fetchPromises);
      const combined = results.flat();

      // Retrieve pending offline items from queue and surface them at the top of the feed
      const offlinePendingItems = offlineQueueService
        .getQueue()
        .filter((i) => (i.status === 'pending' || i.status === 'syncing') && i.type === 'insert_record')
        .map((i) => {
          const raw = i.payload?.record_data || (Array.isArray(i.payload?.records) ? i.payload.records[0] : i.payload) || {};
          return {
            ...raw,
            name: i.id,
            _doctype: i.meta?.doctype || 'Health Daily Record',
            _timestamp: i.createdAt,
            _offline_pending: true,
            _queue_id: i.id,
            description: i.meta?.preview || raw.description || raw.notes
          };
        });

      // If we fetched fresh records, cache them in IndexedDB for offline viewing
      if (combined.length > 0) {
        await localCache.set(FEED_CACHE_KEY, combined);
        try {
          localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(combined));
        } catch {
          // ignore
        }
      }

      // Sort timeline descending (newest first)
      combined.sort((a, b) => new Date(b._timestamp) - new Date(a._timestamp));
      return [...offlinePendingItems, ...combined];
    } catch (err) {
      console.warn('Failed to query unified feed from network, attempting offline cache:', err);

      // Offline Recovery: Load cached records from IndexedDB
      let cachedRecords = await localCache.get(FEED_CACHE_KEY);
      if (!Array.isArray(cachedRecords) || cachedRecords.length === 0) {
        try {
          const fallback = localStorage.getItem(FEED_CACHE_KEY);
          if (fallback) cachedRecords = JSON.parse(fallback);
        } catch {
          // ignore
        }
      }
      if (!Array.isArray(cachedRecords)) cachedRecords = [];

      const offlinePendingItems = offlineQueueService
        .getQueue()
        .filter((i) => i.type === 'insert_record')
        .map((i) => {
          const raw = i.payload?.record_data || i.payload || {};
          return {
            ...raw,
            name: i.id,
            _doctype: i.meta?.doctype || 'Record',
            _timestamp: i.createdAt,
            _offline_pending: i.status !== 'fulfilled',
            _queue_id: i.id
          };
        });

      cachedRecords.sort((a, b) => new Date(b._timestamp) - new Date(a._timestamp));
      return [...offlinePendingItems, ...cachedRecords];
    }
  },

  /**
   * Universal ingestion endpoint supporting:
   * 1. Single Record: { doctype, record_data }
   * 2. Multi-DocType Composite: { "Health Daily Record": {...}, "Financial Transaction": [...] }
   * 3. Batch Array: { records: [...] }
   */
  async insertRecord(payload, isOfflineReplay = false) {
    if (!offlineQueueService.isOnline() && !isOfflineReplay) {
      const doctype = payload.doctype || (payload.records && payload.records[0]?.doctype) || 'Record';
      const queued = await offlineQueueService.enqueue('insert_record', payload, {
        doctype,
        title: `Offline ${doctype}`,
        preview: JSON.stringify(payload.record_data || payload.records || payload).slice(0, 100)
      });
      return {
        success: true,
        _offline_pending: true,
        message: 'Saved offline. Record will sync when reconnected.',
        data: payload.record_data || payload,
        queue_id: queued.id
      };
    }

    try {
      // 1. Try Frappe insert_record
      try {
        const resData = await callFrappeMethod('insert_record', payload);
        if (resData && (resData.success || resData.data)) {
          return resData;
        }
      } catch (frappeErr) {
        // 2. Fallback to FastAPI /records/insert
        const response = await fastApiClient.post('/records/insert', payload);
        if (response.data) return response.data;
        throw frappeErr;
      }
    } catch (err) {
      if (!isOfflineReplay && (!navigator.onLine || err.message?.includes('Network Error'))) {
        const doctype = payload.doctype || 'Record';
        await offlineQueueService.enqueue('insert_record', payload, {
          doctype,
          title: `Offline ${doctype}`,
          preview: 'Record queued after network failure'
        });
        return {
          success: true,
          _offline_pending: true,
          message: 'Saved offline due to network issue. Will sync automatically.',
          data: payload
        };
      }
      throw new Error(extractApiError(err, 'Failed to insert record'), { cause: err });
    }
  },

  /**
   * Dedicated AI extracted records ingestion.
   */
  async storeAiRecord(domainPayload, isOfflineReplay = false) {
    if (!offlineQueueService.isOnline() && !isOfflineReplay) {
      const queued = await offlineQueueService.enqueue('insert_record', domainPayload, {
        doctype: 'AI Extracted Ingestion',
        title: 'Offline AI Ingestion',
        preview: Object.keys(domainPayload).join(', ')
      });
      return {
        success: true,
        _offline_pending: true,
        message: 'Saved offline. AI records will sync when reconnected.',
        queue_id: queued.id
      };
    }

    try {
      try {
        const response = await fastApiClient.post('/records/store-ai', domainPayload);
        return response.data;
      } catch {
        const resData = await callFrappeMethod('store_ai_record', domainPayload);
        if (resData && (resData.success || resData.data)) return resData;
      }
    } catch (err) {
      throw new Error(extractApiError(err, 'Failed to store AI extracted record'), { cause: err });
    }
  },

  /**
   * Updates an existing document fields.
   */
  async updateRecord(doctype, name, updateData, isOfflineReplay = false) {
    if (!doctype || !name || !updateData) {
      throw new Error('doctype, name, and updateData are required');
    }

    if (!offlineQueueService.isOnline() && !isOfflineReplay) {
      const queued = await offlineQueueService.enqueue(
        'update_record',
        { doctype, name, updateData },
        {
          doctype,
          title: `Update ${doctype} (${name})`,
          preview: JSON.stringify(updateData).slice(0, 80)
        }
      );
      return {
        success: true,
        _offline_pending: true,
        message: 'Update queued offline. Will sync when reconnected.',
        queue_id: queued.id
      };
    }

    try {
      try {
        const resData = await callFrappeMethod('update_record', {
          doctype,
          name,
          update_data: updateData
        });
        return resData;
      } catch {
        const response = await fastApiClient.put('/records/update', {
          doctype,
          name,
          update_data: updateData
        });
        return response.data;
      }
    } catch (err) {
      if (!isOfflineReplay && (!navigator.onLine || err.message?.includes('Network Error'))) {
        await offlineQueueService.enqueue('update_record', { doctype, name, updateData }, {
          doctype,
          title: `Update ${doctype}`,
          preview: 'Update queued after network failure'
        });
        return { success: true, _offline_pending: true, message: 'Update saved locally.' };
      }
      throw new Error(extractApiError(err, `Failed to update ${doctype}`), { cause: err });
    }
  },

  /**
   * Permanently deletes a single document record.
   */
  async deleteRecord(doctype, name, isOfflineReplay = false) {
    if (!doctype || !name) {
      throw new Error('doctype and name are required');
    }

    if (!offlineQueueService.isOnline() && !isOfflineReplay) {
      const queued = await offlineQueueService.enqueue(
        'delete_record',
        { doctype, name },
        {
          doctype,
          title: `Delete ${doctype}`,
          preview: `Eviction of ${name}`
        }
      );
      return {
        success: true,
        _offline_pending: true,
        message: 'Deletion queued offline. Will sync when reconnected.',
        queue_id: queued.id
      };
    }

    try {
      try {
        const resData = await callFrappeMethod('delete_record', { doctype, name });
        return resData;
      } catch {
        const response = await fastApiClient.delete('/records/delete', {
          params: { doctype, name }
        });
        return response.data;
      }
    } catch (err) {
      if (!isOfflineReplay && (!navigator.onLine || err.message?.includes('Network Error'))) {
        await offlineQueueService.enqueue('delete_record', { doctype, name }, {
          doctype,
          title: `Delete ${doctype}`,
          preview: `Eviction of ${name}`
        });
        return { success: true, _offline_pending: true, message: 'Deletion queued locally.' };
      }
      throw new Error(extractApiError(err, `Failed to delete ${doctype}`), { cause: err });
    }
  }
};

export default feedService;
