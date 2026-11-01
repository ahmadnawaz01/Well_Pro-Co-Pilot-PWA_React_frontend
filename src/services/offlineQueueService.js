import { localQueue } from './localDb';

const LEGACY_STORAGE_KEY = 'wellpro_offline_queue';

class OfflineQueueService {
  constructor() {
    this._isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this._syncing = false;
    this._memoryQueue = [];
    this._initialized = false;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this._isOnline = true;
        this._notifyStatus();
        this._notifyToast({
          type: 'success',
          title: 'Back Online',
          message: 'Internet connection restored. Synchronizing offline queue...'
        });
        this.syncPending();
      });

      window.addEventListener('offline', () => {
        this._isOnline = false;
        this._notifyStatus();
        this._notifyToast({
          type: 'warning',
          title: 'Offline Mode Active',
          message: 'Changes and captures will be saved locally in IndexedDB and synced automatically.'
        });
      });

      // Initial load from IndexedDB
      this._init();
    }
  }

  async _init() {
    if (this._initialized) return;

    try {
      // 1. Check for legacy localStorage items and migrate to IndexedDB
      try {
        const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacyData) {
          const items = JSON.parse(legacyData);
          if (Array.isArray(items)) {
            for (const item of items) {
              await localQueue.setItem(item.id, item);
            }
          }
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        }
      } catch (legacyErr) {
        console.warn('[OfflineQueue] Legacy migration warning:', legacyErr);
      }

      // 2. Load queue items into memory
      this._memoryQueue = await localQueue.getAll();
      this._initialized = true;

      this._broadcastQueue();

      // 3. If online at start, attempt background sync of any pending requests
      if (this.isOnline()) {
        setTimeout(() => {
          this.syncPending();
        }, 1500);
      }
    } catch (err) {
      console.error('[OfflineQueue] Initialization failed:', err);
      this._initialized = true;
    }
  }

  isOnline() {
    return typeof navigator !== 'undefined' ? navigator.onLine : this._isOnline;
  }

  isSyncing() {
    return this._syncing;
  }

  _notifyStatus() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('wellpro:network_status', {
          detail: { isOnline: this.isOnline() }
        })
      );
    }
  }

  _notifyToast(detail) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('wellpro:toast', {
          detail
        })
      );
    }
  }

  _notifySyncStatus(status) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('wellpro:sync_status', {
          detail: status
        })
      );
    }
  }

  _broadcastQueue() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('wellpro:queue_updated', {
          detail: {
            queue: this.getQueue(),
            pendingCount: this.getPendingCount()
          }
        })
      );
    }
  }

  getQueue() {
    // Return newest first for display
    return [...this._memoryQueue].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getPendingCount() {
    return this._memoryQueue.filter((i) => i.status === 'pending' || i.status === 'failed').length;
  }

  /**
   * Enqueues an offline action into IndexedDB.
   * Supports raw binary Blobs/Files (voice recordings and camera OCR images).
   *
   * @param {string} type - 'insert_record' | 'delete_record' | 'update_record' | 'process_text' | 'process_audio' | 'process_image' | 'setup_goals' | 'recalculate_score'
   * @param {object} payload - Action payload
   * @param {object} meta - Human-readable info { doctype, title, preview }
   */
  async enqueue(type, payload, meta = {}) {
    await this._init();

    const id = `queue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const item = {
      id,
      type,
      payload,
      meta: {
        doctype: meta.doctype || payload.doctype || 'Action',
        title: meta.title || `${type.replace(/_/g, ' ').toUpperCase()}`,
        preview: meta.preview || 'Action queued offline',
        date: meta.date || new Date().toISOString()
      },
      status: 'pending', // 'pending' | 'syncing' | 'fulfilled' | 'failed'
      createdAt: new Date().toISOString(),
      fulfilledAt: null,
      error: null,
      retryCount: 0
    };

    // 1. Save to IndexedDB
    await localQueue.setItem(id, item);

    // 2. Update memory cache
    this._memoryQueue.push(item);
    this._broadcastQueue();

    // 3. User feedback
    this._notifyToast({
      type: 'info',
      title: 'Saved Offline',
      message: `"${item.meta.title}" saved locally. Will sync automatically when connected.`
    });

    return item;
  }

  /**
   * Replays pending offline actions in FIFO chronological order.
   * Gracefully pauses on server errors to prevent data inconsistency.
   */
  async syncPending() {
    await this._init();

    if (!this.isOnline() || this._syncing) return;

    // Filter pending/failed items, sorted oldest first (FIFO)
    const pendingItems = [...this._memoryQueue]
      .filter((i) => i.status === 'pending' || i.status === 'failed')
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    if (pendingItems.length === 0) return;

    this._syncing = true;
    this._notifySyncStatus({ syncing: true, pendingCount: pendingItems.length });

    let fulfilledCount = 0;
    let hasFailure = false;

    // Dynamically import services to avoid circular dependency
    const { feedService } = await import('./feedService');
    const { aiService } = await import('./aiService');
    const { goalsService } = await import('./goalsService');
    const { dashboardService } = await import('./dashboardService');

    for (const item of pendingItems) {
      if (!this.isOnline()) {
        hasFailure = true;
        break;
      }

      item.status = 'syncing';
      await localQueue.setItem(item.id, item);
      this._broadcastQueue();

      try {
        if (item.type === 'insert_record') {
          await feedService.insertRecord(item.payload, true);
        } else if (item.type === 'process_text') {
          await aiService.processText(item.payload.raw_text, true);
        } else if (item.type === 'process_audio') {
          const audioBlob = item.payload.audioBlob || item.payload.file;
          await aiService.processAudio(audioBlob, item.payload.filename || 'voice.webm');
        } else if (item.type === 'process_image') {
          const imageFile = item.payload.file || item.payload.imageBlob;
          await aiService.processImage(imageFile, item.payload.filename || 'document.png');
        } else if (item.type === 'delete_record') {
          await feedService.deleteRecord(item.payload.doctype, item.payload.name, true);
        } else if (item.type === 'update_record') {
          await feedService.updateRecord(item.payload.doctype, item.payload.name, item.payload.updateData, true);
        } else if (item.type === 'setup_goals') {
          await goalsService.setupScoringGoals(item.payload.goals, item.payload.recalculate, true);
        } else if (item.type === 'recalculate_score') {
          await dashboardService.recalculateScore(item.payload.date, true);
        }

        item.status = 'fulfilled';
        item.fulfilledAt = new Date().toISOString();
        item.error = null;
        fulfilledCount++;

        // Save updated status to IndexedDB
        await localQueue.setItem(item.id, item);
      } catch (err) {
        console.error(`[OfflineQueue] Sync failed for item "${item.id}":`, err);
        item.status = 'failed';
        item.error = err.message || 'Network sync failed';
        item.retryCount = (item.retryCount || 0) + 1;
        await localQueue.setItem(item.id, item);

        // Pause queue execution on server error to preserve FIFO integrity
        hasFailure = true;
        break;
      }

      this._broadcastQueue();
    }

    this._syncing = false;
    this._notifySyncStatus({ syncing: false, pendingCount: this.getPendingCount() });

    if (fulfilledCount > 0 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wellpro:record_created'));
      this._notifyToast({
        type: 'success',
        title: 'Sync Complete',
        message: `Successfully synced ${fulfilledCount} offline item(s) with the backend.`
      });
    }

    if (hasFailure && !this.isOnline()) {
      this._notifyToast({
        type: 'warning',
        title: 'Sync Paused',
        message: 'Offline mode detected. Queue will resume automatically once connected.'
      });
    }
  }

  async deleteItem(id) {
    await localQueue.removeItem(id);
    this._memoryQueue = this._memoryQueue.filter((i) => i.id !== id);
    this._broadcastQueue();
  }

  async clearFulfilled() {
    await localQueue.clearFulfilled();
    this._memoryQueue = this._memoryQueue.filter((i) => i.status !== 'fulfilled');
    this._broadcastQueue();
  }
}

export const offlineQueueService = new OfflineQueueService();
export default offlineQueueService;
