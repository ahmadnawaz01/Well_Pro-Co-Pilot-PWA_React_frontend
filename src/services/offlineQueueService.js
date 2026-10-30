import { feedService } from './feedService';
import { aiService } from './aiService';

const STORAGE_KEY = 'wellpro_offline_queue';

class OfflineQueueService {
  constructor() {
    this._isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this._syncing = false;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this._isOnline = true;
        this._notifyStatus();
        this.syncPending();
      });

      window.addEventListener('offline', () => {
        this._isOnline = false;
        this._notifyStatus();
      });
    }
  }

  isOnline() {
    return typeof navigator !== 'undefined' ? navigator.onLine : this._isOnline;
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

  getQueue() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('Failed to read offline queue:', e);
      return [];
    }
  }

  _saveQueue(queue) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('wellpro:queue_updated', {
            detail: { queue }
          })
        );
      }
    } catch (e) {
      console.error('Failed to save offline queue:', e);
    }
  }

  /**
   * Enqueues an offline action.
   * @param {string} type - 'insert_record' | 'delete_record' | 'update_record' | 'process_text'
   * @param {object} payload - Request payload data
   * @param {object} meta - Human-readable info { doctype, title, preview }
   */
  enqueue(type, payload, meta = {}) {
    const queue = this.getQueue();
    const item = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      payload,
      meta: {
        doctype: meta.doctype || payload.doctype || 'Record',
        title: meta.title || `${type.replace(/_/g, ' ').toUpperCase()}`,
        preview: meta.preview || 'Personal entry saved offline',
        date: meta.date || new Date().toISOString()
      },
      status: 'pending', // 'pending' | 'syncing' | 'fulfilled' | 'failed'
      createdAt: new Date().toISOString(),
      fulfilledAt: null,
      error: null
    };

    queue.unshift(item); // Newest first
    this._saveQueue(queue);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('wellpro:toast', {
          detail: {
            type: 'info',
            title: 'Queued Offline',
            message: `"${item.meta.title}" saved locally. Will sync when reconnected.`
          }
        })
      );
    }

    return item;
  }

  /**
   * Replays all pending offline actions sequentially when network is restored.
   */
  async syncPending() {
    if (!this.isOnline() || this._syncing) return;

    const queue = this.getQueue();
    const pendingItems = queue.filter((i) => i.status === 'pending' || i.status === 'failed');

    if (pendingItems.length === 0) return;

    this._syncing = true;
    let fulfilledCount = 0;

    for (const item of pendingItems) {
      item.status = 'syncing';
      this._saveQueue(queue);

      try {
        if (item.type === 'insert_record') {
          await feedService.insertRecord(item.payload, true);
        } else if (item.type === 'process_text') {
          await aiService.processText(item.payload.raw_text, true);
        } else if (item.type === 'delete_record') {
          await feedService.deleteRecord(item.payload.doctype, item.payload.name, true);
        } else if (item.type === 'update_record') {
          await feedService.updateRecord(item.payload.doctype, item.payload.name, item.payload.updateData, true);
        }

        item.status = 'fulfilled';
        item.fulfilledAt = new Date().toISOString();
        item.error = null;
        fulfilledCount++;
      } catch (err) {
        console.error(`Offline sync failed for item ${item.id}:`, err);
        item.status = 'failed';
        item.error = err.message || 'Network sync failed';
      }

      this._saveQueue(queue);
    }

    this._syncing = false;

    if (fulfilledCount > 0 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wellpro:record_created'));
      window.dispatchEvent(
        new CustomEvent('wellpro:toast', {
          detail: {
            type: 'success',
            title: 'Sync Complete',
            message: `Successfully fulfilled ${fulfilledCount} offline request(s)!`
          }
        })
      );
    }
  }

  deleteItem(id) {
    const queue = this.getQueue().filter((i) => i.id !== id);
    this._saveQueue(queue);
  }

  clearFulfilled() {
    const queue = this.getQueue().filter((i) => i.status !== 'fulfilled');
    this._saveQueue(queue);
  }

  getPendingCount() {
    return this.getQueue().filter((i) => i.status === 'pending' || i.status === 'failed').length;
  }
}

export const offlineQueueService = new OfflineQueueService();
export default offlineQueueService;

