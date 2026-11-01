import { fastApiClient, extractApiError } from './apiClient';
import { feedService } from './feedService';
import { offlineQueueService } from './offlineQueueService';
import { localCache } from './localDb';

export const aiService = {
  /**
   * 8.1 POST /api/v1/ingest/process-text
   * Extracts structured personal records from natural language text using Gemini
   * and automatically dispatches them to Frappe & logs to MongoDB.
   * Offline-capable: Queues text into IndexedDB when offline.
   */
  async processText(rawText, isOfflineReplay = false) {
    if (!rawText || !rawText.trim()) {
      throw new Error('Please enter text to process');
    }

    if (!offlineQueueService.isOnline() && !isOfflineReplay) {
      const queued = await offlineQueueService.enqueue('process_text', { raw_text: rawText.trim() }, {
        title: 'Raw Text AI Capture',
        preview: rawText.trim().slice(0, 100)
      });

      return {
        status: 'queued',
        _offline_pending: true,
        message: 'Saved offline. AI will extract wellbeing records once reconnected.',
        queue_id: queued.id
      };
    }

    try {
      const response = await fastApiClient.post('/ingest/process-text', {
        raw_text: rawText.trim()
      });
      return response.data;
    } catch (fastApiErr) {
      console.warn('FastAPI ingest/process-text unavailable, attempting Frappe fallback:', fastApiErr.message);

      // Direct Frappe fallback using store_ai_record if FastAPI is down
      try {
        const fallbackPayload = {
          health: { raw_input: rawText.trim() }
        };
        const res = await feedService.storeAiRecord(fallbackPayload, isOfflineReplay);
        return {
          status: 'success',
          extracted_count: 1,
          extracted_records: [{ domain: 'health', record_data: fallbackPayload.health }],
          frappe_dispatch_results: [res],
          recalculated_scores: res.data?.recalculated_scores || res.recalculated_score
        };
      } catch (frappeErr) {
        console.warn('Frappe fallback also failed:', frappeErr.message);
        if (!isOfflineReplay && (!navigator.onLine || fastApiErr.message?.includes('Network Error'))) {
          await offlineQueueService.enqueue('process_text', { raw_text: rawText.trim() }, {
            title: 'Raw Text AI Capture',
            preview: rawText.trim().slice(0, 100)
          });
          return {
            status: 'queued',
            _offline_pending: true,
            message: 'Saved offline due to network issue. Will process when reconnected.'
          };
        }
        throw new Error(extractApiError(fastApiErr, 'Failed to process text ingestion'), { cause: frappeErr });
      }
    }
  },

  /**
   * Backward-compatibility alias for processText
   */
  async ingestText(rawText) {
    return this.processText(rawText);
  },

  /**
   * 8.2 POST /api/v1/ingest/process-audio
   * Accepts multipart audio files (WAV, MP3, M4A, OGG, WEBM, FLAC) in any language.
   * Offline-capable: Stores the raw binary audio Blob/File in IndexedDB when offline.
   */
  async processAudio(audioBlobOrFile, customFilename, isOfflineReplay = false) {
    if (!audioBlobOrFile) {
      throw new Error('Audio file or recording is required');
    }

    const filename = customFilename || audioBlobOrFile.name || 'voice.webm';

    if (!offlineQueueService.isOnline() && !isOfflineReplay) {
      const queued = await offlineQueueService.enqueue('process_audio', {
        audioBlob: audioBlobOrFile,
        filename
      }, {
        title: 'Voice Audio Recording',
        preview: `Audio capture (${filename}) saved offline for Groq Whisper AI`
      });

      return {
        status: 'queued',
        _offline_pending: true,
        is_relevant: true,
        message: 'Voice recording saved locally in IndexedDB. Will transcribe and sync when online.',
        queue_id: queued.id
      };
    }

    try {
      const formData = new FormData();
      formData.append('file', audioBlobOrFile, filename);

      const response = await fastApiClient.post('/ingest/process-audio', formData, {
        headers: {
          'Content-Type': undefined
        }
      });
      return response.data;
    } catch (err) {
      if (!isOfflineReplay && (!navigator.onLine || err.message?.includes('Network Error'))) {
        await offlineQueueService.enqueue('process_audio', {
          audioBlob: audioBlobOrFile,
          filename
        }, {
          title: 'Voice Audio Recording',
          preview: `Audio capture (${filename}) saved offline`
        });
        return {
          status: 'queued',
          _offline_pending: true,
          is_relevant: true,
          message: 'Voice saved offline due to network issue. Will sync when reconnected.'
        };
      }
      throw new Error(extractApiError(err, 'Failed to process voice audio recording'), { cause: err });
    }
  },

  /**
   * 8.3 POST /api/v1/ingest/process-image
   * Accepts receipts, medical reports, activity screenshots, or photos.
   * Offline-capable: Stores the image Blob/File in IndexedDB when offline.
   */
  async processImage(imageBlobOrFile, customFilename, isOfflineReplay = false) {
    if (!imageBlobOrFile) {
      throw new Error('Image or document file is required');
    }

    const filename = customFilename || imageBlobOrFile.name || 'document.png';

    if (!offlineQueueService.isOnline() && !isOfflineReplay) {
      const queued = await offlineQueueService.enqueue('process_image', {
        file: imageBlobOrFile,
        filename
      }, {
        title: 'Camera / Document OCR',
        preview: `Document (${filename}) saved offline for Vision AI OCR`
      });

      return {
        status: 'queued',
        _offline_pending: true,
        is_relevant: true,
        message: 'Image saved locally in IndexedDB. Will run Vision OCR when reconnected.',
        queue_id: queued.id
      };
    }

    try {
      const formData = new FormData();
      formData.append('file', imageBlobOrFile, filename);

      const response = await fastApiClient.post('/ingest/process-image', formData, {
        headers: {
          'Content-Type': undefined
        }
      });
      return response.data;
    } catch (err) {
      if (!isOfflineReplay && (!navigator.onLine || err.message?.includes('Network Error'))) {
        await offlineQueueService.enqueue('process_image', {
          file: imageBlobOrFile,
          filename
        }, {
          title: 'Camera / Document OCR',
          preview: `Document (${filename}) saved offline`
        });
        return {
          status: 'queued',
          _offline_pending: true,
          is_relevant: true,
          message: 'Image saved offline due to network issue. Will sync when reconnected.'
        };
      }
      throw new Error(extractApiError(err, 'Failed to process image/document OCR'), { cause: err });
    }
  },

  /**
   * 9.1 POST /api/v1/chat/message
   */
  async sendChatMessage(message, sessionId = 'default') {
    if (!message || !message.trim()) {
      throw new Error('Please enter a question or command');
    }

    try {
      const response = await fastApiClient.post('/chat/message', {
        message: message.trim(),
        session_id: sessionId
      });
      return response.data;
    } catch (err) {
      throw new Error(extractApiError(err, 'Co-Pilot chat service unavailable'), { cause: err });
    }
  },

  /**
   * 9.2 GET /api/v1/chat/history?session_id=...
   */
  async getChatHistory(sessionId = 'default') {
    const cacheKey = `chat_history_${sessionId}`;
    try {
      const response = await fastApiClient.get('/chat/history', {
        params: { session_id: sessionId }
      });
      if (response.data) {
        await localCache.set(cacheKey, response.data);
      }
      return response.data;
    } catch (err) {
      console.warn('Failed to retrieve chat history from server, trying offline cache:', err);
      const cached = await localCache.get(cacheKey);
      if (cached) return cached;
      return { messages: [], session_id: sessionId };
    }
  },

  /**
   * 9.3 DELETE /api/v1/chat/clear?session_id=...
   */
  async clearChatHistory(sessionId = 'default') {
    try {
      const response = await fastApiClient.delete('/chat/clear', {
        params: { session_id: sessionId }
      });
      await localCache.remove(`chat_history_${sessionId}`);
      return response.data;
    } catch (err) {
      await localCache.remove(`chat_history_${sessionId}`);
      throw new Error(extractApiError(err, 'Failed to clear chat memory'), { cause: err });
    }
  }
};

export default aiService;
