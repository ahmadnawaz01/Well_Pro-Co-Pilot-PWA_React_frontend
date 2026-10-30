import { callFrappeMethod, extractFrappeError } from './apiClient';

export const dashboardService = {
  /**
   * Fetches comprehensive dashboard metrics including:
   * - current_scores (0-100 and confidence %)
   * - summary (health, financial, social, overall recency-weighted scores across today, 7d, 30d, 90d, trends)
   * - historical_trends (rolling score timeline)
   * - recent domain feeds (health, financial, health_activities, social, checkins)
   *
   * Target endpoint: /api/method/well_pro.well_pro_app.api.get_dashboard_metrics
   */
  async getDashboardMetrics(days = 30, asOfDate = undefined) {
    try {
      const params = { days: Math.max(1, Math.min(days, 365)) };
      if (asOfDate) params.as_of_date = asOfDate;

      let resData;
      try {
        resData = await callFrappeMethod('get_dashboard_metrics', params, true);
      } catch (err) {
        // Compatibility fallback to get_dashboard if legacy alias is used
        if (err.response?.status === 404 || err.response?.status === 400) {
          resData = await callFrappeMethod('get_dashboard', params, true);
        } else {
          throw err;
        }
      }

      if (resData && resData.success && resData.data) {
        const d = resData.data;

        // Ensure summary domain objects are readily accessible
        const summary = d.summary || {};
        const current = d.current_scores || {};

        return {
          ...d,
          as_of_date: d.as_of_date || current.score_date || new Date().toISOString().split('T')[0],
          days: d.days || days,
          scoring_version: current.scoring_version || d.scoring_version || 'v1.0.0',
          current_scores: current,
          summary: {
            health: summary.health || {
              today_score: current.health_score ?? 0,
              current_score: current.health_score ?? 0,
              confidence: current.health_confidence ?? 0,
              trend: 'stable'
            },
            financial: summary.financial || {
              today_score: current.financial_score ?? 0,
              current_score: current.financial_score ?? 0,
              confidence: current.financial_confidence ?? 0,
              trend: 'stable'
            },
            social: summary.social || {
              today_score: current.social_score ?? 0,
              current_score: current.social_score ?? 0,
              confidence: current.social_confidence ?? 0,
              trend: 'stable'
            },
            overall: summary.overall || {
              today_score: current.overall_score ?? 0,
              score: current.overall_score ?? 0,
              trend: 'stable'
            }
          },
          historical_trends: Array.isArray(d.historical_trends) ? d.historical_trends : [],
          recent_feeds: {
            health: Array.isArray(d.health) ? d.health : [],
            financial: Array.isArray(d.financial) ? d.financial : [],
            health_activities: Array.isArray(d.health_activities) ? d.health_activities : [],
            social: Array.isArray(d.social) ? d.social : [],
            checkins: Array.isArray(d.checkins) ? d.checkins : []
          }
        };
      }
      return null;
    } catch (err) {
      console.warn('Failed to fetch dashboard metrics:', extractFrappeError(err));
      return null;
    }
  },

  /**
   * Forces explicit recalculation of Health, Financial, Social,
   * and Composite Wellbeing scores for a given day.
   * Target endpoint: /api/method/well_pro.well_pro_app.api.recalculate_score
   */
  async recalculateScore(date) {
    const effectiveDate = date ? String(date).split('T')[0] : new Date().toISOString().split('T')[0];

    try {
      const resData = await callFrappeMethod('recalculate_score', {
        date: effectiveDate
      });

      if (resData && resData.success) {
        return resData.data;
      }
      throw new Error(resData?.message || 'Failed to recalculate score');
    } catch (err) {
      throw new Error(extractFrappeError(err, 'Failed to recalculate score'), { cause: err });
    }
  }
};
