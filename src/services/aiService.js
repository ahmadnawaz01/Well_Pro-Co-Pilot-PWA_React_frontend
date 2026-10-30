import { fastApiClient, extractApiError } from './apiClient';
import { feedService } from './feedService';

export const aiService = {
  /**
   * 8.1 POST /api/v1/ingest/process-text
   * Extracts structured personal records from natural language text using Gemini
   * and automatically dispatches them to Frappe & logs to MongoDB.
   */
  async processText(rawText) {
    if (!rawText || !rawText.trim()) {
      throw new Error('Please enter text to process');
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
        const res = await feedService.storeAiRecord(fallbackPayload);
        return {
          status: 'success',
          extracted_count: 1,
          extracted_records: [{ domain: 'health', record_data: fallbackPayload.health }],
          frappe_dispatch_results: [res],
          recalculated_scores: res.data?.recalculated_scores || res.recalculated_score
        };
      } catch {
        throw new Error(extractApiError(fastApiErr, 'Failed to process text ingestion'), { cause: fastApiErr });
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
   * Accepts multipart audio files (WAV, MP3, M4A, OGG, WEBM, FLAC) in any language,
   * translates to English via Groq Whisper large-v3, extracts structured records,
   * and inserts them into Frappe.
   */
  async processAudio(audioBlobOrFile, filename = 'voice.webm') {
    if (!audioBlobOrFile) {
      throw new Error('Audio file or recording is required');
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
      throw new Error(extractApiError(err, 'Failed to process voice audio recording'), { cause: err });
    }
  },

  /**
   * 8.3 POST /api/v1/ingest/process-image
   * Accepts receipts, medical reports, activity screenshots, or photos.
   * Runs OCR via OpenRouter Vision, structures the data with Gemini,
   * and persists records into Frappe.
   */
  async processImage(imageBlobOrFile, filename = 'document.png') {
    if (!imageBlobOrFile) {
      throw new Error('Image or document file is required');
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
      throw new Error(extractApiError(err, 'Failed to process image/document OCR'), { cause: err });
    }
  },

  /**
   * 9.1 POST /api/v1/chat/message
   * Interactive multi-turn ReAct agent with Frappe tool-calling and MongoDB checkpointer memory.
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
   * Retrieves past user and assistant messages to rehydrate UI on page load.
   */
  async getChatHistory(sessionId = 'default') {
    try {
      const response = await fastApiClient.get('/chat/history', {
        params: { session_id: sessionId }
      });
      return response.data?.messages || [];
    } catch (err) {
      console.warn('Chat history unavailable:', err.message);
      return [];
    }
  },

  /**
   * 9.3 DELETE /api/v1/chat/clear?session_id=...
   * Clears chat memory checkpoints for a given session thread.
   */
  async clearChatHistory(sessionId = 'default') {
    try {
      const response = await fastApiClient.delete('/chat/clear', {
        params: { session_id: sessionId }
      });
      return response.data;
    } catch (err) {
      throw new Error(extractApiError(err, 'Failed to clear chat history'), { cause: err });
    }
  }
};

export default aiService;
