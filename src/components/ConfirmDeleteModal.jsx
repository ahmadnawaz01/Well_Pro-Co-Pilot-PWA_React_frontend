import { useEffect } from 'react';
import { AlertTriangle, Trash2, RefreshCw, X } from 'lucide-react';

export function ConfirmDeleteModal({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone. The selected item will be permanently removed.',
  confirmLabel = 'Delete Permanently',
  cancelLabel = 'Cancel',
  isDanger = true,
  loading = false,
  onConfirm,
  onClose
}) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div
        className={`w-full max-w-sm bg-[#121820] border ${
          isDanger ? 'border-red-500/40' : 'border-amber-500/40'
        } rounded-3xl p-6 shadow-2xl space-y-4 transform transition-all animate-in zoom-in-95 duration-200 relative`}
      >
        {/* Close X */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 text-[#8a99ad] hover:text-white rounded-lg hover:bg-[#1a232e] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Animated Warning Icon with Glow */}
        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
          <div
            className={`absolute inset-0 rounded-2xl ${
              isDanger ? 'bg-red-500/20 animate-ping' : 'bg-amber-500/20 animate-ping'
            } opacity-50`}
          />
          <div
            className={`w-14 h-14 rounded-2xl ${
              isDanger
                ? 'bg-gradient-to-tr from-red-600 to-rose-600 shadow-rose-500/30'
                : 'bg-gradient-to-tr from-amber-600 to-yellow-600 shadow-amber-500/30'
            } shadow-xl flex items-center justify-center text-white`}
          >
            {isDanger ? (
              <Trash2 className="w-7 h-7 animate-bounce" />
            ) : (
              <AlertTriangle className="w-7 h-7 animate-bounce" />
            )}
          </div>
        </div>

        {/* Text Details */}
        <div className="text-center space-y-1.5">
          <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
          <p className="text-xs text-[#8a99ad] leading-relaxed max-w-xs mx-auto">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 px-4 bg-[#1a232e] hover:bg-[#2a3644] text-[#8a99ad] hover:text-white font-mono text-xs font-bold rounded-xl border border-[#2a3644] transition-colors cursor-pointer disabled:opacity-40"
          >
            {cancelLabel}
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 px-4 ${
              isDanger
                ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:opacity-90 shadow-red-600/30'
                : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-90 shadow-amber-600/30'
            } text-white font-mono text-xs font-bold rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>PROCESSING...</span>
              </>
            ) : (
              <span>{confirmLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDeleteModal;

