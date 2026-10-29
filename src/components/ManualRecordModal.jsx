import React, { useState, useEffect } from 'react';
import { frappeClient } from '../services/apiClient';
import { dashboardService } from '../services/dashboardService';
import { X, PlusCircle } from 'lucide-react';

export function ManualRecordModal({ isOpen, onClose, onSuccess }) {
  const [doctype, setDoctype] = useState('Financial Transaction');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Always generate fresh ISO strings for Today / Right Now
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getNowStr = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    entry_date: getTodayStr(),
    entry_datetime: getNowStr(),

    // Financial Transaction
    transaction_type: 'Expense',
    category: 'Groceries & Food',
    amount: '',
    merchant_or_source: '',
    description: '',
    payment_method: 'Card',
    essentiality: 'Essential',
    is_recurring: 0,

    // Health Activity
    activity_type: 'Running',
    duration_minutes: '',
    distance_km: '',
    steps: '',
    calories_burned: '',
    intensity: 'Moderate',

    // Health Daily Record
    sleep_hours: '',
    sleep_quality: 4,
    daily_steps: '',
    active_minutes: '',
    water_liters: '',
    calories_consumed: '',
    protein_grams: '',
    fruit_veg_servings: '',
    energy_level: 4,
    self_rated_health: 4,

    // Social Activity
    relationship_type: 'Friend',
    interaction_type: 'In Person',
    people_count: 1,
    interaction_quality: 5,
    connection_level: 5,
    mood_after: 5,
    notes: '',

    // Subjective Wellbeing Checkin
    mood: 4,
    energy: 4,
    stress: 2,
    social_connection: 5,
    loneliness: 1,
    social_satisfaction: 5,
    financial_stress: 2
  });

  // ALWAYS Reset entry_date and entry_datetime to TODAY whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        entry_date: getTodayStr(),
        entry_datetime: getNowStr(),
        amount: '',
        description: '',
        duration_minutes: '',
        calories_burned: '',
        notes: ''
      }));
      setError('');
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

    let record_data = { source: 'Manual Entry' };
    const formattedLoggedAt = formData.entry_datetime.replace('T', ' ') + ':00';
    const effectiveDate = formData.entry_date;

    if (doctype === 'Financial Transaction') {
      record_data = {
        ...record_data,
        transaction_date: formData.entry_date,
        transaction_type: formData.transaction_type,
        category: formData.category,
        amount: Number(formData.amount),
        merchant_or_source: formData.merchant_or_source || undefined,
        description: formData.description || undefined,
        payment_method: formData.payment_method,
        essentiality: formData.essentiality,
        is_recurring: Number(formData.is_recurring)
      };
    } else if (doctype === 'Health Activity') {
      record_data = {
        ...record_data,
        activity_type: formData.activity_type,
        logged_at: formattedLoggedAt,
        duration_minutes: Number(formData.duration_minutes),
        distance_km: formData.distance_km ? Number(formData.distance_km) : undefined,
        steps: formData.steps ? Number(formData.steps) : undefined,
        calories_burned: formData.calories_burned ? Number(formData.calories_burned) : undefined,
        intensity: formData.intensity
      };
    } else if (doctype === 'Health Daily Record') {
      record_data = {
        ...record_data,
        record_date: formData.entry_date,
        sleep_hours: formData.sleep_hours ? Number(formData.sleep_hours) : undefined,
        sleep_quality: Number(formData.sleep_quality),
        steps: formData.daily_steps ? Number(formData.daily_steps) : undefined,
        active_minutes: formData.active_minutes ? Number(formData.active_minutes) : undefined,
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
        interaction_type: formData.interaction_type,
        relationship_type: formData.relationship_type,
        people_count: Number(formData.people_count),
        interaction_quality: Number(formData.interaction_quality),
        connection_level: Number(formData.connection_level),
        mood_after: Number(formData.mood_after),
        notes: formData.notes || undefined
      };
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

    try {
      const response = await frappeClient.post('/well_pro.well_pro_app.api.insert_record', {
        doctype,
        record_data
      });

      const resData = response.data.message || response.data;
      if (resData.success) {
        // EXPLICIT RECALCULATION: Forces score engine to recalculate for the inserted date
        await dashboardService.recalculateScore(effectiveDate);
        onSuccess(effectiveDate);
        onClose();
      } else {
        throw new Error(resData.message || 'Insert failed');
      }
    } catch (err) {
      setError(err.response?.data?.message?.message || err.message || 'Failed to create record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-xl bg-[#121820] border border-[#2a3644] rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-[#2a3644] pb-3">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-[#f43f5e]" />
            <h3 className="font-bold text-white text-base">Manual Record Entry</h3>
          </div>
          <button onClick={onClose} className="p-1 text-[#8a99ad] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-950/80 border border-red-500/50 text-red-200 p-3 rounded-xl font-mono text-xs">
            ERR: {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
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
                  <label className="text-[10px] text-[#8a99ad] block mb-1">AMOUNT (PKR) *</label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => handleChange('amount', e.target.value)}
                    placeholder="1500"
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
                    placeholder="Groceries & Food"
                    className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8a99ad] block mb-1">MERCHANT / SOURCE</label>
                  <input
                    type="text"
                    value={formData.merchant_or_source}
                    onChange={(e) => handleChange('merchant_or_source', e.target.value)}
                    placeholder="Trader Joe's"
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
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#8a99ad] block mb-1">DESCRIPTION</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Weekly groceries..."
                  className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                />
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
                    <option value="Gym">Gym</option>
                    <option value="Walking">Walking</option>
                    <option value="Cycling">Cycling</option>
                    <option value="Sports">Sports</option>
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
                    placeholder="4500"
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
                  <label className="text-[10px] text-[#8a99ad] block mb-1">CALORIES</label>
                  <input
                    type="number"
                    value={formData.calories_consumed}
                    onChange={(e) => handleChange('calories_consumed', e.target.value)}
                    placeholder="2100"
                    className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8a99ad] block mb-1">PROTEIN (G)</label>
                  <input
                    type="number"
                    value={formData.protein_grams}
                    onChange={(e) => handleChange('protein_grams', e.target.value)}
                    placeholder="120"
                    className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8a99ad] block mb-1">FRUIT/VEG SERV</label>
                  <input
                    type="number"
                    value={formData.fruit_veg_servings}
                    onChange={(e) => handleChange('fruit_veg_servings', e.target.value)}
                    placeholder="5"
                    className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                  />
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
                    value={formData.interaction_type}
                    onChange={(e) => handleChange('interaction_type', e.target.value)}
                    className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                  >
                    <option value="In Person">In Person</option>
                    <option value="Call">Call</option>
                    <option value="Video Call">Video Call</option>
                    <option value="Messaging">Messaging</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#8a99ad] block mb-1">RELATIONSHIP</label>
                  <select
                    value={formData.relationship_type}
                    onChange={(e) => handleChange('relationship_type', e.target.value)}
                    className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                  >
                    <option value="Friend">Friend</option>
                    <option value="Family">Family</option>
                    <option value="Colleague">Colleague</option>
                    <option value="Partner">Partner</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-[#8a99ad] block mb-1">QUALITY (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.interaction_quality}
                    onChange={(e) => handleChange('interaction_quality', e.target.value)}
                    className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8a99ad] block mb-1">CONNECTION (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.connection_level}
                    onChange={(e) => handleChange('connection_level', e.target.value)}
                    className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8a99ad] block mb-1">MOOD AFTER (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.mood_after}
                    onChange={(e) => handleChange('mood_after', e.target.value)}
                    className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#8a99ad] block mb-1">NOTES</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Had lunch with university friend..."
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
                  <label className="text-[10px] text-[#8a99ad] block mb-1">SOCIAL SATISFACTION</label>
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
                  <label className="text-[10px] text-[#8a99ad] block mb-1">FINANCIAL STRESS</label>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#f43f5e] to-[#a855f7] text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-all"
          >
            {loading ? 'SAVING RECORD & RECALCULATING SCORES...' : 'SAVE RECORD'}
          </button>
        </form>
      </div>
    </div>
  );
}