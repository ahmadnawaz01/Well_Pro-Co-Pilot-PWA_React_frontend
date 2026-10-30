import { useState, useEffect } from 'react';
import { goalsService } from '../services/goalsService';
import { authStorage } from '../services/storage';
import { Target, Heart, Shield, Save, CheckCircle2, AlertCircle, RefreshCw, DollarSign, Activity, Droplets } from 'lucide-react';

export function MyLifePage({ userEmail, userProfile, userConsent, onProfileUpdated }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Goals State
  const [goals, setGoals] = useState({
    steps: '10000',
    financial_budget: '3000',
    savings_rate: '20%',
    water: '2.5L',
    exercise_minutes: '30'
  });

  const [preferredCurrency, setPreferredCurrency] = useState(userProfile?.preferred_currency || 'USD');

  // Load effective goals on mount
  useEffect(() => {
    async function loadGoals() {
      try {
        const data = await goalsService.getScoringGoals();
        if (data) {
          const effective = data.configured_goals || data.effective_goals || data;
          setGoals(prev => ({
            ...prev,
            steps: String(effective.steps_target || effective.steps || prev.steps),
            financial_budget: String(effective.budget_amount || effective.financial_budget || prev.financial_budget),
            savings_rate: effective.target_savings_rate
              ? `${Math.round(effective.target_savings_rate * 100)}%`
              : prev.savings_rate,
            water: effective.water_liters_target
              ? `${effective.water_liters_target}L`
              : prev.water,
            exercise_minutes: String(effective.exercise_minutes_target || effective.exercise_minutes || prev.exercise_minutes)
          }));
        }
      } catch (err) {
        console.warn('Could not load scoring goals:', err);
      } finally {
        setLoading(false);
      }
    }
    loadGoals();
  }, []);

  const handleSaveGoals = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        steps: goals.steps,
        financial_budget: goals.financial_budget,
        savings_rate: goals.savings_rate,
        water: goals.water,
        exercise_minutes: Number(goals.exercise_minutes)
      };

      await goalsService.setupScoringGoals(payload, true);
      setSuccessMsg('Wellbeing scoring goals updated and active in recalculation engine!');

      // Update preferred currency locally in profile
      if (preferredCurrency !== userProfile?.preferred_currency) {
        const updatedProfile = { ...(userProfile || {}), preferred_currency: preferredCurrency };
        await authStorage.setProfile(updatedProfile);
        if (onProfileUpdated) onProfileUpdated(updatedProfile);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update scoring goals');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#121820] to-[#1a232e] border border-[#2a3644] rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-gradient-to-tr from-[#f43f5e] to-[#a855f7] rounded-xl text-white shadow-lg shadow-rose-500/20">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">My Wellbeing Profile & Scoring Goals</h2>
            <span className="font-mono text-xs text-[#06b6d4]">
              GOALS CONFIGURATION ENGINE (5.6)
            </span>
          </div>
        </div>
        <p className="text-xs text-[#8a99ad] leading-relaxed">
          Configure your personal targets. The automatic scoring engine dynamically normalizes your daily Health, Financial, and Social scores against these baseline targets.
        </p>
      </div>

      {successMsg && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 p-3 rounded-xl font-mono text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-950/80 border border-red-500/50 text-red-200 p-3 rounded-xl font-mono text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form: Scoring Goals */}
      <form onSubmit={handleSaveGoals} className="bg-[#121820] border border-[#2a3644] rounded-2xl p-6 shadow-xl space-y-6">
        <div className="border-b border-[#2a3644] pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-[#f43f5e]" />
            <span>Target Heuristics</span>
          </h3>
          <span className="font-mono text-[10px] text-[#8a99ad]">
            Accepts flexible inputs (e.g. "12k", "25%", "$3,500", "3L", 45)
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center font-mono text-xs text-[#8a99ad]">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#f43f5e]" />
            <span>LOADING SCORING GOALS...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            {/* Steps Target */}
            <div className="bg-[#1a232e] p-3.5 rounded-xl border border-[#2a3644] space-y-1.5">
              <label className="text-[10px] text-emerald-400 font-bold block flex items-center gap-1">
                <Activity className="w-3.5 h-3.5" /> DAILY STEPS TARGET
              </label>
              <input
                type="text"
                value={goals.steps}
                onChange={(e) => setGoals({ ...goals, steps: e.target.value })}
                placeholder="10000 or 10k"
                className="w-full bg-[#121820] border border-[#2a3644] text-white p-2.5 rounded-lg focus:outline-none focus:border-emerald-400"
              />
              <span className="text-[9px] text-[#8a99ad] block">Default baseline: 10,000 steps</span>
            </div>

            {/* Monthly Budget */}
            <div className="bg-[#1a232e] p-3.5 rounded-xl border border-[#2a3644] space-y-1.5">
              <label className="text-[10px] text-cyan-400 font-bold block flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" /> MONTHLY EXPENSE BUDGET
              </label>
              <input
                type="text"
                value={goals.financial_budget}
                onChange={(e) => setGoals({ ...goals, financial_budget: e.target.value })}
                placeholder="3000 or $3,500"
                className="w-full bg-[#121820] border border-[#2a3644] text-white p-2.5 rounded-lg focus:outline-none focus:border-cyan-400"
              />
              <span className="text-[9px] text-[#8a99ad] block">Monthly target spending threshold</span>
            </div>

            {/* Savings Rate */}
            <div className="bg-[#1a232e] p-3.5 rounded-xl border border-[#2a3644] space-y-1.5">
              <label className="text-[10px] text-cyan-400 font-bold block flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" /> TARGET SAVINGS RATE
              </label>
              <input
                type="text"
                value={goals.savings_rate}
                onChange={(e) => setGoals({ ...goals, savings_rate: e.target.value })}
                placeholder="20% or 0.20"
                className="w-full bg-[#121820] border border-[#2a3644] text-white p-2.5 rounded-lg focus:outline-none focus:border-cyan-400"
              />
              <span className="text-[9px] text-[#8a99ad] block">Target percentage of monthly income saved</span>
            </div>

            {/* Daily Water Target */}
            <div className="bg-[#1a232e] p-3.5 rounded-xl border border-[#2a3644] space-y-1.5">
              <label className="text-[10px] text-emerald-400 font-bold block flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5" /> DAILY WATER TARGET
              </label>
              <input
                type="text"
                value={goals.water}
                onChange={(e) => setGoals({ ...goals, water: e.target.value })}
                placeholder="2.5L or 2500ml"
                className="w-full bg-[#121820] border border-[#2a3644] text-white p-2.5 rounded-lg focus:outline-none focus:border-emerald-400"
              />
              <span className="text-[9px] text-[#8a99ad] block">Hydration baseline (liters)</span>
            </div>

            {/* Exercise Minutes Target */}
            <div className="bg-[#1a232e] p-3.5 rounded-xl border border-[#2a3644] space-y-1.5">
              <label className="text-[10px] text-emerald-400 font-bold block flex items-center gap-1">
                <Activity className="w-3.5 h-3.5" /> DAILY EXERCISE TARGET (MINS)
              </label>
              <input
                type="number"
                value={goals.exercise_minutes}
                onChange={(e) => setGoals({ ...goals, exercise_minutes: e.target.value })}
                placeholder="30"
                className="w-full bg-[#121820] border border-[#2a3644] text-white p-2.5 rounded-lg focus:outline-none focus:border-emerald-400"
              />
              <span className="text-[9px] text-[#8a99ad] block">Daily active workout goal</span>
            </div>

            {/* Preferred Currency */}
            <div className="bg-[#1a232e] p-3.5 rounded-xl border border-[#2a3644] space-y-1.5">
              <label className="text-[10px] text-purple-400 font-bold block">
                PREFERRED CURRENCY
              </label>
              <select
                value={preferredCurrency}
                onChange={(e) => setPreferredCurrency(e.target.value)}
                className="w-full bg-[#121820] border border-[#2a3644] text-white p-2.5 rounded-lg focus:outline-none focus:border-purple-400 cursor-pointer"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="PKR">PKR (Rs)</option>
                <option value="AED">AED (AED)</option>
                <option value="CAD">CAD (C$)</option>
              </select>
              <span className="text-[9px] text-[#8a99ad] block">ISO currency formatting</span>
            </div>
          </div>
        )}

        {/* User Isolation & Consent Status */}
        <div className="bg-[#1a232e]/50 border border-[#2a3644] rounded-xl p-4 space-y-3 font-mono text-xs">
          <div className="flex items-center gap-2 text-white font-bold">
            <Shield className="w-4 h-4 text-[#10b981]" />
            <span>Consent & Multi-User Isolation Status</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
            <div className="bg-[#121820] p-2 rounded-lg border border-[#2a3644]">
              <span className="text-[#8a99ad] block">HEALTH TRACKING</span>
              <span className={`font-bold ${userConsent?.health_tracking_enabled !== 0 ? 'text-emerald-400' : 'text-[#8a99ad]'}`}>
                {userConsent?.health_tracking_enabled !== 0 ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>
            <div className="bg-[#121820] p-2 rounded-lg border border-[#2a3644]">
              <span className="text-[#8a99ad] block">FINANCIAL TRACKING</span>
              <span className={`font-bold ${userConsent?.financial_tracking_enabled !== 0 ? 'text-cyan-400' : 'text-[#8a99ad]'}`}>
                {userConsent?.financial_tracking_enabled !== 0 ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>
            <div className="bg-[#121820] p-2 rounded-lg border border-[#2a3644]">
              <span className="text-[#8a99ad] block">SOCIAL TRACKING</span>
              <span className={`font-bold ${userConsent?.social_tracking_enabled !== 0 ? 'text-purple-400' : 'text-[#8a99ad]'}`}>
                {userConsent?.social_tracking_enabled !== 0 ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>
            <div className="bg-[#121820] p-2 rounded-lg border border-[#2a3644]">
              <span className="text-[#8a99ad] block">AI PROCESSING</span>
              <span className={`font-bold ${userConsent?.allow_ai_processing !== 0 ? 'text-rose-400' : 'text-[#8a99ad]'}`}>
                {userConsent?.allow_ai_processing !== 0 ? 'ACTIVE' : 'DISABLED'}
              </span>
            </div>
          </div>
          <span className="text-[10px] text-[#8a99ad] block">
            Authenticated Account: <strong className="text-white">{userEmail}</strong>
          </span>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#f43f5e] to-[#a855f7] hover:opacity-90 text-white font-mono text-xs font-bold rounded-xl shadow-lg shadow-rose-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>SAVING & RECALCULATING...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>UPDATE GOALS & RECALCULATE ENGINE</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default MyLifePage;
