import React, { useState, useEffect } from 'react';
import { feedService } from '../services/feedService';
import { dashboardService } from '../services/dashboardService';
import { FeedCard } from '../components/FeedCard';
import { DashboardScorecard } from '../components/DashboardScorecard';
import { ManualRecordModal } from '../components/ManualRecordModal';
import { EditRecordModal } from '../components/EditRecordModal';
import { RefreshCw, Layers, Calendar, X, PlusCircle } from 'lucide-react';

const FILTERS = [
  { id: 'ALL', label: 'All Life' },
  { id: 'HEALTH', label: 'Health & Fitness', doctypes: ['Health Activity', 'Health Daily Record'] },
  { id: 'WEALTH', label: 'Financial', doctypes: ['Financial Transaction'] },
  { id: 'SOCIAL', label: 'Social', doctypes: ['Social Activity'] },
  { id: 'WELLBEING', label: 'Wellbeing', doctypes: ['Subjective Wellbeing Checkin'] },
];

export function LifeFeedPage() {
  const [feedItems, setFeedItems] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const loadData = async (targetDate) => {
    try {
      const activeDateParam = targetDate || toDate || undefined;
      const [items, dashboardData] = await Promise.all([
        feedService.getUnifiedFeed({
          limit: 50,
          fromDate: fromDate || undefined,
          toDate: activeDateParam
        }),
        dashboardService.getDashboardMetrics(activeDateParam)
      ]);
      setFeedItems(items);
      setMetrics(dashboardData);
    } catch (err) {
      console.error('Failed to load feed data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [fromDate, toDate]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleRecalculateScore = async () => {
    try {
      setRecalculating(true);
      const effectiveDate = toDate || new Date().toISOString().split('T')[0];
      await dashboardService.recalculateScore(effectiveDate);
      await loadData(effectiveDate);
    } catch (err) {
      alert('Recalculation failed: ' + err.message);
    } finally {
      setRecalculating(false);
    }
  };

  // Fixed Deletion Handler
  const handleDelete = async (doctype, name, itemTimestamp) => {
    if (!window.confirm(`Delete this ${doctype} entry permanently?`)) return;

    try {
      setLoading(true);
      // 1. Await actual Frappe database deletion
      await feedService.deleteRecord(doctype, name);

      // 2. Determine affected date & recalculate scores in backend
      const targetDate = itemTimestamp ? itemTimestamp.split('T')[0] : (toDate || new Date().toISOString().split('T')[0]);
      await dashboardService.recalculateScore(targetDate);

      // 3. Re-query backend database so state matches server ground truth
      await loadData(targetDate);
    } catch (err) {
      alert('Failed to delete record: ' + err.message);
      loadData();
    } finally {
      setLoading(false);
    }
  };

  const handleMutationSuccess = async (affectedDate) => {
    try {
      const targetDate = affectedDate || toDate || new Date().toISOString().split('T')[0];
      await dashboardService.recalculateScore(targetDate);
      await loadData(targetDate);
    } catch (err) {
      loadData();
    }
  };

  const filteredItems = feedItems.filter(item => {
    if (activeFilter === 'ALL') return true;
    const filterConfig = FILTERS.find(f => f.id === activeFilter);
    return filterConfig?.doctypes?.includes(item._doctype);
  });

  return (
    <div className="flex flex-col h-full space-y-3 font-sans max-w-full overflow-hidden">
      {/* 1. Date Range & Manual Entry Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-[#121820] p-3 rounded-2xl border border-[#2a3644]">
        <div className="flex items-center gap-2 text-[#8a99ad] font-mono text-xs flex-wrap">
          <Calendar className="w-4 h-4 text-[#06b6d4]" />
          <span>FROM:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-[#1a232e] border border-[#2a3644] text-white px-2 py-0.5 rounded-xl text-xs focus:outline-none"
          />
          <span>TO:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-[#1a232e] border border-[#2a3644] text-white px-2 py-0.5 rounded-xl text-xs focus:outline-none"
          />
          {(fromDate || toDate) && (
            <button
              onClick={() => { setFromDate(''); setToDate(''); }}
              className="p-1 text-[#8a99ad] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => setIsManualModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#f43f5e] to-[#a855f7] text-white font-mono text-xs font-bold rounded-xl shadow-lg active:scale-95 transition-all self-end sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>MANUAL RECORD</span>
        </button>
      </div>

      {/* 2. Scorecard Banner */}
      <DashboardScorecard
        metrics={metrics}
        onRecalculate={handleRecalculateScore}
        recalculating={recalculating}
      />

      {/* 3. Category Filters Bar */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 border-b border-[#2a3644]/50 no-scrollbar">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold whitespace-nowrap transition-all border ${
                activeFilter === f.id
                  ? 'bg-[#f43f5e] border-[#f43f5e] text-white shadow-lg shadow-rose-500/20'
                  : 'bg-[#121820] border-[#2a3644] text-[#8a99ad] hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 bg-[#121820] border border-[#2a3644] text-[#8a99ad] hover:text-white rounded-xl shrink-0"
          title="Refresh Feed & Scores"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#06b6d4]' : ''}`} />
        </button>
      </div>

      {/* 4. Streamlined Card Timeline */}
      {loading ? (
        <div className="flex-1 flex flex-col justify-center items-center font-mono text-xs text-[#8a99ad] py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-[#f43f5e] mb-2" />
          <span>UPDATING DATABASE & RECALCULATING...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center items-center text-center p-8 bg-[#121820]/50 border border-[#2a3644] rounded-2xl my-6 space-y-3 font-mono">
          <Layers className="w-10 h-10 text-[#8a99ad]" />
          <div className="text-sm font-bold text-white">NO LOGGED EVENTS</div>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-380px)] pr-1">
          {filteredItems.map((item) => (
            <FeedCard
              key={item.name}
              item={item}
              onEdit={setEditingItem}
              onDelete={(doctype, name) => handleDelete(doctype, name, item._timestamp)}
            />
          ))}
        </div>
      )}

      {/* Manual Insert Modal */}
      <ManualRecordModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSuccess={handleMutationSuccess}
      />

      {/* Edit Record Modal */}
      <EditRecordModal
        isOpen={!!editingItem}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSuccess={handleMutationSuccess}
      />
    </div>
  );
}