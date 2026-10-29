import { frappeClient } from './apiClient';

export const dashboardService = {
  async getDashboardMetrics(asOfDate) {
    try {
      const params = { _t: Date.now() }; // Prevent HTTP GET caching
      if (asOfDate) params.as_of_date = asOfDate;

      const response = await frappeClient.get('/well_pro.well_pro_app.api.get_dashboard', { params });
      const resData = response.data.message || response.data;

      if (resData.success && resData.data) {
        return resData.data;
      }
      return null;
    } catch (err) {
      console.warn('Failed to fetch dashboard score metrics:', err);
      return null;
    }
  },

  async recalculateScore(date) {
    const effectiveDate = date || new Date().toISOString().split('T')[0];
    const response = await frappeClient.post('/well_pro.well_pro_app.api.recalculate_score', {
      date: effectiveDate
    });
    const resData = response.data.message || response.data;

    if (resData.success) {
      return resData.data;
    }
    throw new Error(resData.message || 'Failed to recalculate scores');
  }
};