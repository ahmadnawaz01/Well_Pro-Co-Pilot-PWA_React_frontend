import { useState } from 'react';
import { Activity, Wallet, HeartHandshake, Zap, TrendingUp, TrendingDown, Minus, RefreshCw, ShieldCheck } from 'lucide-react';

export function DashboardScorecard({ metrics, onRecalculate, recalculating }) {
  const [timeframe, setTimeframe] = useState('today'); // 'today' | '7d' | '30d' | '90d'

  if (!metrics) return null;

  const summary = metrics.summary || metrics;
  const health = summary.health;
  const financial = summary.financial;
  const social = summary.social;
  const overall = summary.overall;

  const renderTrendIcon = (trend) => {
    if (trend === 'improving') return <TrendingUp className="w-3.5 h-3.5 text-emerald-400 inline ml-1" />;
    if (trend === 'declining') return <TrendingDown className="w-3.5 h-3.5 text-rose-400 inline ml-1" />;
    return <Minus className="w-3.5 h-3.5 text-[#8a99ad] inline ml-1" />;
  };

  const getScoreByTimeframe = (domainObj) => {
    if (!domainObj) return 0;
    let score;
    switch (timeframe) {
      case '7d':
        score = domainObj.seven_day_score ?? domainObj.current_score ?? domainObj.score;
        break;
      case '30d':
        score = domainObj.thirty_day_score ?? domainObj.current_score ?? domainObj.score;
        break;
      case '90d':
        score = domainObj.ninety_day_score ?? domainObj.current_score ?? domainObj.score;
        break;
      case 'today':
      default:
        score = domainObj.today_score ?? domainObj.current_score ?? domainObj.score;
        break;
    }
    return score !== null && score !== undefined ? Math.round(Number(score)) : 0;
  };

  const overallScore = getScoreByTimeframe(overall);

  return (
    <div className="bg-[#121820]/90 backdrop-blur-xl border border-[#2a3644] rounded-2xl p-4 shadow-xl space-y-4 mb-4 font-sans">
      {/* Top Bar: Title & Recalculate Button */}
      <div className="flex justify-between items-center border-b border-[#2a3644] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-tr from-[#f43f5e] to-[#a855f7] rounded-xl text-white shadow-lg shadow-rose-500/20">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <span className="font-mono text-[10px] text-[#06b6d4] tracking-widest block">
              AS OF: {metrics.as_of_date || 'TODAY'}
            </span>
            <span className="text-base font-bold text-white font-sans flex items-center">
              Wellbeing Index {renderTrendIcon(overall?.trend)}
            </span>
          </div>
        </div>

        {/* Recalculate Button */}
        <button
          onClick={onRecalculate}
          disabled={recalculating}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a232e] hover:bg-[#2a3644] border border-[#f43f5e]/40 text-[#f43f5e] font-mono text-[11px] font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
          title="Force explicit score recalculation"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
          <span>{recalculating ? 'CALCULATING...' : 'RECALCULATE'}</span>
        </button>
      </div>

      {/* Timeframe Filter Tabs */}
      <div className="flex bg-[#1a232e] p-1 rounded-xl border border-[#2a3644] font-mono text-xs">
        {[
          { id: 'today', label: 'TODAY' },
          { id: '7d', label: '7-DAY' },
          { id: '30d', label: '30-DAY' },
          { id: '90d', label: '90-DAY' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTimeframe(tab.id)}
            className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
              timeframe === tab.id
                ? 'bg-[#f43f5e] text-white shadow-md'
                : 'text-[#8a99ad] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overall Score Highlight */}
      <div className="bg-[#1a232e] p-3 rounded-xl border border-[#2a3644] flex justify-between items-center">
        <div>
          <span className="font-mono text-[10px] text-[#8a99ad] block">
            {timeframe.toUpperCase()} RECENCY-WEIGHTED COMPOSITE
          </span>
          <span className="text-xs text-[#06b6d4] font-mono">
            ALGORITHM: {metrics.scoring_version || 'v1.0.0'}
          </span>
        </div>
        <div className="text-right">
          <span className="text-3xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-[#f43f5e] to-[#a855f7]">
            {overallScore}%
          </span>
          {overall?.trend_change !== undefined && (
            <span className={`block font-mono text-[10px] ${
              overall.trend === 'improving' ? 'text-emerald-400' : overall.trend === 'declining' ? 'text-rose-400' : 'text-[#8a99ad]'
            }`}>
              {overall.trend_change > 0 ? `+${overall.trend_change}` : overall.trend_change}% vs avg
            </span>
          )}
        </div>
      </div>

      {/* 3 Domain Breakdown Cards */}
      <div className="grid grid-cols-3 gap-2 font-mono">
        {/* Health */}
        <div className="bg-[#1a232e] p-2.5 rounded-xl border border-emerald-500/20 flex flex-col justify-between">
          <div className="flex justify-between items-center text-emerald-400 mb-1">
            <Activity className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold">HEALTH</span>
          </div>
          <div className="text-lg font-bold text-white">
            {getScoreByTimeframe(health)}%
          </div>
          <div className="w-full bg-[#2a3644] h-1 rounded-full mt-1.5 overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, getScoreByTimeframe(health)))}%` }}
            />
          </div>
          <div className="text-[9px] text-[#8a99ad] mt-1.5 flex items-center justify-between">
            <span className="flex items-center gap-0.5"><ShieldCheck className="w-2.5 h-2.5 text-emerald-400" /> CONF</span>
            <span>{Math.round(health?.confidence ?? 100)}%</span>
          </div>
        </div>

        {/* Wealth */}
        <div className="bg-[#1a232e] p-2.5 rounded-xl border border-cyan-500/20 flex flex-col justify-between">
          <div className="flex justify-between items-center text-cyan-400 mb-1">
            <Wallet className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold">FINANCE</span>
          </div>
          <div className="text-lg font-bold text-white">
            {getScoreByTimeframe(financial)}%
          </div>
          <div className="w-full bg-[#2a3644] h-1 rounded-full mt-1.5 overflow-hidden">
            <div
              className="bg-cyan-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, getScoreByTimeframe(financial)))}%` }}
            />
          </div>
          <div className="text-[9px] text-[#8a99ad] mt-1.5 flex items-center justify-between">
            <span className="flex items-center gap-0.5"><ShieldCheck className="w-2.5 h-2.5 text-cyan-400" /> CONF</span>
            <span>{Math.round(financial?.confidence ?? 100)}%</span>
          </div>
        </div>

        {/* Social */}
        <div className="bg-[#1a232e] p-2.5 rounded-xl border border-purple-500/20 flex flex-col justify-between">
          <div className="flex justify-between items-center text-purple-400 mb-1">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold">SOCIAL</span>
          </div>
          <div className="text-lg font-bold text-white">
            {getScoreByTimeframe(social)}%
          </div>
          <div className="w-full bg-[#2a3644] h-1 rounded-full mt-1.5 overflow-hidden">
            <div
              className="bg-purple-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, getScoreByTimeframe(social)))}%` }}
            />
          </div>
          <div className="text-[9px] text-[#8a99ad] mt-1.5 flex items-center justify-between">
            <span className="flex items-center gap-0.5"><ShieldCheck className="w-2.5 h-2.5 text-purple-400" /> CONF</span>
            <span>{Math.round(social?.confidence ?? 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardScorecard;
