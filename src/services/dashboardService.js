import { callFrappeMethod, fastApiClient, extractApiError } from './apiClient';
import { localCache } from './localDb';

const CACHE_KEY = 'wellpro_cached_dashboard_metrics';

export const dashboardService = {
  /**
   * Fetches comprehensive dashboard metrics:
   * - current_scores (0-100 and confidence %)
   * - summary (health, financial, social, overall recency-weighted scores across today, 7d, 30d, 90d)
   * - historical_trends (rolling score timeline)
   * - recent domain feeds (health, financial, health_activities, social, checkins)
   *
   * Features IndexedDB local caching for Offline-First reading.
   */
  async getDashboardMetrics(days = 30, asOfDate = undefined) {
    const params = { days: Math.max(1, Math.min(days, 365)) };
    if (asOfDate) params.as_of_date = asOfDate;

    let resData = null;

    // 1. Try Frappe RPC primary engine
    try {
      resData = await callFrappeMethod('get_dashboard_metrics', params, true);
    } catch {
      try {
        resData = await callFrappeMethod('get_dashboard', params, true);
      } catch (frappeErr) {
        console.warn('Frappe get_dashboard_metrics failed, trying FastAPI Gateway:', frappeErr.message);
        // 2. Fallback to FastAPI Gateway
        try {
          const response = await fastApiClient.get('/dashboard/metrics', { params });
          resData = response.data;
        } catch (fastApiErr) {
          console.warn('FastAPI /dashboard/metrics also unavailable:', fastApiErr.message);
        }
      }
    }

    // 3. Process backend response
    if (resData) {
      const d = resData.data || resData.message?.data || resData.message || resData;

      if (d && (d.current_scores || d.summary || d.health || d.overall_score !== undefined)) {
        const summary = d.summary || {};
        const current = d.current_scores || {};

        const formatted = {
          ...d,
          as_of_date: d.as_of_date || current.score_date || new Date().toISOString().split('T')[0],
          days: d.days || days,
          scoring_version: current.scoring_version || d.scoring_version || 'v2.0.0',
          current_scores: current,
          summary: {
            health: summary.health || {
              today_score: current.health_score ?? d.health_score ?? 0,
              current_score: current.health_score ?? d.health_score ?? 0,
              confidence: current.health_confidence ?? 0,
              trend: 'stable'
            },
            financial: summary.financial || {
              today_score: current.financial_score ?? d.financial_score ?? 0,
              current_score: current.financial_score ?? d.financial_score ?? 0,
              confidence: current.financial_confidence ?? 0,
              trend: 'stable'
            },
            social: summary.social || {
              today_score: current.social_score ?? d.social_score ?? 0,
              current_score: current.social_score ?? d.social_score ?? 0,
              confidence: current.social_confidence ?? 0,
              trend: 'stable'
            },
            overall: summary.overall || {
              today_score: current.overall_score ?? d.overall_score ?? 0,
              score: current.overall_score ?? d.overall_score ?? 0,
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

        // Cache successful metrics in IndexedDB for offline reading
        await localCache.set(CACHE_KEY, formatted);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(formatted));
        } catch {
          // ignore
        }

        return formatted;
      }
    }

    // 4. Offline Recovery: Return cached metrics from IndexedDB if network is unreachable
    try {
      const cached = await localCache.get(CACHE_KEY);
      if (cached) return cached;

      const fallback = localStorage.getItem(CACHE_KEY);
      if (fallback) return JSON.parse(fallback);
    } catch (e) {
      console.warn('Failed reading cached metrics:', e);
    }

    return null;
  },

  /**
   * Forces explicit recalculation of Health, Financial, Social,
   * and Composite Wellbeing scores for a given day.
   */
  async recalculateScore(date, fromQueue = false) {
    const effectiveDate = date ? String(date).split('T')[0] : new Date().toISOString().split('T')[0];

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline && !fromQueue) {
      const { offlineQueueService } = await import('./offlineQueueService');
      await offlineQueueService.enqueue('recalculate_score', { date: effectiveDate }, {
        title: 'Recalculate Daily Scores',
        preview: `Scores for ${effectiveDate}`
      });
      return { status: 'queued', message: 'Recalculation queued for when online' };
    }

    try {
      const resData = await callFrappeMethod('recalculate_score', {
        date: effectiveDate
      });
      return resData?.data || resData;
    } catch (frappeErr) {
      try {
        const response = await fastApiClient.post('/dashboard/recalculate-score', {
          date: effectiveDate
        });
        return response.data?.data || response.data;
      } catch {
        if (!fromQueue) {
          const { offlineQueueService } = await import('./offlineQueueService');
          await offlineQueueService.enqueue('recalculate_score', { date: effectiveDate }, {
            title: 'Recalculate Daily Scores',
            preview: `Scores for ${effectiveDate}`
          });
        }
        throw new Error(extractApiError(frappeErr, 'Failed to recalculate wellbeing scores'), { cause: frappeErr });
      }
    }
  }
};

export default dashboardService;
