import { fastApiClient, extractFrappeError } from './apiClient';
import { feedService } from './feedService';

export const aiService = {
  /**
   * Processes natural language text via FastAPI LLM pipeline (which dispatches to Frappe store_ai_record),
   * or falls back directly to Frappe store_ai_record.
   */
  async ingestText(rawText) {
    if (!rawText || !rawText.trim()) {
      throw new Error('Please enter text to process');
    }

    try {
      // 1. Try FastAPI intelligent extraction pipeline
      const response = await fastApiClient.post('/ingest/text', {
        raw_text: rawText.trim()
      });
      return response.data;
    } catch (fastApiErr) {
      console.warn('FastAPI ingest/text unavailable, falling back directly to Frappe store_ai_record:', fastApiErr.message);

      // 2. Direct Frappe fallback using store_ai_record
      const fallbackPayload = {
        health: {
          raw_input: rawText
        }
      };
      return await feedService.storeAiRecord(fallbackPayload);
    }
  },

  /**
   * Transcribes voice recording and extracts domain records via FastAPI Whisper pipeline.
   */
  async ingestAudio(audioBlob, filename = 'recording.webm') {
    const formData = new FormData();
    formData.append('audio_file', audioBlob, filename);

    const response = await fastApiClient.post('/ingest/audio', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  /**
   * Multi-turn conversational chat with AI Co-Pilot.
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
      throw new Error(extractFrappeError(err, 'Co-Pilot chat service unavailable'), { cause: err });
    }
  },

  /**
   * Fetches user chat history for the session thread.
   */
  async getChatHistory(sessionId = 'default', limit = 50) {
    try {
      const response = await fastApiClient.get('/chat/history', {
        params: { session_id: sessionId, limit }
      });
      return response.data;
    } catch (err) {
      console.warn('Chat history unavailable:', err.message);
      return [];
    }
  }
};
