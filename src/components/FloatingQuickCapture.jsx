import { useState, useRef, useEffect } from 'react';
import { aiService } from '../services/aiService';
import { CameraChoiceModal } from './CameraChoiceModal';
import { LiveCameraCapture } from './LiveCameraCapture';
import {
  Mic,
  Camera,
  Square,
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Activity,
  DollarSign,
  Users
} from 'lucide-react';

function getOptimalAudioConfig() {
  if (typeof MediaRecorder === 'undefined') {
    return { mimeType: '', ext: 'webm' };
  }

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;

  if (isIOS) {
    if (MediaRecorder.isTypeSupported('audio/mp4')) return { mimeType: 'audio/mp4', ext: 'mp4' };
    if (MediaRecorder.isTypeSupported('audio/aac')) return { mimeType: 'audio/aac', ext: 'm4a' };
    return { mimeType: '', ext: 'mp4' };
  }

  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return { mimeType: 'audio/webm;codecs=opus', ext: 'webm' };
  if (MediaRecorder.isTypeSupported('audio/webm')) return { mimeType: 'audio/webm', ext: 'webm' };
  if (MediaRecorder.isTypeSupported('audio/mp4')) return { mimeType: 'audio/mp4', ext: 'mp4' };
  if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) return { mimeType: 'audio/ogg;codecs=opus', ext: 'ogg' };

  return { mimeType: '', ext: 'webm' };
}

export function FloatingQuickCapture({ mode = 'floating' }) {
  const [state, setState] = useState('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('');
  const [resultData, setResultData] = useState(null);
  const [, setErrorMessage] = useState('');
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const activeExtRef = useRef('webm');

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startDirectVoiceRecording = async () => {
    setErrorMessage('');
    setResultData(null);
    audioChunksRef.current = [];

    const hasMediaDevices = typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function';

    if (!hasMediaDevices) {
      if (audioInputRef.current) {
        audioInputRef.current.click();
        window.dispatchEvent(
          new CustomEvent('wellpro:toast', {
            detail: {
              type: 'info',
              title: 'Voice Audio Selection',
              message: 'Microphone requires HTTPS or localhost. Choose an audio recording to process.'
            }
          })
        );
        return;
      }
    }

    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const { mimeType, ext } = getOptimalAudioConfig();
      activeExtRef.current = ext;

      const options = mimeType ? { mimeType } : undefined;
      let recorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch {
        recorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const actualType = recorder.mimeType || mimeType || (ext === 'mp4' ? 'audio/mp4' : 'audio/webm');
        const audioBlob = new Blob(audioChunksRef.current, { type: actualType });
        stream.getTracks().forEach((track) => track.stop());

        const filename = `quick_voice_${Date.now()}.${activeExtRef.current}`;
        await handleProcessVoice(audioBlob, filename);
      };

      recorder.start(250);
      setState('recording');
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone start error:', err);
      if (audioInputRef.current) {
        audioInputRef.current.click();
        return;
      }

      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Microphone permission denied. Please allow microphone access in browser settings.'
          : 'Microphone unavailable: ' + err.message
      );
      setState('result');
      setResultData({ hasDetails: false, reason: 'Microphone permission or hardware error' });
    }
  };

  const handleAudioFileInput = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await handleProcessVoice(file, file.name);
  };

  const stopRecordingAndProcess = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      setState('processing');
      setProcessingMessage('Whisper is transcribing voice & extracting wellbeing records...');
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    setState('idle');
    setRecordingSeconds(0);
    audioChunksRef.current = [];
  };

  const handleProcessVoice = async (audioBlob, customFilename = 'voice.webm') => {
    setState('processing');
    setProcessingMessage('Processing voice recording...');

    try {
      const res = await aiService.processAudio(audioBlob, customFilename);

      if (res._offline_pending || res.status === 'queued') {
        setResultData({
          type: 'voice',
          hasDetails: true,
          isOffline: true,
          reason: res.message || 'Voice recording saved locally in IndexedDB. Will transcribe and sync automatically once connected.',
          records: [],
          scores: null,
          insertedCount: 1
        });
        window.dispatchEvent(new CustomEvent('wellpro:record_created'));
        return;
      }

      const hasExtractedRecords = Array.isArray(res.extracted_records) && res.extracted_records.length > 0;
      const isRelevant = res.is_relevant === true || hasExtractedRecords;

      setResultData({
        type: 'voice',
        hasDetails: isRelevant && hasExtractedRecords,
        reason: res.reason || (isRelevant ? 'Details successfully extracted' : 'No personal wellbeing data identified in speech'),
        transcribedText: res.transcribed_english_text,
        records: res.extracted_records || [],
        scores: res.recalculated_scores || res.recalculated_score || null,
        insertedCount: res.inserted_count || (hasExtractedRecords ? res.extracted_records.length : 0)
      });

      if (isRelevant && hasExtractedRecords) {
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

  const handleDirectImageClick = () => {
    setIsChoiceModalOpen(true);
  };

  const handleSelectCamera = () => {
    setIsChoiceModalOpen(false);
    const hasMediaDevices = typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function';
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

    if (hasMediaDevices && isDesktop) {
      setIsLiveCameraOpen(true);
    } else if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const processCapturedImageFile = async (file) => {
    if (!file) return;

    setState('processing');
    setProcessingMessage(`Processing ${file.name}...`);

    try {
      const res = await aiService.processImage(file, file.name);

      if (res._offline_pending || res.status === 'queued') {
        setResultData({
          type: 'image',
          hasDetails: true,
          isOffline: true,
          reason: res.message || 'Image saved locally in IndexedDB. Vision OCR will run automatically once connected.',
          records: [],
          scores: null,
          insertedCount: 1
        });
        window.dispatchEvent(new CustomEvent('wellpro:record_created'));
        return;
      }

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

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await processCapturedImageFile(file);
  };

  const closeResult = () => {
    setState('idle');
    setResultData(null);
    setErrorMessage('');
  };

  // If in header mode, render only trigger buttons and hidden inputs/modals
  if (mode === 'header') {
    return (
      <div className="flex items-center gap-1.5">
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          onChange={handleAudioFileInput}
          className="hidden"
        />

        <button
          onClick={handleDirectImageClick}
          className="p-2 rounded-lg bg-[#1a232e] border border-[#06b6d4]/40 text-[#06b6d4] hover:text-white hover:bg-[#2a3644] transition-all cursor-pointer active:scale-95"
          title="Photo / Document OCR"
          aria-label="Camera"
        >
          <Camera className="w-4 h-4" />
        </button>

        <button
          onClick={startDirectVoiceRecording}
          className="p-2 rounded-lg bg-gradient-to-tr from-[#f43f5e] to-[#a855f7] text-white shadow-md shadow-rose-500/20 hover:opacity-95 transition-all cursor-pointer active:scale-95"
          title="Record Voice"
          aria-label="Record Voice"
        >
          <Mic className="w-4 h-4" />
        </button>

        <CameraChoiceModal
          isOpen={isChoiceModalOpen}
          onClose={() => setIsChoiceModalOpen(false)}
          onSelectCamera={handleSelectCamera}
          onSelectFile={() => fileInputRef.current?.click()}
        />

        <LiveCameraCapture
          isOpen={isLiveCameraOpen}
          onClose={() => setIsLiveCameraOpen(false)}
          onCapture={processCapturedImageFile}
        />

        {/* Floating Timer / Recording Bar for Mobile Header Triggers */}
        {state === 'recording' && (
          <div className="fixed top-16 right-4 z-50 bg-[#121820]/95 backdrop-blur-xl border border-rose-500/60 rounded-2xl p-3 shadow-2xl shadow-rose-500/20 flex items-center gap-3 animate-in fade-in">
            <div className="flex items-center gap-2 pl-1">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500" />
              </span>
              <span className="font-mono text-xs font-bold text-white tracking-wider">
                {formatTimer(recordingSeconds)}
              </span>
            </div>

            <button
              onClick={stopRecordingAndProcess}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#f43f5e] to-[#a855f7] hover:opacity-95 text-white font-mono text-xs font-bold rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>FINISH</span>
            </button>

            <button
              onClick={cancelRecording}
              className="p-1.5 text-[#8a99ad] hover:text-white hover:bg-[#2a3644] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Processing State Bar */}
        {state === 'processing' && (
          <div className="fixed top-16 right-4 z-50 bg-[#121820]/95 backdrop-blur-xl border border-[#06b6d4]/50 rounded-2xl p-3 shadow-2xl flex items-center gap-3 animate-in fade-in">
            <RefreshCw className="w-4 h-4 text-[#06b6d4] animate-spin shrink-0" />
            <span className="font-mono text-xs text-white truncate max-w-xs">
              {processingMessage}
            </span>
          </div>
        )}

        {/* Result Confirmation Modal */}
        {state === 'result' && resultData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className={`w-full max-w-md bg-[#121820] border rounded-2xl p-5 shadow-2xl space-y-4 ${resultData.hasDetails ? 'border-emerald-500/50' : 'border-amber-500/50'
              }`}>
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
                      {resultData.isOffline
                        ? `${resultData.type === 'voice' ? 'Voice' : 'Photo'} Saved Offline!`
                        : resultData.hasDetails
                        ? `${resultData.type === 'voice' ? 'Voice' : 'Image'} Details Added!`
                        : `${resultData.type === 'voice' ? 'Voice has no details' : 'Image has no details'}`}
                    </h3>
                    <span className={`font-mono text-[11px] ${
                      resultData.isOffline
                        ? 'text-[#06b6d4]'
                        : resultData.hasDetails
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}>
                      {resultData.isOffline
                        ? 'SAVED IN INDEXEDDB • QUEUED FOR AUTO-SYNC'
                        : resultData.hasDetails
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

              {resultData.reason && (
                <div className="bg-[#1a232e] p-3 rounded-xl border border-[#2a3644] font-mono text-xs">
                  <span className="text-[10px] text-[#8a99ad] block mb-1">AI EVALUATION:</span>
                  <p className={resultData.hasDetails ? 'text-[#06b6d4]' : 'text-amber-300'}>
                    {resultData.reason}
                  </p>
                </div>
              )}

              {resultData.transcribedText && (
                <div className="bg-[#1a232e] p-3 rounded-xl border border-[#2a3644] space-y-1">
                  <span className="font-mono text-[10px] text-[#8a99ad] block">TRANSCRIBED SPEECH:</span>
                  <p className="text-white text-xs italic leading-relaxed">
                    &ldquo;{resultData.transcribedText}&rdquo;
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

              {resultData.records && resultData.records.length > 0 && (
                <div className="space-y-2">
                  <span className="font-mono text-[10px] text-[#8a99ad] block">PERSISTED METRICS:</span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {resultData.records.map((rec, i) => {
                      const domain = rec.domain || rec.doctype || 'record';
                      return (
                        <div
                          key={i}
                          className="bg-[#1a232e] p-2.5 rounded-xl border border-[#2a3644] flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            {domain.toLowerCase().includes('health') && <Activity className="w-3.5 h-3.5 text-emerald-400" />}
                            {domain.toLowerCase().includes('finan') && <DollarSign className="w-3.5 h-3.5 text-cyan-400" />}
                            {domain.toLowerCase().includes('social') && <Users className="w-3.5 h-3.5 text-purple-400" />}
                            <span className="font-bold text-white capitalize">{domain}</span>
                          </div>
                          <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                            Saved
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={closeResult}
                className="w-full py-2.5 bg-[#1a232e] hover:bg-[#2a3644] text-white font-mono text-xs rounded-xl transition-colors cursor-pointer"
              >
                DISMISS
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Floating Mode for Desktop
  return (
    <>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        onChange={handleAudioFileInput}
        className="hidden"
      />

      <CameraChoiceModal
        isOpen={isChoiceModalOpen}
        onClose={() => setIsChoiceModalOpen(false)}
        onSelectCamera={handleSelectCamera}
        onSelectFile={() => fileInputRef.current?.click()}
      />

      <LiveCameraCapture
        isOpen={isLiveCameraOpen}
        onClose={() => setIsLiveCameraOpen(false)}
        onCapture={processCapturedImageFile}
      />

      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 flex flex-col items-end gap-2.5 pointer-events-auto font-sans">
        {state === 'recording' && (
          <div className="bg-[#121820]/95 backdrop-blur-xl border border-rose-500/60 rounded-2xl p-3 shadow-2xl shadow-rose-500/20 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 pl-1">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500" />
              </span>
              <span className="font-mono text-xs font-bold text-white tracking-wider">
                {formatTimer(recordingSeconds)}
              </span>
            </div>

            <button
              onClick={stopRecordingAndProcess}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#f43f5e] to-[#a855f7] hover:opacity-95 text-white font-mono text-xs font-bold rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>FINISH</span>
            </button>

            <button
              onClick={cancelRecording}
              className="p-1.5 text-[#8a99ad] hover:text-white hover:bg-[#2a3644] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {state === 'processing' && (
          <div className="bg-[#121820]/95 backdrop-blur-xl border border-[#06b6d4]/50 rounded-2xl p-3 shadow-2xl flex items-center gap-3 animate-in fade-in">
            <RefreshCw className="w-4 h-4 text-[#06b6d4] animate-spin shrink-0" />
            <span className="font-mono text-xs text-white truncate max-w-xs">
              {processingMessage}
            </span>
          </div>
        )}

        {state === 'idle' && (
          <div className="hidden md:flex items-center gap-2 bg-[#121820]/90 backdrop-blur-xl border border-[#2a3644] p-1.5 rounded-2xl shadow-2xl hover:border-[#f43f5e]/50 transition-all">
            <button
              onClick={handleDirectImageClick}
              className="group flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#1a232e] hover:bg-[#2a3644] text-[#06b6d4] hover:text-white border border-[#2a3644] transition-all cursor-pointer shadow-md active:scale-95"
            >
              <Camera className="w-4 h-4 text-[#06b6d4]" />
              <span className="font-mono text-xs font-semibold">Photo / OCR</span>
            </button>

            <button
              onClick={startDirectVoiceRecording}
              className="group flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-tr from-[#f43f5e] to-[#a855f7] text-white shadow-lg shadow-rose-500/25 hover:opacity-95 active:scale-95 transition-all cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span className="font-mono text-xs font-bold tracking-tight">Record Voice</span>
            </button>
          </div>
        )}
      </div>

      {state === 'result' && resultData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md bg-[#121820] border rounded-2xl p-5 shadow-2xl space-y-4 ${resultData.hasDetails ? 'border-emerald-500/50' : 'border-amber-500/50'
            }`}>
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
                  <span className={`font-mono text-[11px] ${resultData.hasDetails ? 'text-emerald-400' : 'text-amber-400'
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

            {resultData.reason && (
              <div className="bg-[#1a232e] p-3 rounded-xl border border-[#2a3644] font-mono text-xs">
                <span className="text-[10px] text-[#8a99ad] block mb-1">AI EVALUATION:</span>
                <p className={resultData.hasDetails ? 'text-[#06b6d4]' : 'text-amber-300'}>
                  {resultData.reason}
                </p>
              </div>
            )}

            {resultData.transcribedText && (
              <div className="bg-[#1a232e] p-3 rounded-xl border border-[#2a3644] space-y-1">
                <span className="font-mono text-[10px] text-[#8a99ad] block">TRANSCRIBED SPEECH:</span>
                <p className="text-white text-xs italic leading-relaxed">
                  &ldquo;{resultData.transcribedText}&rdquo;
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

            {resultData.records && resultData.records.length > 0 && (
              <div className="space-y-2">
                <span className="font-mono text-[10px] text-[#8a99ad] block">PERSISTED METRICS:</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {resultData.records.map((rec, i) => {
                    const domain = rec.domain || rec.doctype || 'record';
                    return (
                      <div
                        key={i}
                        className="bg-[#1a232e] p-2.5 rounded-xl border border-[#2a3644] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          {domain.toLowerCase().includes('health') && <Activity className="w-3.5 h-3.5 text-emerald-400" />}
                          {domain.toLowerCase().includes('finan') && <DollarSign className="w-3.5 h-3.5 text-cyan-400" />}
                          {domain.toLowerCase().includes('social') && <Users className="w-3.5 h-3.5 text-purple-400" />}
                          <span className="font-bold text-white capitalize">{domain}</span>
                        </div>
                        <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                          Saved
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={closeResult}
              className="w-full py-2.5 bg-[#1a232e] hover:bg-[#2a3644] text-white font-mono text-xs rounded-xl transition-colors cursor-pointer"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default FloatingQuickCapture;