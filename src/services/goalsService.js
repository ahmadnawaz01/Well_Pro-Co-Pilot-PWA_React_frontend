import { callFrappeMethod, extractFrappeError } from './apiClient';

export const goalsService = {
  /**
   * Retrieves effective user scoring goals merged with system baseline heuristics.
   * Target endpoint: /api/method/well_pro.well_pro_app.api.get_scoring_goals
   */
  async getScoringGoals() {
    try {
      const resData = await callFrappeMethod('get_scoring_goals', {}, true);
      if (resData && (resData.success || resData.data)) {
        return resData.data || resData;
      }
      return null;
    } catch (err) {
      console.warn('Failed to retrieve scoring goals:', extractFrappeError(err));
      return null;
    }
  },

  /**
   * Customizes user wellbeing targets (e.g. 10k steps, $500 budget, 20% savings rate).
   * Parses human-friendly strings like "10k", "20%", "2500ml", "3L".
   * Target endpoint: /api/method/well_pro.well_pro_app.api.setup_scoring_goals
   */
  async setupScoringGoals(goals, recalculate = true) {
    try {
      const resData = await callFrappeMethod('setup_scoring_goals', {
        goals,
        recalculate: Boolean(recalculate)
      });

      if (resData && (resData.success || resData.data)) {
        return resData;
      }
      throw new Error(resData?.message || 'Failed to update scoring goals');
    } catch (err) {
      throw new Error(extractFrappeError(err, 'Failed to update scoring goals'), { cause: err });
    }
  }
};
