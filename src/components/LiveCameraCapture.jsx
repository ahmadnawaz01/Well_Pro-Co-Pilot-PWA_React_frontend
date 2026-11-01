import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, RefreshCw, AlertCircle, UploadCloud } from 'lucide-react';

export function LiveCameraCapture({ isOpen, onClose, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const [error, setError] = useState('');
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' or 'user'
  const [hasCamera, setHasCamera] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setError('');
    stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Live camera requires HTTPS or localhost in your browser. You can still select or snap a photo using the file picker below.');
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((e) => console.warn('Video play warning:', e));
        };
      }
      setHasCamera(true);
    } catch (err) {
      console.warn('Camera stream error, trying fallback:', err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch((e) => console.warn('Video play warning:', e));
          };
        }
        setHasCamera(true);
      } catch (fallbackErr) {
        const msg = fallbackErr.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in browser settings.'
          : 'Camera device unavailable: ' + (fallbackErr.message || err.message);
        setError(msg);
        setHasCamera(false);
      }
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  const handleSnap = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `camera_snap_${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapture(file);
          stopCamera();
          onClose();
        }
      },
      'image/jpeg',
      0.92
    );
  };

  const handleManualFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onCapture(file);
      stopCamera();
      onClose();
    }
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleManualFileInput}
        className="hidden"
      />

      <div className="relative w-full max-w-lg bg-[#121820] border border-[#2a3644] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2a3644]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-[#f43f5e] to-[#a855f7] text-white">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Live Camera Viewfinder</h3>
              <p className="font-mono text-[10px] text-[#06b6d4]">WELLPRO VISION OCR</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8a99ad] hover:text-white rounded-xl hover:bg-[#1a232e] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewfinder */}
        <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-6 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
              <p className="text-xs text-rose-300 max-w-sm">{error}</p>
              <div className="flex gap-2 justify-center pt-2">
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3.5 py-2 bg-[#1a232e] hover:bg-[#2a3644] text-white text-xs font-mono rounded-xl cursor-pointer"
                >
                  Retry Camera
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-[#f43f5e] to-[#a855f7] text-white text-xs font-mono font-bold rounded-xl cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Choose Photo File</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Aiming Reticle Overlay */}
              <div className="absolute inset-8 border border-white/25 rounded-2xl pointer-events-none flex items-center justify-center">
                <span className="font-mono text-[11px] text-white/70 bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
                  Align receipt or document within frame
                </span>
              </div>
            </>
          )}
        </div>

        {/* Camera Controls */}
        <div className="p-4 bg-[#121820] border-t border-[#2a3644] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={switchCamera}
            className="p-3 bg-[#1a232e] hover:bg-[#2a3644] text-[#8a99ad] hover:text-white rounded-2xl transition-colors cursor-pointer"
            title="Switch Front / Rear Camera"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          <button
            type="button"
            disabled={!hasCamera || !!error}
            onClick={handleSnap}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#f43f5e] to-[#a855f7] hover:opacity-90 disabled:opacity-40 text-white font-mono text-xs font-bold rounded-2xl shadow-lg shadow-rose-500/20 active:scale-98 transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>SNAP PHOTO</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 bg-[#1a232e] hover:bg-[#2a3644] text-[#8a99ad] font-mono text-xs rounded-2xl transition-colors cursor-pointer"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}

export default LiveCameraCapture;
