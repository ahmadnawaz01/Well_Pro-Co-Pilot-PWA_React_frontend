import { Camera, Image as ImageIcon, X } from 'lucide-react';

export function CameraChoiceModal({ isOpen, onClose, onSelectCamera, onSelectFile }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div className="w-full max-w-sm bg-[#121820] border border-[#2a3644] rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-[#8a99ad] hover:text-white rounded-lg hover:bg-[#1a232e] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#f43f5e] to-[#a855f7] flex items-center justify-center text-white mx-auto shadow-lg shadow-rose-500/20 mb-2">
            <Camera className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">Capture or Upload</h3>
          <p className="text-xs text-[#8a99ad]">
            How would you like to provide the document or photo?
          </p>
        </div>

        {/* Options */}
        <div className="space-y-2.5">
          {/* Option 1: Open Camera */}
          <button
            onClick={() => {
              onClose();
              onSelectCamera();
            }}
            className="w-full flex items-center gap-3.5 p-3.5 bg-[#1a232e] hover:bg-[#2a3644] border border-[#2a3644] hover:border-[#f43f5e] rounded-2xl text-left transition-all group cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[#f43f5e] to-[#a855f7] text-white shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block">Take Photo with Camera</span>
              <span className="text-[11px] text-[#8a99ad]">Directly snap receipt, food, or workout sheet</span>
            </div>
          </button>

          {/* Option 2: Choose from Gallery / Files */}
          <button
            onClick={() => {
              onClose();
              onSelectFile();
            }}
            className="w-full flex items-center gap-3.5 p-3.5 bg-[#1a232e] hover:bg-[#2a3644] border border-[#2a3644] hover:border-[#06b6d4] rounded-2xl text-left transition-all group cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-[#06b6d4]/20 border border-[#06b6d4]/30 text-[#06b6d4] group-hover:scale-105 transition-transform">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block">Choose from Gallery / Files</span>
              <span className="text-[11px] text-[#8a99ad]">Select existing PNG, JPG, or PDF document</span>
            </div>
          </button>
        </div>

        {/* Cancel */}
        <button
          onClick={onClose}
          className="w-full py-2 text-[#8a99ad] hover:text-white font-mono text-xs rounded-xl hover:bg-[#1a232e] transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default CameraChoiceModal;

