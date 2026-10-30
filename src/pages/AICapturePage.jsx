import { useState } from 'react';
import { feedService } from '../services/feedService';
import { aiService } from '../services/aiService';
import { Sparkles, Send, CheckCircle2, AlertCircle, RefreshCw, Zap, Code, MessageSquare } from 'lucide-react';

const QUICK_PROMPTS = [
  {
    title: 'Daily Health & Sleep',
    text: 'Slept 7.8 hours, felt well rested. Walked 10,200 steps and drank 2.5L water today.'
  },
  {
    title: 'Lunch & Coffee Spend',
    text: 'Spent $14.50 on a healthy chicken salad for lunch, and $4.25 on an oat latte with card.'
  },
  {
    title: 'Evening Social Dinner',
    text: 'Had dinner with my friend Sarah for 90 minutes. Meaningful conversation, mood 5/5, felt deeply connected.'
  },
  {
    title: 'Workout & Fitness Session',
    text: 'Completed a 45-minute gym strength workout, 400 calories burned, high intensity.'
  }
];

export function AICapturePage({ onRecordCreated }) {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [activeMode, setActiveMode] = useState('text'); // 'text' | 'json'
  const [jsonInput, setJsonInput] = useState(JSON.stringify({
    "health": {
      "record_date": new Date().toISOString().split('T')[0],
      "steps": 10000,
      "sleep_hours": 8.0,
      "water_liters": 2.5
    },
    "financial": [
      {
        "amount": 16.50,
        "category": "Lunch",
        "transaction_type": "Expense"
      }
    ],
    "social": {
      "interaction_type": "In Person",
      "relationship_type": "Friend",
      "interaction_quality": 5,
      "notes": "Great coffee chat"
    },
    "wellbeing": {
      "mood": 4,
      "energy": 4,
      "stress": 2
    }
  }, null, 2));

  const handleProcessText = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      // 1. Ingest via aiService (FastAPI pipeline with Frappe dispatch, or direct Frappe store_ai_record)
      const res = await aiService.ingestText(inputText);
      setResult(res);
      setInputText('');
      if (onRecordCreated) onRecordCreated();
    } catch (err) {
      setError(err.message || 'Failed to process AI extraction');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessJson = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const parsed = JSON.parse(jsonInput);
      const res = await feedService.storeAiRecord(parsed);
      setResult(res);
      if (onRecordCreated) onRecordCreated();
    } catch (err) {
      setError('Invalid JSON or request failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 font-sans max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#121820] to-[#1a232e] border border-[#2a3644] rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-gradient-to-tr from-[#f43f5e] to-[#a855f7] rounded-xl text-white shadow-lg shadow-rose-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">AI Multi-Domain Intelligence Ingestion</h2>
            <span className="font-mono text-xs text-[#06b6d4]">
              ENDPOINT: /api/method/well_pro.well_pro_app.api.store_ai_record
            </span>
          </div>
        </div>
        <p className="text-xs text-[#8a99ad] leading-relaxed">
          Type or speak naturally in your own words. The AI engine automatically identifies Health, Financial, Social, and Wellbeing metrics, maps them into isolated user DocTypes, and computes live recency-weighted scores.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex bg-[#121820] p-1 rounded-xl border border-[#2a3644] font-mono text-xs max-w-xs">
        <button
          onClick={() => setActiveMode('text')}
          className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeMode === 'text' ? 'bg-[#f43f5e] text-white shadow-md' : 'text-[#8a99ad] hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>CONVERSATIONAL</span>
        </button>
        <button
          onClick={() => setActiveMode('json')}
          className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeMode === 'json' ? 'bg-[#06b6d4] text-black shadow-md' : 'text-[#8a99ad] hover:text-white'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>PAYLOAD JSON</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-950/80 border border-red-500/50 text-red-200 p-3 rounded-xl font-mono text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Mode A: Natural Language Text Area */}
      {activeMode === 'text' ? (
        <div className="bg-[#121820] border border-[#2a3644] rounded-2xl p-4 shadow-xl space-y-4">
          <div className="relative">
            <textarea
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g. I slept 8 hours, walked 9,500 steps today, spent $12 on lunch with colleague Alex, and feel calm and energized..."
              className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-3.5 rounded-xl font-sans text-sm focus:outline-none focus:border-[#f43f5e] resize-none leading-relaxed"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex flex-wrap gap-1.5">
              <span className="font-mono text-[10px] text-[#8a99ad] mr-1 self-center">EXAMPLES:</span>
              {QUICK_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputText(p.text)}
                  className="bg-[#1a232e] hover:bg-[#2a3644] border border-[#2a3644] text-[#06b6d4] px-2.5 py-1 rounded-lg font-mono text-[10px] transition-colors cursor-pointer"
                >
                  {p.title}
                </button>
              ))}
            </div>

            <button
              onClick={handleProcessText}
              disabled={loading || !inputText.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#f43f5e] to-[#a855f7] hover:opacity-90 text-white font-mono text-xs font-bold rounded-xl shadow-lg shadow-rose-500/20 active:scale-95 transition-all disabled:opacity-40 cursor-pointer self-end sm:self-auto"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>EXTRACTING & DISPATCHING...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>PROCESS LOG</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Mode B: Direct Multi-Domain JSON */
        <div className="bg-[#121820] border border-[#2a3644] rounded-2xl p-4 shadow-xl space-y-4">
          <div className="space-y-1">
            <span className="font-mono text-xs text-[#06b6d4] block">DIRECT DOMAIN COMPOSITE PAYLOAD</span>
            <p className="font-mono text-[11px] text-[#8a99ad]">
              Maps directly to `store_ai_record` domain keys: `health`, `financial`, `social`, `wellbeing`, `activity`.
            </p>
          </div>

          <textarea
            rows={10}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="w-full bg-[#1a232e] border border-[#2a3644] text-[#38bdf8] p-3 rounded-xl font-mono text-xs focus:outline-none focus:border-[#06b6d4] resize-none"
          />

          <button
            onClick={handleProcessJson}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#06b6d4] to-[#a855f7] text-black font-mono text-xs font-bold rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>DISPATCHING TO STORE_AI_RECORD...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>EXECUTE MULTI-DOMAIN INGESTION</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Success Output Breakdown Card */}
      {result && (
        <div className="bg-[#121820] border border-emerald-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-[#2a3644] pb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-white text-sm font-sans">
                {result.message || result.status || 'AI Records Successfully Ingested'}
              </h3>
              <span className="font-mono text-[10px] text-emerald-400">
                PROCESSED {result.data?.count || result.extracted_count || 1} DOMAIN EXTRACTIONS
              </span>
            </div>
          </div>

          {/* Recalculated Score Indicators */}
          {(result.data?.recalculated_scores || result.recalculated_score) && (
            <div className="space-y-2">
              <span className="font-mono text-[10px] text-[#8a99ad] block">
                IMMEDIATE RECALCULATED SCORES:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                {(() => {
                  const scores = result.recalculated_score || Object.values(result.data?.recalculated_scores || {})[0] || {};
                  return (
                    <>
                      <div className="bg-[#1a232e] p-2 rounded-xl border border-rose-500/30">
                        <span className="text-[9px] text-[#8a99ad] block">OVERALL</span>
                        <span className="text-base font-bold text-[#f43f5e]">{Math.round(scores.overall_score || 0)}%</span>
                      </div>
                      <div className="bg-[#1a232e] p-2 rounded-xl border border-emerald-500/30">
                        <span className="text-[9px] text-[#8a99ad] block">HEALTH</span>
                        <span className="text-base font-bold text-emerald-400">{Math.round(scores.health_score || 0)}%</span>
                      </div>
                      <div className="bg-[#1a232e] p-2 rounded-xl border border-cyan-500/30">
                        <span className="text-[9px] text-[#8a99ad] block">FINANCE</span>
                        <span className="text-base font-bold text-cyan-400">{Math.round(scores.financial_score || 0)}%</span>
                      </div>
                      <div className="bg-[#1a232e] p-2 rounded-xl border border-purple-500/30">
                        <span className="text-[9px] text-[#8a99ad] block">SOCIAL</span>
                        <span className="text-base font-bold text-purple-400">{Math.round(scores.social_score || 0)}%</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Created DocTypes Summary */}
          {result.data?.created && Array.isArray(result.data.created) && (
            <div className="space-y-1 font-mono text-xs">
              <span className="text-[10px] text-[#8a99ad] block">CREATED FRAFFE DOCUMENTS:</span>
              <div className="space-y-1">
                {result.data.created.map((c, i) => (
                  <div key={i} className="flex justify-between items-center bg-[#1a232e] p-2 rounded-lg border border-[#2a3644]">
                    <span className="text-white font-bold">{c.doctype}</span>
                    <span className="text-[10px] text-[#06b6d4]">{c.name} ({c.affected_date})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AICapturePage;
