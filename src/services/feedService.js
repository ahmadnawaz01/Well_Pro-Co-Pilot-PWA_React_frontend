import { frappeClient } from './apiClient';

const FEED_DOCTYPES = [
  'Financial Transaction',
  'Health Activity',
  'Social Activity',
  'Subjective Wellbeing Checkin',
  'Health Daily Record'
];

export const feedService = {
  async getUnifiedFeed({ limit = 50, fromDate, toDate } = {}) {
    try {
      const fetchPromises = FEED_DOCTYPES.map(async (doctype) => {
        try {
          const params = { doctype, limit };
          if (fromDate) params.from_date = fromDate;
          if (toDate) params.to_date = toDate;

          // Pass a cache-busting timestamp parameter so browser/Frappe doesn't return stale GET responses
          params._t = Date.now();

          const response = await frappeClient.get('/well_pro.well_pro_app.api.get_user_records', { params });
          const resData = response.data.message || response.data;
          
          if (resData.success && Array.isArray(resData.data)) {
            return resData.data.map(record => ({
              ...record,
              _doctype: doctype,
              _timestamp: record.logged_at || record.transaction_date || record.record_date || record.date || record.creation
            }));
          }
          return [];
        } catch (err) {
          console.warn(`Failed to fetch records for ${doctype}:`, err);
          return [];
        }
      });

      const results = await Promise.all(fetchPromises);
      const combined = results.flat();
      combined.sort((a, b) => new Date(b._timestamp) - new Date(a._timestamp));
      return combined;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to load life feed');
    }
  },

  // Delete record from backend database
  async deleteRecord(doctype, name) {
    const response = await frappeClient.post('/well_pro.well_pro_app.api.delete_record', {
      doctype,
      name
    });
    const resData = response.data.message || response.data;
    if (resData.success) {
      return resData;
    }
    throw new Error(resData.message || `Failed to delete ${doctype} ${name}`);
  }
};