import { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export function ToastNotification() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (e) => {
      const detail = e.detail || {};
      const id = Date.now() + Math.random().toString(36).substring(2, 5);
      const newToast = {
        id,
        type: detail.type || 'info', // 'success' | 'error' | 'warning' | 'info'
        title: detail.title || '',
        message: detail.message || (typeof detail === 'string' ? detail : '')
      };

      setToasts((prev) => [...prev, newToast]);

      // Auto dismiss after 4.5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    };

    window.addEventListener('wellpro:toast', handleToast);
    return () => window.removeEventListener('wellpro:toast', handleToast);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-auto max-w-sm w-full px-4 font-sans">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`w-full bg-[#121820]/95 backdrop-blur-xl border rounded-2xl p-3.5 shadow-2xl flex items-start gap-3 animate-in slide-in-from-top-3 fade-in duration-200 ${
              isSuccess
                ? 'border-emerald-500/50 shadow-emerald-500/10'
                : isError
                ? 'border-red-500/50 shadow-red-500/10'
                : isWarning
                ? 'border-amber-500/50 shadow-amber-500/10'
                : 'border-cyan-500/50 shadow-cyan-500/10'
            }`}
          >
            {/* Icon */}
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {isError && <AlertCircle className="w-5 h-5 text-red-400" />}
              {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-[#06b6d4]" />}
            </div>

            {/* Content */}
            <div className="flex-1 space-y-0.5">
              {toast.title && (
                <h4 className="font-bold text-white text-xs tracking-tight">{toast.title}</h4>
              )}
              <p className="text-xs text-[#f0f4f8] leading-relaxed font-sans">{toast.message}</p>
            </div>

            {/* Close */}
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#8a99ad] hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastNotification;

