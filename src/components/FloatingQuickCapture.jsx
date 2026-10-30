import { useState, useRef, useEffect } from 'react';
import { aiService } from '../services/aiService';
import {
  Mic,
  Camera,
  Square,
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Activity,
  DollarSign,
  Users
} from 'lucide-react';

export function FloatingQuickCapture() {
  // Capture states: 'idle' | 'recording' | 'processing' | 'result'
  const [state, setState] = useState('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('');
  const [resultData, setResultData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Clean up timer and media stream on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Format mm:ss
  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 1. Direct Click -> Start Voice Recording
  const startDirectVoiceRecording = async () => {
    setErrorMessage('');
    setResultData(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach((track) => track.stop());

        // Automatically process the recorded audio immediately!
        await handleProcessVoice(audioBlob);
      };

      recorder.start(200);
      setState('recording');
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Microphone permission denied. Please allow microphone access.'
          : 'Microphone unavailable: ' + err.message
      );
      setState('result');
      setResultData({ hasDetails: false, reason: 'Microphone permission or hardware error' });
    }
  };

  // Stop recording and trigger Whisper & Gemini extraction
  const stopRecordingAndProcess = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      setState('processing');
      setProcessingMessage('Whisper is transcribing voice & extracting wellbeing records...');
      mediaRecorderRef.current.stop();
    }
  };

  // Cancel recording without submitting
  const cancelRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.onstop = null; // Don't trigger auto-submit
      mediaRecorderRef.current.stop();
    }
    setState('idle');
    setRecordingSeconds(0);
    audioChunksRef.current = [];
  };

  // Ingest voice to FastAPI
  const handleProcessVoice = async (audioBlob) => {
    setState('processing');
    setProcessingMessage('Groq Whisper transcribing voice & extracting records...');

    try {
      const res = await aiService.processAudio(audioBlob, 'quick_voice.webm');

      // Check if details were extracted
      const hasExtractedRecords = Array.isArray(res.extracted_records) && res.extracted_records.length > 0;
      const isRelevant = res.is_relevant === true || hasExtractedRecords;

      setResultData({
        type: 'voice',
        hasDetails: isRelevant && hasExtractedRecords,
        reason: res.reason || (isRelevant ? 'Details successfully extracted' : 'No personal wellbeing data identified'),
        transcribedText: res.transcribed_english_text,
        records: res.extracted_records || [],
        scores: res.recalculated_scores || res.recalculated_score || null,
        insertedCount: res.inserted_count || (hasExtractedRecords ? res.extracted_records.length : 0)
      });

      if (isRelevant && hasExtractedRecords) {
        // Broadcast event so feeds and scorecards refresh automatically
        window.dispatchEvent(new CustomEvent('wellpro:record_created'));
      }
    } catch (err) {
      setResultData({
        type: 'voice',
        hasDetails: false,
        reason: err.message || 'Failed to process voice audio'
      });
    } finally {
      setState('result');
    }
  };

  // 2. Direct Click -> Select Image / Document OCR
  const handleDirectImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be re-selected if needed
    e.target.value = '';

    setState('processing');
    setProcessingMessage(`Vision AI reading ${file.name} & extracting data...`);

    try {
      const res = await aiService.processImage(file, file.name);

      const hasExtractedRecords = Array.isArray(res.extracted_records) && res.extracted_records.length > 0;
      const isRelevant = res.is_relevant === true || hasExtractedRecords;

      setResultData({
        type: 'image',
        hasDetails: isRelevant && hasExtractedRecords,
        reason: res.reason || (isRelevant ? 'Details successfully extracted' : 'No personal wellbeing data identified in image'),
        ocrText: res.extracted_ocr_text,
        records: res.extracted_records || [],
        scores: res.recalculated_scores || res.recalculated_score || null,
        insertedCount: res.inserted_count || (hasExtractedRecords ? res.extracted_records.length : 0)
      });

      if (isRelevant && hasExtractedRecords) {
        window.dispatchEvent(new CustomEvent('wellpro:record_created'));
      }
    } catch (err) {
      setResultData({
        type: 'image',
        hasDetails: false,
        reason: err.message || 'Failed to process image OCR'
      });
    } finally {
      setState('result');
    }
  };

  const closeResult = () => {
    setState('idle');
    setResultData(null);
    setErrorMessage('');
  };

  return (
    <>
      {/* Hidden file input for direct Image/Doc capture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* FLOATING ACTION DOCK (Always visible on mobile & desktop) */}
      {/* Position: bottom-20 on mobile (above nav bar), bottom-6 on desktop */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 flex flex-col items-end gap-2.5 pointer-events-auto font-sans">
        {/* STATE 1: ACTIVE LIVE RECORDING BAR */}
        {state === 'recording' && (
          <div className="bg-[#121820]/95 backdrop-blur-xl border border-rose-500/60 rounded-2xl p-3 shadow-2xl shadow-rose-500/20 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
            {/* Pulsing indicator */}
            <div className="flex items-center gap-2 pl-1">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500" />
              </span>
              <span className="font-mono text-xs font-bold text-white tracking-wider">
                {formatTimer(recordingSeconds)}
              </span>
            </div>

            {/* Audio frequency wave visual bars */}
            <div className="flex items-center gap-0.5 h-4">
              <div className="w-1 bg-rose-500 rounded-full h-3 animate-pulse" />
              <div className="w-1 bg-rose-400 rounded-full h-5 animate-pulse delay-75" />
              <div className="w-1 bg-rose-500 rounded-full h-2 animate-pulse delay-150" />
              <div className="w-1 bg-rose-400 rounded-full h-4 animate-pulse delay-100" />
            </div>

            {/* Stop & Add details button */}
            <button
              onClick={stopRecordingAndProcess}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#f43f5e] to-[#a855f7] text-white font-mono text-xs font-bold shadow-lg hover:opacity-95 active:scale-95 transition-all cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>FINISH</span>
            </button>

            {/* Cancel button */}
            <button
              onClick={cancelRecording}
              className="p-1.5 text-[#8a99ad] hover:text-white hover:bg-[#2a3644] rounded-lg transition-colors cursor-pointer"
              title="Cancel recording"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STATE 2: PROCESSING INDICATOR */}
        {state === 'processing' && (
          <div className="bg-[#121820]/95 backdrop-blur-xl border border-[#06b6d4]/50 rounded-2xl p-3 shadow-2xl flex items-center gap-3 animate-in fade-in">
            <RefreshCw className="w-4 h-4 text-[#06b6d4] animate-spin shrink-0" />
            <span className="font-mono text-xs text-white truncate max-w-xs">
              {processingMessage}
            </span>
          </div>
        )}

        {/* STATE 3: IDLE FLOATING BUTTONS (Voice & Image) */}
        {state === 'idle' && (
          <div className="flex items-center gap-2 bg-[#121820]/90 backdrop-blur-xl border border-[#2a3644] p-1.5 rounded-2xl shadow-2xl hover:border-[#f43f5e]/50 transition-all">
            {/* Direct Image Upload Button */}
            <button
              onClick={handleDirectImageClick}
              className="group flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#1a232e] hover:bg-[#2a3644] text-[#06b6d4] hover:text-white border border-[#2a3644] transition-all cursor-pointer shadow-md active:scale-95"
              title="Upload photo, receipt or document OCR"
            >
              <Camera className="w-4 h-4 text-[#06b6d4]" />
              <span className="hidden sm:inline font-mono text-xs font-semibold">Photo / OCR</span>
            </button>

            {/* Direct 1-Tap Voice Recording Button */}
            <button
              onClick={startDirectVoiceRecording}
              className="group flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-tr from-[#f43f5e] to-[#a855f7] text-white shadow-lg shadow-rose-500/25 hover:opacity-95 active:scale-95 transition-all cursor-pointer"
              title="1-Tap Direct Voice Record"
            >
              <div className="relative">
                <Mic className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <span className="font-mono text-xs font-bold tracking-tight">Record Voice</span>
            </button>
          </div>
        )}
      </div>

      {/* RESULT MODAL / TOAST (When voice or image completes) */}
      {state === 'result' && resultData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md bg-[#121820] border rounded-2xl p-5 shadow-2xl space-y-4 ${
            resultData.hasDetails ? 'border-emerald-500/50' : 'border-amber-500/50'
          }`}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[#2a3644] pb-3">
              <div className="flex items-center gap-2.5">
                {resultData.hasDetails ? (
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-white text-base">
                    {resultData.hasDetails
                      ? `${resultData.type === 'voice' ? 'Voice' : 'Image'} Details Added!`
                      : `${resultData.type === 'voice' ? 'Voice has no details' : 'Image has no details'}`}
                  </h3>
                  <span className={`font-mono text-[11px] ${
                    resultData.hasDetails ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {resultData.hasDetails
                      ? `SUCCESSFULLY INSERTED ${resultData.insertedCount} RECORD(S)`
                      : 'NO WELLBEING METRICS IDENTIFIED'}
                  </span>
                </div>
              </div>

              <button
                onClick={closeResult}
                className="p-1.5 text-[#8a99ad] hover:text-white hover:bg-[#1a232e] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Explanation / AI Reason */}
            {resultData.reason && (
              <div className="bg-[#1a232e] p-3 rounded-xl border border-[#2a3644] font-mono text-xs">
                <span className="text-[10px] text-[#8a99ad] block mb-1">AI EVALUATION:</span>
                <p className={resultData.hasDetails ? 'text-[#06b6d4]' : 'text-amber-300'}>
                  {resultData.reason}
                </p>
              </div>
            )}

            {/* Transcribed Audio or OCR Preview */}
            {resultData.transcribedText && (
              <div className="bg-[#1a232e] p-3 rounded-xl border border-[#2a3644] space-y-1">
                <span className="font-mono text-[10px] text-[#8a99ad] block">TRANSCRIBED SPEECH:</span>
                <p className="text-white text-xs italic leading-relaxed">
                  "{resultData.transcribedText}"
                </p>
              </div>
            )}

            {resultData.ocrText && (
              <div className="bg-[#1a232e] p-3 rounded-xl border border-[#2a3644] space-y-1">
                <span className="font-mono text-[10px] text-[#8a99ad] block">EXTRACTED OCR TEXT:</span>
                <pre className="text-[#38bdf8] font-mono text-[11px] max-h-24 overflow-y-auto whitespace-pre-wrap">
                  {resultData.ocrText}
                </pre>
              </div>
            )}

            {/* If details were added: show records and recalculated scores */}
            {resultData.hasDetails && (
              <>
                {resultData.records.length > 0 && (
                  <div className="space-y-1.5 font-mono text-xs">
                    <span className="text-[10px] text-[#8a99ad] block">PERSISTED TO FRAPPE:</span>
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {resultData.records.map((r, i) => (
                        <div key={i} className="flex justify-between items-center bg-[#1a232e] p-2 rounded-lg border border-[#2a3644]">
                          <span className="text-white font-bold">{r.doctype || r.domain || 'Record'}</span>
                          <span className="text-[10px] text-[#06b6d4]">
                            {r.data?.record_date || r.data?.transaction_date || r.data?.date || 'Today'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {resultData.scores && (
                  <div className="space-y-1.5 font-mono text-xs">
                    <span className="text-[10px] text-[#8a99ad] block flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#f43f5e]" /> UPDATED SCORES:
                    </span>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {(() => {
                        const s = Object.values(resultData.scores)[0] || resultData.scores;
                        return (
                          <>
                            <div className="bg-[#1a232e] p-2 rounded-xl border border-rose-500/30">
                              <span className="text-[9px] text-[#8a99ad] block">OVERALL</span>
                              <span className="text-sm font-bold text-[#f43f5e]">{Math.round(s.overall_score || 0)}%</span>
                            </div>
                            <div className="bg-[#1a232e] p-2 rounded-xl border border-emerald-500/30">
                              <span className="text-[9px] text-[#8a99ad] block flex items-center justify-center gap-0.5">
                                <Activity className="w-2.5 h-2.5" /> HEALTH
                              </span>
                              <span className="text-sm font-bold text-emerald-400">{Math.round(s.health_score || 0)}%</span>
                            </div>
                            <div className="bg-[#1a232e] p-2 rounded-xl border border-cyan-500/30">
                              <span className="text-[9px] text-[#8a99ad] block flex items-center justify-center gap-0.5">
                                <DollarSign className="w-2.5 h-2.5" /> FIN
                              </span>
                              <span className="text-sm font-bold text-cyan-400">{Math.round(s.financial_score || 0)}%</span>
                            </div>
                            <div className="bg-[#1a232e] p-2 rounded-xl border border-purple-500/30">
                              <span className="text-[9px] text-[#8a99ad] block flex items-center justify-center gap-0.5">
                                <Users className="w-2.5 h-2.5" /> SOC
                              </span>
                              <span className="text-sm font-bold text-purple-400">{Math.round(s.social_score || 0)}%</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Error Message if any */}
            {errorMessage && (
              <p className="text-red-400 font-mono text-xs">{errorMessage}</p>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-[#2a3644]">
              {!resultData.hasDetails && resultData.type === 'voice' && (
                <button
                  onClick={startDirectVoiceRecording}
                  className="px-3 py-1.5 bg-[#1a232e] hover:bg-[#2a3644] text-[#06b6d4] font-mono text-xs rounded-xl transition-colors cursor-pointer"
                >
                  TRY RECORDING AGAIN
                </button>
              )}
              <button
                onClick={closeResult}
                className="px-4 py-2 bg-gradient-to-r from-[#f43f5e] to-[#a855f7] text-white font-mono text-xs font-bold rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                GOT IT
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default FloatingQuickCapture;
