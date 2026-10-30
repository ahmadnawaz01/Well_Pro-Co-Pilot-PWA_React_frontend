import { callFrappeMethod, extractFrappeError } from './apiClient';
import { offlineQueueService } from './offlineQueueService';

// All 6 user-tracking DocTypes in WellPro
export const TRACKING_DOCTYPES = [
  { doctype: 'Financial Transaction', dateField: 'transaction_date', label: 'Financial' },
  { doctype: 'Financial Snapshot', dateField: 'snapshot_date', label: 'Snapshot' },
  { doctype: 'Health Activity', dateField: 'logged_at', label: 'Fitness' },
  { doctype: 'Health Daily Record', dateField: 'record_date', label: 'Daily Health' },
  { doctype: 'Social Activity', dateField: 'logged_at', label: 'Social' },
  { doctype: 'Subjective Wellbeing Checkin', dateField: 'date', label: 'Wellbeing' }
];

export const feedService = {
  /**
   * Retrieves paginated records for a specific DocType scoped to the authenticated user.
   * Target endpoint: /api/method/well_pro.well_pro_app.api.get_user_records
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

    try {
      const resData = await callFrappeMethod('get_user_records', params, true);
      if (resData && resData.success && Array.isArray(resData.data)) {
        return {
          records: resData.data,
          count: resData.count || resData.data.length,
          limit: resData.limit || params.limit,
          offset: resData.offset || params.offset
        };
      }
      return { records: [], count: 0, limit: params.limit, offset: params.offset };
    } catch (err) {
      console.warn(`Failed to fetch records for ${doctype}:`, extractFrappeError(err));
      return { records: [], count: 0, limit: params.limit, offset: params.offset };
    }
  },

  /**
   * Fetches and aggregates records across all 6 tracking DocTypes into a unified chronological feed.
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

      // Retrieve pending offline items and surface them at the top of the feed
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

      // Sort timeline descending (newest first)
      combined.sort((a, b) => new Date(b._timestamp) - new Date(a._timestamp));
      return [...offlinePendingItems, ...combined];
    } catch (err) {
      console.error('Failed to query unified feed:', err);
      // Fallback: return queued offline items if completely offline
      return offlineQueueService
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
    }
  },

  /**
   * Universal ingestion endpoint supporting:
   * 1. Single Record: { doctype, record_data }
   * 2. Multi-DocType Composite: { "Health Daily Record": {...}, "Financial Transaction": [...] }
   * 3. Batch Array: { records: [...] }
   *
   * Target endpoint: /api/method/well_pro.well_pro_app.api.insert_record
   */
  async insertRecord(payload, isOfflineReplay = false) {
    if (!offlineQueueService.isOnline() && !isOfflineReplay) {
      const doctype = payload.doctype || (payload.records && payload.records[0]?.doctype) || 'Record';
      const queued = offlineQueueService.enqueue('insert_record', payload, {
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
      const resData = await callFrappeMethod('insert_record', payload);
      if (resData && (resData.success || resData.data)) {
        return resData;
      }
      throw new Error(resData?.message || 'Failed to insert record');
    } catch (err) {
      if (!isOfflineReplay && (!navigator.onLine || err.message?.includes('Network Error'))) {
        const doctype = payload.doctype || 'Record';
        offlineQueueService.enqueue('insert_record', payload, {
          doctype,
          title: `Offline ${doctype}`,
          preview: 'Record queued after network failure'
        });
        return {
          success: true,
          _offline_pending: true,
          message: 'Network issue detected. Saved to offline queue.'
        };
      }
      throw new Error(extractFrappeError(err, 'Record creation failed'), { cause: err });
    }
  },

  /**
   * Dedicated endpoint for conversational LLM / voice transcripts.
   * Target endpoint: /api/method/well_pro.well_pro_app.api.store_ai_record
   */
  async storeAiRecord(payload) {
    try {
      const resData = await callFrappeMethod('store_ai_record', payload);
      if (resData && (resData.success || resData.data)) {
        return resData;
      }
      throw new Error(resData?.message || 'Failed to store AI record');
    } catch (err) {
      throw new Error(extractFrappeError(err, 'AI ingestion failed'), { cause: err });
    }
  },

  /**
   * Safely updates an existing user document.
   * Target endpoint: /api/method/well_pro.well_pro_app.api.update_record
   */
  async updateRecord(doctype, name, updateData, isOfflineReplay = false) {
    if (!offlineQueueService.isOnline() && !isOfflineReplay) {
      offlineQueueService.enqueue('update_record', { doctype, name, updateData }, {
        doctype,
        title: `Update ${doctype}`,
        preview: `Queued update for record ${name}`
      });
      return {
        success: true,
        _offline_pending: true,
        message: 'Update queued for offline synchronization.'
      };
    }

    try {
      const resData = await callFrappeMethod('update_record', {
        doctype,
        name,
        update_data: updateData
      });

      if (resData && (resData.success || resData.data)) {
        return resData;
      }
      throw new Error(resData?.message || 'Failed to update record');
    } catch (err) {
      throw new Error(extractFrappeError(err, 'Record update failed'), { cause: err });
    }
  },

  /**
   * Safely purges a record and updates daily scores.
   * Target endpoint: /api/method/well_pro.well_pro_app.api.delete_record
   */
  async deleteRecord(doctype, name, isOfflineReplay = false) {
    if (!offlineQueueService.isOnline() && !isOfflineReplay) {
      offlineQueueService.enqueue('delete_record', { doctype, name }, {
        doctype,
        title: `Delete ${doctype}`,
        preview: `Queued deletion for record ${name}`
      });
      return {
        success: true,
        _offline_pending: true,
        message: 'Deletion queued for offline synchronization.'
      };
    }

    try {
      const resData = await callFrappeMethod('delete_record', {
        doctype,
        name
      });

      if (resData && (resData.success || resData.data)) {
        return resData;
      }
      throw new Error(resData?.message || 'Failed to delete record');
    } catch (err) {
      throw new Error(extractFrappeError(err, 'Record deletion failed'), { cause: err });
    }
  }
};
