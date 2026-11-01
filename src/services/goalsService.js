import { callFrappeMethod, fastApiClient, extractApiError } from './apiClient';
import { localCache } from './localDb';

const GOALS_CACHE_KEY = 'wellpro_cached_scoring_goals';

export const goalsService = {
  /**
   * Retrieves effective user scoring goals merged with system baseline heuristics.
   * Tries FastAPI /goals first, then Frappe get_scoring_goals, with IndexedDB offline cache fallback.
   */
  async getScoringGoals() {
    let resData = null;

    // 1. Try FastAPI /goals
    try {
      const response = await fastApiClient.get('/goals');
      resData = response.data;
    } catch {
      // 2. Try Frappe RPC
      try {
        resData = await callFrappeMethod('get_scoring_goals', {}, true);
      } catch (frappeErr) {
        console.warn('Failed to retrieve scoring goals from backend:', frappeErr.message);
      }
    }

    if (resData) {
      const data = resData.data || resData.message?.data || resData.message || resData;
      const goals = data.configured_goals || data.effective_goals || data.goals || data;

      await localCache.set(GOALS_CACHE_KEY, goals);
      try {
        localStorage.setItem(GOALS_CACHE_KEY, JSON.stringify(goals));
      } catch {
        // ignore
      }

      return goals;
    }

    // 3. Offline IndexedDB cache fallback
    try {
      const cached = await localCache.get(GOALS_CACHE_KEY);
      if (cached) return cached;

      const fallback = localStorage.getItem(GOALS_CACHE_KEY);
      if (fallback) return JSON.parse(fallback);
    } catch (e) {
      console.warn('Failed reading cached goals:', e);
    }

    return null;
  },

  /**
   * Customizes user wellbeing targets (e.g. 10k steps, $500 budget, 20% savings rate).
   * Fully offline-capable: queues request in IndexedDB when offline and updates local cache instantly.
   */
  async setupScoringGoals(goals, recalculate = true, isOfflineReplay = false) {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // Immediately update local cache so UI reflects change instantly
    await localCache.set(GOALS_CACHE_KEY, goals);
    try {
      localStorage.setItem(GOALS_CACHE_KEY, JSON.stringify(goals));
    } catch {
      // ignore
    }

    if (!isOnline && !isOfflineReplay) {
      const { offlineQueueService } = await import('./offlineQueueService');
      await offlineQueueService.enqueue('setup_goals', { goals, recalculate }, {
        title: 'Update Scoring Goals',
        preview: `Targets: ${Object.keys(goals).map(k => `${k}: ${goals[k]}`).join(', ')}`
      });

      return {
        success: true,
        _offline_pending: true,
        message: 'Goals saved locally. Will sync with backend when reconnected.',
        data: goals
      };
    }

    try {
      // 1. Try FastAPI Gateway
      try {
        const response = await fastApiClient.post('/goals/setup', {
          goals,
          recalculate: Boolean(recalculate)
        });
        return response.data?.data || response.data;
      } catch (fastApiErr) {
        // 2. Fallback to Frappe RPC
        const resData = await callFrappeMethod('setup_scoring_goals', {
          goals,
          recalculate: Boolean(recalculate)
        });
        if (resData && (resData.success || resData.data)) {
          return resData.data || resData;
        }
        throw fastApiErr;
      }
    } catch (err) {
      if (!isOfflineReplay && (!navigator.onLine || err.message?.includes('Network Error'))) {
        const { offlineQueueService } = await import('./offlineQueueService');
        await offlineQueueService.enqueue('setup_goals', { goals, recalculate }, {
          title: 'Update Scoring Goals',
          preview: 'Goals queued after network failure'
        });
        return {
          success: true,
          _offline_pending: true,
          message: 'Saved offline. Goals will sync when reconnected.',
          data: goals
        };
      }
      throw new Error(extractApiError(err, 'Failed to update scoring goals'), { cause: err });
    }
  }
};

export default goalsService;
