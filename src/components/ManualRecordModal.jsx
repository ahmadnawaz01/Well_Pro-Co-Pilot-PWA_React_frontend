import { useState, useEffect } from 'react';
import { feedService } from '../services/feedService';
import { X, PlusCircle, CheckCircle2, Sparkles, Layers } from 'lucide-react';

export function ManualRecordModal({ isOpen, onClose, onSuccess }) {
  const [entryMode, setEntryMode] = useState('single'); // 'single' | 'multidoctype'
  const [doctype, setDoctype] = useState('Financial Transaction');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getNowStr = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const initialFormState = {
    entry_date: getTodayStr(),
    entry_datetime: getNowStr(),

    // Financial Transaction
    transaction_type: 'Expense',
    category: 'Food & Dining',
    amount: '',
    currency: 'USD',
    merchant_or_source: '',
    description: '',
    payment_method: 'Card',
    essentiality: 'Essential',
    is_recurring: 0,

    // Financial Snapshot
    monthly_income: '',
    monthly_expenses: '',
    essential_monthly_expenses: '',
    liquid_savings: '',
    investment_value: '',
    emergency_fund: '',
    budget_amount: '',
    outstanding_debt: '',
    monthly_debt_payment: '',
    financial_stress_rating: 2,

    // Health Activity
    activity_type: 'Running',
    duration_minutes: '',
    distance_km: '',
    steps: '',
    calories_burned: '',
    intensity: 'Moderate',

    // Health Daily Record
    sleep_hours: '7.5',
    sleep_quality: 4,
    daily_steps: '8000',
    active_minutes: '45',
    exercise_minutes: '30',
    exercise_intensity: 'Moderate',
    water_liters: '2.5',
    calories_consumed: '2100',
    protein_grams: '75',
    fruit_veg_servings: '4',
    energy_level: 4,
    self_rated_health: 4,

    // Social Activity
    social_interaction_type: 'In Person',
    social_relationship_type: 'Friend',
    social_duration_minutes: '45',
    social_interaction_quality: 5,
    social_connection_level: 4,
    social_mood_after: 5,
    social_notes: '',

    // Subjective Wellbeing Checkin
    mood: 4,
    energy: 4,
    stress: 2,
    social_connection: 4,
    loneliness: 1,
    social_satisfaction: 4,
    financial_stress: 2
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        entry_date: getTodayStr(),
        entry_datetime: getNowStr(),
        amount: '',
        description: '',
        social_notes: ''
      }));
      setError('');
      setSuccessInfo(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (key, val) => {
    setFormData(prev => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessInfo(null);

    const formattedLoggedAt = formData.entry_datetime.replace('T', ' ') + ':00';
    let affectedDate = formData.entry_date;

    try {
      if (entryMode === 'single') {
        let record_data = { source: 'Manual Entry' };

        if (doctype === 'Financial Transaction') {
          if (!formData.amount || Number(formData.amount) <= 0) {
            throw new Error('Please enter a valid amount greater than 0');
          }
          record_data = {
            ...record_data,
            transaction_date: formData.entry_date,
            transaction_type: formData.transaction_type,
            category: formData.category || 'General',
            amount: Number(formData.amount),
            currency: formData.currency || 'USD',
            merchant_or_source: formData.merchant_or_source || undefined,
            description: formData.description || undefined,
            payment_method: formData.payment_method,
            essentiality: formData.essentiality,
            is_recurring: Number(formData.is_recurring)
          };
        } else if (doctype === 'Financial Snapshot') {
          record_data = {
            ...record_data,
            snapshot_date: formData.entry_date,
            monthly_income: formData.monthly_income ? Number(formData.monthly_income) : undefined,
            monthly_expenses: formData.monthly_expenses ? Number(formData.monthly_expenses) : undefined,
            essential_monthly_expenses: formData.essential_monthly_expenses ? Number(formData.essential_monthly_expenses) : undefined,
            liquid_savings: formData.liquid_savings ? Number(formData.liquid_savings) : undefined,
            investment_value: formData.investment_value ? Number(formData.investment_value) : undefined,
            emergency_fund: formData.emergency_fund ? Number(formData.emergency_fund) : undefined,
            budget_amount: formData.budget_amount ? Number(formData.budget_amount) : undefined,
            outstanding_debt: formData.outstanding_debt ? Number(formData.outstanding_debt) : undefined,
            monthly_debt_payment: formData.monthly_debt_payment ? Number(formData.monthly_debt_payment) : undefined,
            financial_stress_rating: Number(formData.financial_stress_rating)
          };
        } else if (doctype === 'Health Activity') {
          record_data = {
            ...record_data,
            activity_type: formData.activity_type,
            logged_at: formattedLoggedAt,
            duration_minutes: formData.duration_minutes ? Number(formData.duration_minutes) : 30,
            distance_km: formData.distance_km ? Number(formData.distance_km) : undefined,
            steps: formData.steps ? Number(formData.steps) : undefined,
            calories_burned: formData.calories_burned ? Number(formData.calories_burned) : undefined,
            intensity: formData.intensity
          };
          affectedDate = formData.entry_datetime.split('T')[0];
        } else if (doctype === 'Health Daily Record') {
          record_data = {
            ...record_data,
            record_date: formData.entry_date,
            sleep_hours: formData.sleep_hours ? Number(formData.sleep_hours) : undefined,
            sleep_quality: Number(formData.sleep_quality),
            steps: formData.daily_steps ? Number(formData.daily_steps) : undefined,
            active_minutes: formData.active_minutes ? Number(formData.active_minutes) : undefined,
            exercise_minutes: formData.exercise_minutes ? Number(formData.exercise_minutes) : undefined,
            exercise_intensity: formData.exercise_intensity,
            water_liters: formData.water_liters ? Number(formData.water_liters) : undefined,
            calories_consumed: formData.calories_consumed ? Number(formData.calories_consumed) : undefined,
            protein_grams: formData.protein_grams ? Number(formData.protein_grams) : undefined,
            fruit_veg_servings: formData.fruit_veg_servings ? Number(formData.fruit_veg_servings) : undefined,
            energy_level: Number(formData.energy_level),
            self_rated_health: Number(formData.self_rated_health)
          };
        } else if (doctype === 'Social Activity') {
          record_data = {
            ...record_data,
            logged_at: formattedLoggedAt,
            interaction_type: formData.social_interaction_type,
            relationship_type: formData.social_relationship_type,
            duration_minutes: formData.social_duration_minutes ? Number(formData.social_duration_minutes) : undefined,
            interaction_quality: Number(formData.social_interaction_quality),
            connection_level: Number(formData.social_connection_level),
            mood_after: Number(formData.social_mood_after),
            notes: formData.social_notes || undefined
          };
          affectedDate = formData.entry_datetime.split('T')[0];
        } else if (doctype === 'Subjective Wellbeing Checkin') {
          record_data = {
            ...record_data,
            date: formData.entry_date,
            mood: Number(formData.mood),
            energy: Number(formData.energy),
            stress: Number(formData.stress),
            social_connection: Number(formData.social_connection),
            loneliness: Number(formData.loneliness),
            social_satisfaction: Number(formData.social_satisfaction),
            financial_stress: Number(formData.financial_stress)
          };
        }

        const res = await feedService.insertRecord({
          doctype,
          record_data
        });

        const score = res.recalculated_score || res.data?.recalculated_scores?.[affectedDate];
        setSuccessInfo({
          message: `${doctype} recorded successfully!`,
          score
        });

        setTimeout(() => {
          onSuccess(affectedDate);
          onClose();
        }, 1200);

      } else {
        // Multi-DocType Composite Daily Log (Format A)
        const compositePayload = {
          "Health Daily Record": {
            record_date: formData.entry_date,
            steps: formData.daily_steps ? Number(formData.daily_steps) : 8000,
            sleep_hours: formData.sleep_hours ? Number(formData.sleep_hours) : 7.5,
            sleep_quality: Number(formData.sleep_quality),
            water_liters: formData.water_liters ? Number(formData.water_liters) : 2.5,
            exercise_minutes: formData.exercise_minutes ? Number(formData.exercise_minutes) : 30,
            energy_level: Number(formData.energy_level)
          },
          "Subjective Wellbeing Checkin": {
            date: formData.entry_date,
            mood: Number(formData.mood),
            energy: Number(formData.energy),
            stress: Number(formData.stress),
            social_connection: Number(formData.social_connection),
            loneliness: Number(formData.loneliness),
            social_satisfaction: Number(formData.social_satisfaction),
            financial_stress: Number(formData.financial_stress)
          }
        };

        if (formData.amount && Number(formData.amount) > 0) {
          compositePayload["Financial Transaction"] = [{
            transaction_date: formData.entry_date,
            amount: Number(formData.amount),
            category: formData.category || 'General',
            transaction_type: formData.transaction_type,
            payment_method: formData.payment_method,
            essentiality: formData.essentiality,
            description: formData.description || undefined
          }];
        }

        if (formData.social_notes || formData.social_interaction_type) {
          compositePayload["Social Activity"] = {
            logged_at: formattedLoggedAt,
            interaction_type: formData.social_interaction_type,
            relationship_type: formData.social_relationship_type,
            duration_minutes: Number(formData.social_duration_minutes || 30),
            interaction_quality: Number(formData.social_interaction_quality),
            connection_level: Number(formData.social_connection_level),
            notes: formData.social_notes || undefined
          };
        }

        const res = await feedService.insertRecord(compositePayload);
        const recalc = res.data?.recalculated_scores?.[formData.entry_date];
        setSuccessInfo({
          message: 'Full daily log synchronized across Health, Finance & Social!',
          score: recalc
        });

        setTimeout(() => {
          onSuccess(formData.entry_date);
          onClose();
        }, 1200);
      }
    } catch (err) {
      setError(err.message || 'Failed to save record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-xl bg-[#121820] border border-[#2a3644] rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-[#2a3644] pb-3">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-[#f43f5e]" />
            <h3 className="font-bold text-white text-base">New Operational Record</h3>
          </div>
          <button onClick={onClose} className="p-1 text-[#8a99ad] hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector: Single vs Composite Daily Log */}
        <div className="flex bg-[#1a232e] p-1 rounded-xl border border-[#2a3644] font-mono text-xs">
          <button
            type="button"
            onClick={() => setEntryMode('single')}
            className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              entryMode === 'single' ? 'bg-[#f43f5e] text-white shadow-md' : 'text-[#8a99ad] hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>SINGLE RECORD</span>
          </button>
          <button
            type="button"
            onClick={() => setEntryMode('multidoctype')}
            className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              entryMode === 'multidoctype' ? 'bg-gradient-to-r from-[#06b6d4] to-[#a855f7] text-black shadow-md' : 'text-[#8a99ad] hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>ALL-IN-ONE DAILY LOG</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-950/80 border border-red-500/50 text-red-200 p-3 rounded-xl font-mono text-xs">
            ERR: {error}
          </div>
        )}

        {successInfo && (
          <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 p-3 rounded-xl font-mono text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold">{successInfo.message}</div>
              {successInfo.score && (
                <div className="text-[10px] text-emerald-300 mt-0.5">
                  Recalculated Score: Overall {Math.round(successInfo.score.overall_score || 0)}%
                  (Health {Math.round(successInfo.score.health_score || 0)}% | Finance {Math.round(successInfo.score.financial_score || 0)}% | Social {Math.round(successInfo.score.social_score || 0)}%)
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          {entryMode === 'single' ? (
            <>
              {/* DocType & Date Select */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[#8a99ad] block mb-1">RECORD TYPE</label>
                  <select
                    value={doctype}
                    onChange={(e) => setDoctype(e.target.value)}
                    className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl focus:outline-none focus:border-[#f43f5e]"
                  >
                    <option value="Financial Transaction">Financial Transaction</option>
                    <option value="Financial Snapshot">Financial Snapshot</option>
                    <option value="Health Activity">Health Activity</option>
                    <option value="Health Daily Record">Health Daily Record</option>
                    <option value="Social Activity">Social Activity</option>
                    <option value="Subjective Wellbeing Checkin">Subjective Wellbeing Checkin</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-[#8a99ad] block mb-1">
                    {doctype === 'Health Activity' || doctype === 'Social Activity' ? 'DATE & TIME' : 'RECORD DATE'}
                  </label>
                  {doctype === 'Health Activity' || doctype === 'Social Activity' ? (
                    <input
                      type="datetime-local"
                      required
                      value={formData.entry_datetime}
                      onChange={(e) => handleChange('entry_datetime', e.target.value)}
                      className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2 rounded-xl focus:outline-none"
                    />
                  ) : (
                    <input
                      type="date"
                      required
                      value={formData.entry_date}
                      onChange={(e) => handleChange('entry_date', e.target.value)}
                      className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2 rounded-xl focus:outline-none"
                    />
                  )}
                </div>
              </div>

              {/* FINANCIAL TRANSACTION ATTRIBUTES */}
              {doctype === 'Financial Transaction' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">TYPE *</label>
                      <select
                        value={formData.transaction_type}
                        onChange={(e) => handleChange('transaction_type', e.target.value)}
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      >
                        <option value="Expense">Expense</option>
                        <option value="Income">Income</option>
                        <option value="Transfer">Transfer</option>
                        <option value="Investment">Investment</option>
                        <option value="Debt Payment">Debt Payment</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">AMOUNT *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.amount}
                        onChange={(e) => handleChange('amount', e.target.value)}
                        placeholder="25.00"
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">CATEGORY *</label>
                      <input
                        type="text"
                        required
                        value={formData.category}
                        onChange={(e) => handleChange('category', e.target.value)}
                        placeholder="Groceries, Dining, Rent..."
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">MERCHANT / SOURCE</label>
                      <input
                        type="text"
                        value={formData.merchant_or_source}
                        onChange={(e) => handleChange('merchant_or_source', e.target.value)}
                        placeholder="Supermarket, Employer..."
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">PAYMENT METHOD</label>
                      <select
                        value={formData.payment_method}
                        onChange={(e) => handleChange('payment_method', e.target.value)}
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      >
                        <option value="Card">Card</option>
                        <option value="Cash">Cash</option>
                        <option value="Bank">Bank</option>
                        <option value="Digital Wallet">Digital Wallet</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">ESSENTIALITY</label>
                      <select
                        value={formData.essentiality}
                        onChange={(e) => handleChange('essentiality', e.target.value)}
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      >
                        <option value="Essential">Essential</option>
                        <option value="Discretionary">Discretionary</option>
                        <option value="Not Applicable">Not Applicable</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#8a99ad] block mb-1">DESCRIPTION</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      placeholder="Optional memo or details..."
                      className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* FINANCIAL SNAPSHOT ATTRIBUTES */}
              {doctype === 'Financial Snapshot' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">MONTHLY INCOME</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.monthly_income}
                        onChange={(e) => handleChange('monthly_income', e.target.value)}
                        placeholder="5000"
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">MONTHLY EXPENSES</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.monthly_expenses}
                        onChange={(e) => handleChange('monthly_expenses', e.target.value)}
                        placeholder="3200"
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">LIQUID SAVINGS</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.liquid_savings}
                        onChange={(e) => handleChange('liquid_savings', e.target.value)}
                        placeholder="12000"
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">EMERGENCY FUND</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.emergency_fund}
                        onChange={(e) => handleChange('emergency_fund', e.target.value)}
                        placeholder="18000"
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">TOTAL DEBT</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.outstanding_debt}
                        onChange={(e) => handleChange('outstanding_debt', e.target.value)}
                        placeholder="0"
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">FINANCIAL STRESS (1=LOW, 5=HIGH)</label>
                      <select
                        value={formData.financial_stress_rating}
                        onChange={(e) => handleChange('financial_stress_rating', e.target.value)}
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      >
                        <option value={1}>1 - Calm / No stress</option>
                        <option value={2}>2 - Low stress</option>
                        <option value={3}>3 - Moderate stress</option>
                        <option value={4}>4 - High anxiety</option>
                        <option value={5}>5 - Severe financial stress</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* HEALTH ACTIVITY ATTRIBUTES */}
              {doctype === 'Health Activity' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">ACTIVITY TYPE *</label>
                      <select
                        value={formData.activity_type}
                        onChange={(e) => handleChange('activity_type', e.target.value)}
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      >
                        <option value="Running">Running</option>
                        <option value="Walking">Walking</option>
                        <option value="Cycling">Cycling</option>
                        <option value="Gym">Gym</option>
                        <option value="Sports">Sports</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">DURATION (MINS) *</label>
                      <input
                        type="number"
                        required
                        value={formData.duration_minutes}
                        onChange={(e) => handleChange('duration_minutes', e.target.value)}
                        placeholder="45"
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">STEPS</label>
                      <input
                        type="number"
                        value={formData.steps}
                        onChange={(e) => handleChange('steps', e.target.value)}
                        placeholder="5000"
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">CALORIES</label>
                      <input
                        type="number"
                        value={formData.calories_burned}
                        onChange={(e) => handleChange('calories_burned', e.target.value)}
                        placeholder="350"
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">INTENSITY</label>
                      <select
                        value={formData.intensity}
                        onChange={(e) => handleChange('intensity', e.target.value)}
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      >
                        <option value="Low">Low</option>
                        <option value="Moderate">Moderate</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* HEALTH DAILY RECORD ATTRIBUTES */}
              {doctype === 'Health Daily Record' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">SLEEP (HOURS)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.sleep_hours}
                        onChange={(e) => handleChange('sleep_hours', e.target.value)}
                        placeholder="7.5"
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">STEPS</label>
                      <input
                        type="number"
                        value={formData.daily_steps}
                        onChange={(e) => handleChange('daily_steps', e.target.value)}
                        placeholder="10000"
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">WATER (LITERS)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.water_liters}
                        onChange={(e) => handleChange('water_liters', e.target.value)}
                        placeholder="2.5"
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">EXERCISE MINS</label>
                      <input
                        type="number"
                        value={formData.exercise_minutes}
                        onChange={(e) => handleChange('exercise_minutes', e.target.value)}
                        placeholder="30"
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">ENERGY (1-5)</label>
                      <select
                        value={formData.energy_level}
                        onChange={(e) => handleChange('energy_level', e.target.value)}
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      >
                        <option value={1}>1 - Exhausted</option>
                        <option value={2}>2 - Low</option>
                        <option value={3}>3 - Moderate</option>
                        <option value={4}>4 - High</option>
                        <option value={5}>5 - Supercharged</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">SLEEP QUALITY (1-5)</label>
                      <select
                        value={formData.sleep_quality}
                        onChange={(e) => handleChange('sleep_quality', e.target.value)}
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      >
                        <option value={1}>1 - Terrible</option>
                        <option value={2}>2 - Restless</option>
                        <option value={3}>3 - Fair</option>
                        <option value={4}>4 - Good</option>
                        <option value={5}>5 - Deep Rest</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* SOCIAL ACTIVITY ATTRIBUTES */}
              {doctype === 'Social Activity' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">INTERACTION TYPE</label>
                      <select
                        value={formData.social_interaction_type}
                        onChange={(e) => handleChange('social_interaction_type', e.target.value)}
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      >
                        <option value="In Person">In Person</option>
                        <option value="Call">Call</option>
                        <option value="Video Call">Video Call</option>
                        <option value="Messaging">Messaging</option>
                        <option value="Group Activity">Group Activity</option>
                        <option value="Community Activity">Community Activity</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">RELATIONSHIP</label>
                      <select
                        value={formData.social_relationship_type}
                        onChange={(e) => handleChange('social_relationship_type', e.target.value)}
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      >
                        <option value="Friend">Friend</option>
                        <option value="Family">Family</option>
                        <option value="Partner">Partner</option>
                        <option value="Colleague">Colleague</option>
                        <option value="Community">Community</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">DURATION (MINS)</label>
                      <input
                        type="number"
                        value={formData.social_duration_minutes}
                        onChange={(e) => handleChange('social_duration_minutes', e.target.value)}
                        placeholder="45"
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">QUALITY (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={formData.social_interaction_quality}
                        onChange={(e) => handleChange('social_interaction_quality', e.target.value)}
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">CONNECTION (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={formData.social_connection_level}
                        onChange={(e) => handleChange('social_connection_level', e.target.value)}
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#8a99ad] block mb-1">NOTES</label>
                    <textarea
                      value={formData.social_notes}
                      onChange={(e) => handleChange('social_notes', e.target.value)}
                      placeholder="Had dinner with college friends..."
                      className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl h-16 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* SUBJECTIVE WELLBEING CHECKIN ATTRIBUTES */}
              {doctype === 'Subjective Wellbeing Checkin' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">MOOD (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={formData.mood}
                        onChange={(e) => handleChange('mood', e.target.value)}
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">ENERGY (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={formData.energy}
                        onChange={(e) => handleChange('energy', e.target.value)}
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">STRESS (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={formData.stress}
                        onChange={(e) => handleChange('stress', e.target.value)}
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">SOCIAL SATISFACTION (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={formData.social_satisfaction}
                        onChange={(e) => handleChange('social_satisfaction', e.target.value)}
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8a99ad] block mb-1">FINANCIAL STRESS (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={formData.financial_stress}
                        onChange={(e) => handleChange('financial_stress', e.target.value)}
                        className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ALL-IN-ONE COMPOSITE DAILY LOG (Format A) */
            <div className="space-y-4">
              <div className="p-3 bg-[#1a232e]/60 border border-[#06b6d4]/30 rounded-xl space-y-1">
                <span className="font-bold text-[#06b6d4] text-[11px] block">MULTI-DOCTYPE COMPOSITE INGESTION</span>
                <p className="text-[10px] text-[#8a99ad]">
                  Submit Health metrics, financial spend, social touchpoint, and wellbeing mood in a single atomic transaction.
                </p>
              </div>

              <div>
                <label className="text-[10px] text-[#8a99ad] block mb-1">TARGET DATE</label>
                <input
                  type="date"
                  required
                  value={formData.entry_date}
                  onChange={(e) => handleChange('entry_date', e.target.value)}
                  className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2 rounded-xl focus:outline-none"
                />
              </div>

              {/* Health Section */}
              <div className="p-3 bg-[#1a232e] rounded-xl border border-emerald-500/20 space-y-2">
                <span className="text-[10px] font-bold text-emerald-400 block">1. HEALTH & SLEEP</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] text-[#8a99ad] block">STEPS</label>
                    <input
                      type="number"
                      value={formData.daily_steps}
                      onChange={(e) => handleChange('daily_steps', e.target.value)}
                      placeholder="10000"
                      className="w-full bg-[#121820] border border-[#2a3644] text-white p-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-[#8a99ad] block">SLEEP (HRS)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.sleep_hours}
                      onChange={(e) => handleChange('sleep_hours', e.target.value)}
                      placeholder="7.5"
                      className="w-full bg-[#121820] border border-[#2a3644] text-white p-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-[#8a99ad] block">WATER (L)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.water_liters}
                      onChange={(e) => handleChange('water_liters', e.target.value)}
                      placeholder="2.5"
                      className="w-full bg-[#121820] border border-[#2a3644] text-white p-2 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Section */}
              <div className="p-3 bg-[#1a232e] rounded-xl border border-cyan-500/20 space-y-2">
                <span className="text-[10px] font-bold text-cyan-400 block">2. KEY EXPENSE (OPTIONAL)</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] text-[#8a99ad] block">AMOUNT</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => handleChange('amount', e.target.value)}
                      placeholder="15.00"
                      className="w-full bg-[#121820] border border-[#2a3644] text-white p-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-[#8a99ad] block">CATEGORY</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => handleChange('category', e.target.value)}
                      placeholder="Lunch, Grocery"
                      className="w-full bg-[#121820] border border-[#2a3644] text-white p-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-[#8a99ad] block">METHOD</label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => handleChange('payment_method', e.target.value)}
                      className="w-full bg-[#121820] border border-[#2a3644] text-white p-2 rounded-lg"
                    >
                      <option value="Card">Card</option>
                      <option value="Cash">Cash</option>
                      <option value="Digital Wallet">Wallet</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Social & Wellbeing Section */}
              <div className="p-3 bg-[#1a232e] rounded-xl border border-purple-500/20 space-y-2">
                <span className="text-[10px] font-bold text-purple-400 block">3. SOCIAL & SUBJECTIVE RATINGS</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] text-[#8a99ad] block">MOOD (1-5)</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={formData.mood}
                      onChange={(e) => handleChange('mood', e.target.value)}
                      className="w-full bg-[#121820] border border-[#2a3644] text-white p-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-[#8a99ad] block">ENERGY (1-5)</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={formData.energy}
                      onChange={(e) => handleChange('energy', e.target.value)}
                      className="w-full bg-[#121820] border border-[#2a3644] text-white p-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-[#8a99ad] block">STRESS (1-5)</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={formData.stress}
                      onChange={(e) => handleChange('stress', e.target.value)}
                      className="w-full bg-[#121820] border border-[#2a3644] text-white p-2 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] text-[#8a99ad] block">SOCIAL NOTE</label>
                  <input
                    type="text"
                    value={formData.social_notes}
                    onChange={(e) => handleChange('social_notes', e.target.value)}
                    placeholder="Lunch with team, evening call with mom..."
                    className="w-full bg-[#121820] border border-[#2a3644] text-white p-2 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#f43f5e] to-[#a855f7] text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'PROCESSING RECORD & RECALCULATING SCORES...' : entryMode === 'multidoctype' ? 'SUBMIT MULTI-DOMAIN LOG' : 'SAVE RECORD'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ManualRecordModal;
