import { useState, useEffect, useCallback } from 'react';
import { feedService } from '../services/feedService';
import { dashboardService } from '../services/dashboardService';
import { offlineQueueService } from '../services/offlineQueueService';
import { FeedCard } from '../components/FeedCard';
import { DashboardScorecard } from '../components/DashboardScorecard';
import { ManualRecordModal } from '../components/ManualRecordModal';
import { EditRecordModal } from '../components/EditRecordModal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { OfflineQueueModal } from '../components/OfflineQueueModal';
import { RefreshCw, Layers, Calendar, X, PlusCircle, Wifi, WifiOff } from 'lucide-react';

const FILTERS = [
  { id: 'ALL', label: 'All Life' },
  { id: 'HEALTH', label: 'Health & Fitness', doctypes: ['Health Activity', 'Health Daily Record'] },
  { id: 'WEALTH', label: 'Financial', doctypes: ['Financial Transaction', 'Financial Snapshot'] },
  { id: 'SOCIAL', label: 'Social', doctypes: ['Social Activity'] },
  { id: 'WELLBEING', label: 'Wellbeing', doctypes: ['Subjective Wellbeing Checkin'] },
];

export function LifeFeedPage({ userProfile }) {
  const [feedItems, setFeedItems] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Timeline feed date range filter
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Modals
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Animated Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Offline Queue Modal & Network State
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [pendingQueueCount, setPendingQueueCount] = useState(offlineQueueService.getPendingCount());
  const [isOnline, setIsOnline] = useState(offlineQueueService.isOnline());

  const preferredCurrency = userProfile?.preferred_currency || 'USD';

  // Helper function to reliably format today's date as YYYY-MM-DD
  const getTodayFormatted = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load feed items and current scores from Frappe
  const loadData = useCallback(async () => {
    try {
      const [items, dashboardData] = await Promise.all([
        feedService.getUnifiedFeed({
          fromDate: fromDate || undefined,
          toDate: toDate || undefined
        }),
        dashboardService.getDashboardMetrics(30)
      ]);
      setFeedItems(items);
      setMetrics(dashboardData);
    } catch (err) {
      console.error('Failed to load feed data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    loadData();

    const handleRecordCreated = () => {
      loadData();
    };

    const handleQueueUpdated = () => {
      setPendingQueueCount(offlineQueueService.getPendingCount());
      loadData();
    };

    const handleNetworkChange = (e) => {
      setIsOnline(e.detail?.isOnline ?? offlineQueueService.isOnline());
    };

    window.addEventListener('wellpro:record_created', handleRecordCreated);
    window.addEventListener('wellpro:queue_updated', handleQueueUpdated);
    window.addEventListener('wellpro:network_status', handleNetworkChange);

    return () => {
      window.removeEventListener('wellpro:record_created', handleRecordCreated);
      window.removeEventListener('wellpro:queue_updated', handleQueueUpdated);
      window.removeEventListener('wellpro:network_status', handleNetworkChange);
    };
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // 1. Explicit recalculate button -> passes today's date to recalculate_score
  const handleRecalculateScore = async () => {
    try {
      setRecalculating(true);
      const todayStr = getTodayFormatted();
      await dashboardService.recalculateScore(todayStr);
      await loadData();
    } catch (err) {
      alert('Recalculation failed: ' + (err.message || 'Server error'));
    } finally {
      setRecalculating(false);
    }
  };

  // 2. Open animated confirmation modal for record deletion
  const promptDelete = (doctype, name, itemTimestamp) => {
    setDeleteTarget({ doctype, name, itemTimestamp });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { doctype, name, itemTimestamp } = deleteTarget;

    try {
      setIsDeleting(true);
      await feedService.deleteRecord(doctype, name);
      const targetDate = itemTimestamp ? String(itemTimestamp).split('T')[0] : getTodayFormatted();
      try {
        await dashboardService.recalculateScore(targetDate);
      } catch (e) {
        console.warn('Score recalculation note:', e.message);
      }
      window.dispatchEvent(
        new CustomEvent('wellpro:toast', {
          detail: {
            type: 'success',
            title: 'Record Deleted',
            message: `${doctype} deleted successfully and daily scores updated.`
          }
        })
      );
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      window.dispatchEvent(
        new CustomEvent('wellpro:toast', {
          detail: {
            type: 'error',
            title: 'Deletion Failed',
            message: err.message || 'Unable to delete record'
          }
        })
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // 3. Triggered when a record is inserted or updated
  const handleMutationSuccess = async () => {
    await loadData();
  };

  const filteredItems = feedItems.filter(item => {
    if (activeFilter === 'ALL') return true;
    const filterConfig = FILTERS.find(f => f.id === activeFilter);
    return filterConfig?.doctypes?.includes(item._doctype);
  });

  return (
    <div className="flex flex-col h-full space-y-3 font-sans max-w-full overflow-hidden">
      {/* Dashboard Scorecard Banner */}
      <DashboardScorecard
        metrics={metrics}
        onRecalculate={handleRecalculateScore}
        recalculating={recalculating}
      />

      {/* Offline Warning Banner */}
      {!isOnline && (
        <div className="bg-amber-950/80 border border-amber-500/50 text-amber-200 px-4 py-2.5 rounded-2xl font-mono text-xs flex items-center justify-between gap-2 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span>YOU ARE CURRENTLY OFFLINE — Records are saved locally and will auto-sync when reconnected.</span>
          </div>
          <button
            onClick={() => setIsQueueModalOpen(true)}
            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-lg text-[10px] font-bold cursor-pointer whitespace-nowrap"
          >
            VIEW QUEUE ({pendingQueueCount})
          </button>
        </div>
      )}

      {/* Date Filter & Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-[#121820] p-3 rounded-2xl border border-[#2a3644]">
        <div className="flex items-center gap-2 text-[#8a99ad] font-mono text-xs flex-wrap">
          <Calendar className="w-4 h-4 text-[#06b6d4]" />
          <span className="text-white font-bold mr-1">TIMELINE:</span>
          <span>FROM:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-[#1a232e] border border-[#2a3644] text-white px-2 py-0.5 rounded-xl text-xs focus:outline-none focus:border-[#06b6d4]"
          />
          <span>TO:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-[#1a232e] border border-[#2a3644] text-white px-2 py-0.5 rounded-xl text-xs focus:outline-none focus:border-[#06b6d4]"
          />
          {(fromDate || toDate) && (
            <button
              onClick={() => { setFromDate(''); setToDate(''); }}
              className="p-1 text-[#8a99ad] hover:text-white flex items-center gap-1 bg-[#1a232e] px-2 py-0.5 rounded-lg border border-[#2a3644] cursor-pointer"
              title="Clear Timeline Filter"
            >
              <X className="w-3.5 h-3.5" />
              <span>CLEAR</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setIsQueueModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all cursor-pointer ${
              pendingQueueCount > 0
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 animate-pulse'
                : 'bg-[#1a232e] border-[#2a3644] text-[#8a99ad] hover:text-white'
            }`}
            title="View Offline Queue"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">QUEUE</span>
            <span>({pendingQueueCount})</span>
          </button>

          <button
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#f43f5e] to-[#a855f7] text-white font-mono text-xs font-bold rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>NEW RECORD</span>
          </button>
        </div>
      </div>

      {/* Category Filters Bar */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 border-b border-[#2a3644]/50 no-scrollbar">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
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
          className="p-2 bg-[#121820] border border-[#2a3644] text-[#8a99ad] hover:text-white rounded-xl shrink-0 cursor-pointer"
          title="Refresh Feed Records"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#06b6d4]' : ''}`} />
        </button>
      </div>

      {/* Timeline List */}
      {loading ? (
        <div className="flex-1 flex flex-col justify-center items-center font-mono text-xs text-[#8a99ad] py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-[#f43f5e] mb-2" />
          <span>QUERYING ALL DOCTYPE REGISTRIES...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center items-center text-center p-8 bg-[#121820]/50 border border-[#2a3644] rounded-2xl my-6 space-y-3 font-mono">
          <Layers className="w-10 h-10 text-[#8a99ad]" />
          <div className="text-sm font-bold text-white">NO LOGGED EVENTS IN SELECTED DATE RANGE</div>
          <p className="text-xs text-[#8a99ad] max-w-sm">
            Use "New Record" or "AI Capture" to log activities across Health, Wealth, and Social dimensions.
          </p>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-380px)] pr-1">
          {filteredItems.map((item) => (
            <FeedCard
              key={item.name}
              item={item}
              onEdit={setEditingItem}
              onDelete={(doctype, name) => promptDelete(doctype, name, item._timestamp)}
              defaultCurrency={preferredCurrency}
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

      {/* Animated Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title={`Delete ${deleteTarget?.doctype || 'Record'}?`}
        message={`Are you sure you want to permanently delete this ${deleteTarget?.doctype || 'record'}? This action will remove it from Frappe and recalculate your daily score.`}
        confirmLabel="Yes, Delete Record"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Offline Queue Modal */}
      <OfflineQueueModal
        isOpen={isQueueModalOpen}
        onClose={() => setIsQueueModalOpen(false)}
      />
    </div>
  );
}

export default LifeFeedPage;
