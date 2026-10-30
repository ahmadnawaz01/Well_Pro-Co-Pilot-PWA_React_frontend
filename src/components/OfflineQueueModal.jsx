import { useState, useEffect } from 'react';
import { offlineQueueService } from '../services/offlineQueueService';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  X,
  Layers
} from 'lucide-react';

export function OfflineQueueModal({ isOpen, onClose }) {
  const [queue, setQueue] = useState([]);
  const [isOnline, setIsOnline] = useState(offlineQueueService.isOnline());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const refreshData = () => {
      setQueue(offlineQueueService.getQueue());
      setIsOnline(offlineQueueService.isOnline());
    };

    refreshData();

    window.addEventListener('wellpro:queue_updated', refreshData);
    window.addEventListener('wellpro:network_status', refreshData);

    return () => {
      window.removeEventListener('wellpro:queue_updated', refreshData);
      window.removeEventListener('wellpro:network_status', refreshData);
    };
  }, [isOpen]);

  const handleSyncNow = async () => {
    if (!isOnline) {
      alert('Cannot sync while offline. Please connect to the internet first.');
      return;
    }
    setSyncing(true);
    await offlineQueueService.syncPending();
    setQueue(offlineQueueService.getQueue());
    setSyncing(false);
  };

  const handleClearCompleted = () => {
    offlineQueueService.clearFulfilled();
    setQueue(offlineQueueService.getQueue());
  };

  const handleDeleteItem = (id) => {
    offlineQueueService.deleteItem(id);
    setQueue(offlineQueueService.getQueue());
  };

  if (!isOpen) return null;

  const pendingCount = queue.filter((i) => i.status === 'pending' || i.status === 'failed').length;
  const fulfilledCount = queue.filter((i) => i.status === 'fulfilled').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div className="w-full max-w-lg bg-[#121820] border border-[#2a3644] rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-[#8a99ad] hover:text-white rounded-lg hover:bg-[#1a232e] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2a3644] pb-3 pr-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-[#06b6d4] to-[#a855f7] text-black">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base tracking-tight">Offline Request Queue</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full border ${
                    isOnline
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  }`}
                >
                  {isOnline ? (
                    <>
                      <Wifi className="w-3 h-3" /> ONLINE
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3" /> OFFLINE
                    </>
                  )}
                </span>
                <span className="font-mono text-[10px] text-[#8a99ad]">
                  {pendingCount} Pending &middot; {fulfilledCount} Done
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Queue Items List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {queue.length === 0 ? (
            <div className="text-center py-10 space-y-2 font-mono text-xs text-[#8a99ad]">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p>Queue is completely empty.</p>
              <span className="text-[10px] text-[#8a99ad]/60 block">
                All requests are fulfilled and synced to the cloud.
              </span>
            </div>
          ) : (
            queue.map((item) => {
              const isPending = item.status === 'pending';
              const isSyncing = item.status === 'syncing';
              const isFulfilled = item.status === 'fulfilled';
              const isFailed = item.status === 'failed';

              return (
                <div
                  key={item.id}
                  className={`bg-[#1a232e] border rounded-2xl p-3.5 space-y-2 transition-all ${
                    isPending
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : isSyncing
                      ? 'border-cyan-500/40 bg-cyan-500/5'
                      : isFulfilled
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-red-500/40 bg-red-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white font-mono">
                        {item.meta?.doctype || item.type}
                      </span>
                      <span className="text-[10px] text-[#8a99ad] font-mono">
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                          isPending
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : isSyncing
                            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                            : isFulfilled
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}
                      >
                        {isPending && (
                          <>
                            <Clock className="w-2.5 h-2.5" /> PENDING
                          </>
                        )}
                        {isSyncing && (
                          <>
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" /> SYNCING
                          </>
                        )}
                        {isFulfilled && (
                          <>
                            <CheckCircle2 className="w-2.5 h-2.5" /> FULFILLED / DONE
                          </>
                        )}
                        {isFailed && (
                          <>
                            <AlertCircle className="w-2.5 h-2.5" /> FAILED
                          </>
                        )}
                      </span>

                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-[#8a99ad] hover:text-red-400 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Delete from queue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#8a99ad] truncate font-sans">
                    {item.meta?.preview || item.meta?.title}
                  </p>

                  {item.error && (
                    <p className="font-mono text-[10px] text-red-300 bg-red-950/40 p-1.5 rounded-lg border border-red-500/20">
                      Error: {item.error}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#2a3644] font-mono text-xs">
          {fulfilledCount > 0 ? (
            <button
              onClick={handleClearCompleted}
              className="text-[#8a99ad] hover:text-white transition-colors cursor-pointer"
            >
              Clear {fulfilledCount} Done
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncNow}
              disabled={syncing || !isOnline || pendingCount === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#06b6d4] to-[#a855f7] text-black font-bold rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-40"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>SYNCING...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>SYNC NOW</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OfflineQueueModal;

