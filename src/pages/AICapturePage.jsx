import { useState, useRef, useEffect } from 'react';
import { aiService } from '../services/aiService';
import {
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  Mic,
  MicOff,
  Image as ImageIcon,
  FileText,
  UploadCloud,
  Trash2,
  Square,
  Paperclip,
  Activity,
  DollarSign,
  Users
} from 'lucide-react';

const QUICK_PROMPTS = [
  {
    title: 'Daily Health & Sleep',
    text: 'Slept 7.8 hours, felt well rested. Walked 10,200 steps and drank 2.5L water today.'
  },
  {
    title: 'Lunch & Coffee Spend',
    text: 'Spent $14.50 on a healthy chicken salad for lunch, and $4.25 on an oat latte with card.'
  },
  {
    title: 'Evening Social Dinner',
    text: 'Had dinner with my friend Sarah for 90 minutes. Meaningful conversation, mood 5/5, felt deeply connected.'
  },
  {
    title: 'Workout & Fitness Session',
    text: 'Completed a 45-minute gym strength workout, 400 calories burned, high intensity.'
  }
];

export function AICapturePage({ onRecordCreated }) {
  // Modes: 'text' | 'voice' | 'image'
  const [activeTab, setActiveTab] = useState('text');

  // Text Mode State
  const [inputText, setInputText] = useState('');

  // Voice Mode State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioInputRef = useRef(null);

  // Image / Document Mode State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Common Submission State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [processedType, setProcessedType] = useState(null);

  // Clean up audio & preview object URLs
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [audioUrl, previewUrl]);

  // Voice Recording Handlers
  const startRecording = async () => {
    setError('');
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioFile(null);
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

      recorder.onstop = () => {
        const finalBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(finalBlob);
        setAudioUrl(URL.createObjectURL(finalBlob));
        // Stop audio tracks so the mic is released
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(200); // 200ms slice
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setError('Microphone access denied or unsupported: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleAudioFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      setAudioBlob(null);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(URL.createObjectURL(file));
      setError('');
    }
  };

  const clearAudio = () => {
    if (isRecording) stopRecording();
    setAudioBlob(null);
    setAudioFile(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingSeconds(0);
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  // Image / Document Handlers
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
      if (previewUrl) URL.revokeObjectURL(previewUrl);

      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Submission Processors
  const handleSubmitText = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await aiService.processText(inputText);
      setResult(res);
      setProcessedType('text');
      setInputText('');
      if (onRecordCreated) onRecordCreated();
    } catch (err) {
      setError(err.message || 'Failed to process text input');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitVoice = async () => {
    const payload = audioBlob || audioFile;
    if (!payload) {
      setError('Please record audio or upload an audio file first');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const filename = audioFile ? audioFile.name : 'voice_recording.webm';
      const res = await aiService.processAudio(payload, filename);
      setResult(res);
      setProcessedType('voice');
      clearAudio();
      if (onRecordCreated) onRecordCreated();
    } catch (err) {
      setError(err.message || 'Failed to transcribe and ingest voice audio');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFile = async () => {
    if (!selectedFile) {
      setError('Please select an image or document file');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await aiService.processImage(selectedFile, selectedFile.name);
      setResult(res);
      setProcessedType('image');
      clearFile();
      if (onRecordCreated) onRecordCreated();
    } catch (err) {
      setError(err.message || 'Failed to extract and ingest document OCR');
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 font-sans max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#121820] to-[#1a232e] border border-[#2a3644] rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-gradient-to-tr from-[#f43f5e] to-[#a855f7] rounded-xl text-white shadow-lg shadow-rose-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">AI Multimodal Ingestion</h2>
            <span className="font-mono text-xs text-[#06b6d4]">
              FASTAPI AI ENGINE &middot; TEXT &middot; VOICE &middot; DOCUMENT OCR
            </span>
          </div>
        </div>
        <p className="text-xs text-[#8a99ad] leading-relaxed">
          Log your life via raw text, voice voice-notes, or document and receipt photos. The AI model extracts structured Health, Financial, and Social records, updates Frappe securely, and recalculates your wellbeing scores in real time.
        </p>
      </div>

      {/* Multimodal Tab Switcher */}
      <div className="flex bg-[#121820] p-1.5 rounded-2xl border border-[#2a3644] font-mono text-xs gap-1.5">
        <button
          onClick={() => { setActiveTab('text'); setError(''); }}
          className={`flex-1 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'text'
              ? 'bg-gradient-to-r from-[#f43f5e] to-[#a855f7] text-white shadow-lg shadow-rose-500/20'
              : 'text-[#8a99ad] hover:text-white hover:bg-[#1a232e]'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>RAW TEXT</span>
        </button>

        <button
          onClick={() => { setActiveTab('voice'); setError(''); }}
          className={`flex-1 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'voice'
              ? 'bg-gradient-to-r from-[#f43f5e] to-[#a855f7] text-white shadow-lg shadow-rose-500/20'
              : 'text-[#8a99ad] hover:text-white hover:bg-[#1a232e]'
          }`}
        >
          <Mic className="w-4 h-4" />
          <span>VOICE / AUDIO</span>
        </button>

        <button
          onClick={() => { setActiveTab('image'); setError(''); }}
          className={`flex-1 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'image'
              ? 'bg-gradient-to-r from-[#f43f5e] to-[#a855f7] text-white shadow-lg shadow-rose-500/20'
              : 'text-[#8a99ad] hover:text-white hover:bg-[#1a232e]'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>IMAGE / OCR</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-950/80 border border-red-500/50 text-red-200 p-3 rounded-xl font-mono text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: RAW TEXT INGESTION */}
      {activeTab === 'text' && (
        <div className="bg-[#121820] border border-[#2a3644] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#06b6d4]">
              ENDPOINT: POST /api/v1/ingest/process-text
            </span>
            <span className="font-mono text-[10px] text-[#8a99ad]">GEMINI 2.5 FLASH REASONING</span>
          </div>

          <div className="relative">
            <textarea
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g. Slept 8 hours, walked 9,500 steps today, spent $12 on lunch with colleague Alex, and feel calm and energized..."
              className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-3.5 rounded-xl font-sans text-sm focus:outline-none focus:border-[#f43f5e] resize-none leading-relaxed transition-colors"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex flex-wrap gap-1.5">
              <span className="font-mono text-[10px] text-[#8a99ad] mr-1 self-center">EXAMPLES:</span>
              {QUICK_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputText(p.text)}
                  className="bg-[#1a232e] hover:bg-[#2a3644] border border-[#2a3644] text-[#06b6d4] px-2.5 py-1 rounded-lg font-mono text-[10px] transition-colors cursor-pointer"
                >
                  {p.title}
                </button>
              ))}
            </div>

            <button
              onClick={handleSubmitText}
              disabled={loading || !inputText.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#f43f5e] to-[#a855f7] hover:opacity-95 text-white font-mono text-xs font-bold rounded-xl shadow-lg shadow-rose-500/20 active:scale-95 transition-all disabled:opacity-40 cursor-pointer self-end sm:self-auto"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>ANALYZING & INGESTING...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>PROCESS TEXT</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: VOICE / AUDIO INGESTION */}
      {activeTab === 'voice' && (
        <div className="bg-[#121820] border border-[#2a3644] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#06b6d4]">
              ENDPOINT: POST /api/v1/ingest/process-audio
            </span>
            <span className="font-mono text-[10px] text-[#8a99ad]">GROQ WHISPER LARGE-V3</span>
          </div>

          {/* Voice Recording Control Center */}
          <div className="bg-[#1a232e] border border-[#2a3644] rounded-2xl p-6 text-center space-y-4">
            {!isRecording && !audioUrl && (
              <div className="space-y-3">
                <button
                  onClick={startRecording}
                  disabled={loading}
                  className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-[#f43f5e] to-[#a855f7] flex items-center justify-center text-white shadow-xl shadow-rose-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Mic className="w-9 h-9" />
                </button>
                <div>
                  <h3 className="font-bold text-white text-base">Tap to Start Recording Voice Log</h3>
                  <p className="text-xs text-[#8a99ad] mt-1">
                    Describe your day, meals, workouts, or mood in any language. Whisper transcribes and structures it automatically.
                  </p>
                </div>
              </div>
            )}

            {isRecording && (
              <div className="space-y-4">
                <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-[#f43f5e]/30 animate-ping" />
                  <div className="w-20 h-20 rounded-full bg-[#f43f5e] flex items-center justify-center text-white shadow-xl shadow-rose-500/40">
                    <Mic className="w-9 h-9 animate-pulse" />
                  </div>
                </div>

                <div>
                  <span className="font-mono text-2xl font-bold text-white block">
                    {formatTimer(recordingSeconds)}
                  </span>
                  <span className="font-mono text-xs text-[#f43f5e] uppercase tracking-wider animate-pulse">
                    RECORDING LIVE AUDIO...
                  </span>
                </div>

                <button
                  onClick={stopRecording}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>FINISH RECORDING</span>
                </button>
              </div>
            )}

            {audioUrl && !isRecording && (
              <div className="space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <MicOff className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <span className="font-mono text-xs text-emerald-400 font-bold block">
                    AUDIO READY FOR TRANSCRIPTION
                  </span>
                  <span className="font-mono text-[11px] text-[#8a99ad]">
                    {audioFile ? audioFile.name : `Voice Recording (${formatTimer(recordingSeconds)})`}
                  </span>
                </div>

                <div className="flex justify-center">
                  <audio controls src={audioUrl} className="max-w-md w-full h-10 rounded-lg" />
                </div>

                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={clearAudio}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-4 py-2 border border-[#2a3644] hover:bg-[#2a3644] text-[#8a99ad] hover:text-white font-mono text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>DISCARD</span>
                  </button>

                  <button
                    onClick={handleSubmitVoice}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#f43f5e] to-[#a855f7] text-white font-mono text-xs font-bold rounded-xl shadow-lg shadow-rose-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>TRANSCRIBING & INGESTING...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>TRANSCRIBE & INGEST</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Or Upload Audio File */}
          <div className="flex items-center justify-between pt-2 border-t border-[#2a3644]/50">
            <span className="font-mono text-[11px] text-[#8a99ad]">Or choose an existing audio file (.mp3, .wav, .m4a, .webm):</span>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
              onChange={handleAudioFileUpload}
              className="hidden"
              id="audio-upload-input"
            />
            <label
              htmlFor="audio-upload-input"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a232e] hover:bg-[#2a3644] border border-[#2a3644] text-[#06b6d4] font-mono text-xs rounded-lg cursor-pointer transition-colors"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>UPLOAD AUDIO FILE</span>
            </label>
          </div>
        </div>
      )}

      {/* TAB 3: IMAGE & DOCUMENT OCR INGESTION */}
      {activeTab === 'image' && (
        <div className="bg-[#121820] border border-[#2a3644] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#06b6d4]">
              ENDPOINT: POST /api/v1/ingest/process-image
            </span>
            <span className="font-mono text-[10px] text-[#8a99ad]">OPENROUTER VISION & GEMINI OCR</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload-input"
          />

          {!selectedFile ? (
            <label
              htmlFor="file-upload-input"
              className="border-2 border-dashed border-[#2a3644] hover:border-[#f43f5e] rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#1a232e]/50 hover:bg-[#1a232e] group"
            >
              <div className="p-4 rounded-2xl bg-[#121820] group-hover:bg-[#f43f5e]/10 text-[#8a99ad] group-hover:text-[#f43f5e] transition-colors mb-3">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-white text-base">Select Receipt, Medical Report, or Gym Photo</h3>
              <p className="text-xs text-[#8a99ad] mt-1 max-w-sm">
                Supports PNG, JPG, WEBP, or PDF documents. The Vision AI will extract dates, amounts, exercises, and health metrics.
              </p>
              <span className="mt-4 font-mono text-xs text-[#06b6d4] px-3 py-1.5 rounded-lg bg-[#121820] border border-[#2a3644]">
                BROWSE FILES
              </span>
            </label>
          ) : (
            <div className="bg-[#1a232e] border border-[#2a3644] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#2a3644] pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#121820] border border-[#2a3644] text-[#06b6d4]">
                    {selectedFile.type.startsWith('image/') ? (
                      <ImageIcon className="w-5 h-5" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{selectedFile.name}</h4>
                    <span className="font-mono text-[10px] text-[#8a99ad]">
                      {(selectedFile.size / 1024).toFixed(1)} KB &middot; {selectedFile.type || 'Document'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={clearFile}
                  disabled={loading}
                  className="p-2 text-[#8a99ad] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                  title="Remove file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {previewUrl && (
                <div className="flex justify-center max-h-60 overflow-hidden rounded-xl bg-black/40 border border-[#2a3644] p-2">
                  <img src={previewUrl} alt="Preview" className="max-h-56 object-contain rounded-lg" />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={clearFile}
                  disabled={loading}
                  className="px-4 py-2 border border-[#2a3644] hover:bg-[#2a3644] text-[#8a99ad] font-mono text-xs rounded-xl transition-colors cursor-pointer"
                >
                  CANCEL
                </button>

                <button
                  onClick={handleSubmitFile}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#f43f5e] to-[#a855f7] text-white font-mono text-xs font-bold rounded-xl shadow-lg shadow-rose-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>PERFORMING OCR & INGESTION...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>EXTRACT OCR & INGEST</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Multimodal Results Output Card */}
      {result && (() => {
        const hasRecords = Array.isArray(result.extracted_records) && result.extracted_records.length > 0;
        const hasDetails = result.is_relevant !== false && hasRecords;

        return (
          <div className={`bg-[#121820] border rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in ${
            hasDetails ? 'border-emerald-500/40' : 'border-amber-500/40'
          }`}>
            {/* Header Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2a3644] pb-3">
              <div className="flex items-center gap-2.5">
                {hasDetails ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                )}
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {hasDetails
                      ? `${processedType === 'voice' ? 'Voice' : processedType === 'image' ? 'Image' : 'Text'} Details Successfully Added`
                      : `${processedType === 'voice' ? 'Voice has no details' : processedType === 'image' ? 'Image has no details' : 'Text has no details'}`}
                  </h3>
                  <span className={`font-mono text-[10px] ${hasDetails ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {hasDetails
                      ? `INSERTED ${result.extracted_records?.length || 1} RECORD(S) TO FRAPPE`
                      : 'NO RELEVANT WELLBEING DATA IDENTIFIED'}
                  </span>
                </div>
              </div>

              <span className={`self-start sm:self-auto font-mono text-[10px] px-2.5 py-1 rounded-full border ${
                hasDetails
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                {hasDetails ? 'DETAILS EXTRACTED' : 'NO DETAILS FOUND'}
              </span>
            </div>

          {/* Reason Explanation */}
          {result.reason && (
            <div className="bg-[#1a232e] p-3 rounded-xl border border-[#2a3644] font-mono text-xs">
              <span className="text-[10px] text-[#8a99ad] block mb-1">AI CLASSIFICATION REASON:</span>
              <p className="text-[#06b6d4]">{result.reason}</p>
            </div>
          )}

          {/* Transcribed Text (from Voice) */}
          {result.transcribed_english_text && (
            <div className="bg-[#1a232e] p-3.5 rounded-xl border border-[#2a3644] space-y-1">
              <span className="font-mono text-[10px] text-[#8a99ad] block">
                WHISPER TRANSCRIBED ENGLISH TEXT:
              </span>
              <p className="text-white text-xs leading-relaxed italic">
                "{result.transcribed_english_text}"
              </p>
            </div>
          )}

          {/* Extracted OCR Text (from Image/Doc) */}
          {result.extracted_ocr_text && (
            <div className="bg-[#1a232e] p-3.5 rounded-xl border border-[#2a3644] space-y-1">
              <span className="font-mono text-[10px] text-[#8a99ad] block">
                EXTRACTED OCR TEXT FROM DOCUMENT / IMAGE:
              </span>
              <pre className="text-[#38bdf8] font-mono text-[11px] whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
                {result.extracted_ocr_text}
              </pre>
            </div>
          )}

          {/* Extracted Records Display */}
          {result.extracted_records && result.extracted_records.length > 0 && (
            <div className="space-y-2">
              <span className="font-mono text-[10px] text-[#8a99ad] block">
                EXTRACTED STRUCTURED RECORDS ({result.extracted_records.length}):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {result.extracted_records.map((rec, i) => {
                  const doctype = rec.doctype || rec.domain || 'Record';
                  const data = rec.data || rec.record_data || rec;
                  return (
                    <div key={i} className="bg-[#1a232e] p-3 rounded-xl border border-[#2a3644] space-y-1.5 font-mono text-xs">
                      <div className="flex items-center justify-between border-b border-[#2a3644]/50 pb-1">
                        <span className="text-[#f43f5e] font-bold">{doctype}</span>
                        <span className="text-[10px] text-[#8a99ad]">
                          {data.record_date || data.transaction_date || data.snapshot_date || data.date || 'Today'}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#f0f4f8] space-y-0.5 max-h-24 overflow-y-auto">
                        {Object.entries(data)
                          .filter(([k]) => !['doctype', 'user', 'owner', 'name'].includes(k))
                          .slice(0, 5)
                          .map(([k, v]) => (
                            <div key={k} className="flex justify-between text-[10px]">
                              <span className="text-[#8a99ad]">{k}:</span>
                              <span className="text-white font-medium truncate ml-2">
                                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Immediate Recalculated Scores */}
          {(result.recalculated_scores || result.recalculated_score) && (
            <div className="space-y-2">
              <span className="font-mono text-[10px] text-[#8a99ad] block">
                IMMEDIATE RECALCULATED SCORES:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                {(() => {
                  const raw = result.recalculated_score || Object.values(result.recalculated_scores || {})[0] || {};
                  return (
                    <>
                      <div className="bg-[#1a232e] p-2.5 rounded-xl border border-rose-500/30">
                        <span className="text-[9px] text-[#8a99ad] block flex items-center gap-1">
                          OVERALL
                        </span>
                        <span className="text-lg font-bold text-[#f43f5e]">{Math.round(raw.overall_score || 0)}%</span>
                      </div>
                      <div className="bg-[#1a232e] p-2.5 rounded-xl border border-emerald-500/30">
                        <span className="text-[9px] text-[#8a99ad] block flex items-center gap-1">
                          <Activity className="w-2.5 h-2.5 text-emerald-400" /> HEALTH
                        </span>
                        <span className="text-lg font-bold text-emerald-400">{Math.round(raw.health_score || 0)}%</span>
                      </div>
                      <div className="bg-[#1a232e] p-2.5 rounded-xl border border-cyan-500/30">
                        <span className="text-[9px] text-[#8a99ad] block flex items-center gap-1">
                          <DollarSign className="w-2.5 h-2.5 text-cyan-400" /> FINANCE
                        </span>
                        <span className="text-lg font-bold text-cyan-400">{Math.round(raw.financial_score || 0)}%</span>
                      </div>
                      <div className="bg-[#1a232e] p-2.5 rounded-xl border border-purple-500/30">
                        <span className="text-[9px] text-[#8a99ad] block flex items-center gap-1">
                          <Users className="w-2.5 h-2.5 text-purple-400" /> SOCIAL
                        </span>
                        <span className="text-lg font-bold text-purple-400">{Math.round(raw.social_score || 0)}%</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setResult(null)}
              className="px-4 py-1.5 bg-[#1a232e] hover:bg-[#2a3644] text-[#8a99ad] hover:text-white font-mono text-xs rounded-lg transition-colors cursor-pointer"
            >
              LOG ANOTHER ENTRY
            </button>
          </div>
        </div>
        );
      })()}
    </div>
  );
}

export default AICapturePage;
