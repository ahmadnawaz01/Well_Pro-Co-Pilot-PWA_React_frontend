import React from 'react';
import { Activity, Wallet, HeartHandshake, Smile, Trash2, Edit3, Calendar } from 'lucide-react';

const DOMAIN_CONFIGS = {
  'Health Activity': { label: 'FITNESS', color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', icon: Activity },
  'Health Daily Record': { label: 'HEALTH METRICS', color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', icon: Activity },
  'Financial Transaction': { label: 'FINANCIAL', color: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10', icon: Wallet },
  'Social Activity': { label: 'SOCIAL', color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/10', icon: HeartHandshake },
  'Subjective Wellbeing Checkin': { label: 'WELLBEING', color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10', icon: Smile },
};

const IGNORED_KEYS = new Set([
  'name', 'owner', 'creation', 'modified', 'modified_by', 'docstatus', 'idx',
  '_doctype', '_timestamp', 'user', 'doctype', 'source'
]);

const formatFieldLabel = (key) => key.replace(/_/g, ' ').toUpperCase();

export function FeedCard({ item, onEdit, onDelete }) {
  const config = DOMAIN_CONFIGS[item._doctype] || {
    label: item._doctype,
    color: 'text-rose-400',
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/10',
    icon: Activity
  };
  const Icon = config.icon;

  const formattedDate = new Date(item._timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const activeFields = Object.entries(item).filter(([key, value]) => {
    if (IGNORED_KEYS.has(key)) return false;
    if (value === null || value === undefined || value === '') return false;
    if (key === 'raw_input' || key === 'notes' || key === 'description') return false;
    return true;
  });

  const mainNote = item.description || item.notes || item.raw_input;

  return (
    <div className={`w-full bg-[#121820]/90 backdrop-blur-xl border ${config.border} rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between my-2`}>
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#2a3644] pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl ${config.bg} ${config.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <span className={`font-mono text-[10px] font-bold tracking-wider ${config.color} block`}>
              {config.label}
            </span>
            <span className="font-mono text-[11px] text-[#8a99ad] flex items-center gap-1">
              <Calendar className="w-3 h-3 inline" /> {formattedDate}
            </span>
          </div>
        </div>

        {/* Action Buttons: Edit & Delete */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(item)}
            className="text-[#8a99ad] hover:text-[#06b6d4] p-1.5 rounded-lg hover:bg-cyan-500/10 transition-colors"
            title="Edit record"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(item._doctype, item.name)}
            className="text-[#8a99ad] hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
            title="Delete entry"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {mainNote && (
        <p className="text-sm text-[#f0f4f8] font-sans leading-relaxed mb-3">
          {mainNote}
        </p>
      )}

      {/* Dynamic Key-Value Pairs Grid */}
      {activeFields.length > 0 && (
        <div className="grid grid-cols-2 gap-2 font-mono text-xs">
          {activeFields.map(([key, val]) => (
            <div key={key} className="bg-[#1a232e] p-2.5 rounded-xl border border-[#2a3644] flex flex-col">
              <span className="text-[10px] text-[#8a99ad] block truncate">{formatFieldLabel(key)}</span>
              <span className="text-white font-bold truncate block">
                {typeof val === 'number' && key.includes('amount')
                  ? `PKR ${val.toLocaleString()}`
                  : String(val)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-[#2a3644]/50 flex justify-between items-center font-mono text-[10px] text-[#8a99ad]">
        <span>SOURCE: {(item.source || 'MANUAL').toUpperCase()}</span>
        <span>ID: {item.name}</span>
      </div>
    </div>
  );
}