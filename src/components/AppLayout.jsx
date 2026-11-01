import { useState, useEffect } from 'react';
import { Activity, Heart, Cpu, LogOut, Sparkles, Download, Wifi, WifiOff, RefreshCw, Layers } from 'lucide-react';
import { FloatingQuickCapture } from './FloatingQuickCapture';
import { OfflineQueueModal } from './OfflineQueueModal';
import { offlineQueueService } from '../services/offlineQueueService';

export function AppLayout({ userEmail, activeTab, onTabChange, onLogout, children }) {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOnline, setIsOnline] = useState(offlineQueueService.isOnline());
  const [pendingQueueCount, setPendingQueueCount] = useState(offlineQueueService.getPendingCount());
  const [isSyncing, setIsSyncing] = useState(offlineQueueService.isSyncing());
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true)
    ) {
      setIsStandalone(true);
    }

    const handleNetwork = (e) => {
      setIsOnline(e.detail?.isOnline ?? offlineQueueService.isOnline());
    };

    const handleQueue = (e) => {
      setPendingQueueCount(e.detail?.pendingCount ?? offlineQueueService.getPendingCount());
    };

    const handleSync = (e) => {
      setIsSyncing(e.detail?.syncing ?? false);
      if (typeof e.detail?.pendingCount === 'number') {
        setPendingQueueCount(e.detail.pendingCount);
      }
    };

    window.addEventListener('wellpro:network_status', handleNetwork);
    window.addEventListener('wellpro:queue_updated', handleQueue);
    window.addEventListener('wellpro:sync_status', handleSync);

    return () => {
      window.removeEventListener('wellpro:network_status', handleNetwork);
      window.removeEventListener('wellpro:queue_updated', handleQueue);
      window.removeEventListener('wellpro:sync_status', handleSync);
    };
  }, []);

  const navItems = [
    { id: 'feed', label: 'Feed', icon: Activity, tag: '01' },
    { id: 'capture', label: 'AI Capture', icon: Sparkles, tag: '02', isPrimary: true },
    { id: 'life', label: 'My Life', icon: Heart, tag: '03' },
    { id: 'copilot', label: 'Co-Pilot', icon: Cpu, tag: '04' },
  ];

  const handleTriggerInstall = () => {
    window.dispatchEvent(new CustomEvent('wellpro:trigger_install'));
  };

  return (
    <div className="min-h-screen bg-[#090d12] text-[#f0f4f8] flex flex-col md:flex-row">
      {/* DESKTOP SIDEBAR (Visible on md and larger) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-[#2a3644] bg-[#121820]/80 backdrop-blur-xl p-5 justify-between h-screen sticky top-0 shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f43f5e] to-[#a855f7] flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight">WELLPRO</h1>
              <span className="font-mono text-[10px] text-[#06b6d4] tracking-wider block">AI CO-PILOT v2.0</span>
            </div>
          </div>

          <nav className="space-y-2 font-mono text-xs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#1a232e] border-[#f43f5e] text-[#f43f5e] shadow-lg shadow-rose-500/10'
                      : 'border-transparent text-[#8a99ad] hover:text-[#f0f4f8] hover:bg-[#1a232e]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span className="font-sans font-semibold text-sm">{item.label}</span>
                  </div>
                  <span className="text-[10px] opacity-60">[{item.tag}]</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Session Info & Install / Logout */}
        <div className="border-t border-[#2a3644] pt-4 space-y-3 font-mono text-xs">
          {/* Offline Queue Quick Action */}
          <button
            onClick={() => setIsQueueModalOpen(true)}
            className={`w-full flex items-center justify-between py-2 px-3 rounded-xl border transition-all cursor-pointer ${
              pendingQueueCount > 0
                ? 'bg-[#1a232e] border-cyan-500/40 text-[#06b6d4] hover:border-cyan-400'
                : 'bg-[#1a232e]/50 border-[#2a3644] text-[#8a99ad] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" />
              <span>Offline Queue</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              pendingQueueCount > 0 ? 'bg-cyan-500/20 text-[#06b6d4]' : 'bg-[#2a3644] text-[#8a99ad]'
            }`}>
              {pendingQueueCount}
            </span>
          </button>

          {!isStandalone && (
            <button
              onClick={handleTriggerInstall}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-[#f43f5e]/15 to-[#a855f7]/15 hover:from-[#f43f5e]/25 hover:to-[#a855f7]/25 border border-[#f43f5e]/30 hover:border-[#f43f5e] text-white font-mono text-xs font-semibold transition-all cursor-pointer shadow-md"
            >
              <Download className="w-3.5 h-3.5 text-[#f43f5e]" />
              <span>INSTALL APP</span>
            </button>
          )}

          <div className="bg-[#1a232e] p-2.5 rounded-lg border border-[#2a3644]">
            <span className="text-[10px] text-[#8a99ad] block">CONNECTED USER</span>
            <span className="text-white truncate block font-sans font-medium text-xs">{userEmail}</span>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>DISCONNECT</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col max-w-full md:max-w-6xl mx-auto p-0 md:p-6 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-6">
        {/* Mobile Top Header (Contains Online/Offline, Camera, Mic, Install & Logout) */}
        <div className="md:hidden sticky top-0 z-40 flex items-center justify-between p-3.5 bg-[#121820]/95 backdrop-blur-xl border-b border-[#2a3644]">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#f43f5e] to-[#a855f7] flex items-center justify-center text-white text-xs font-bold shadow-md shadow-rose-500/20">
              W
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block leading-none">WELLPRO</span>
              <span className="text-[9px] font-mono text-[#06b6d4] tracking-wider">v2.0</span>
            </div>

            {/* Mobile Network / Sync Indicator Pill */}
            <button
              onClick={() => setIsQueueModalOpen(true)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-mono cursor-pointer transition-all ${
                isSyncing
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-[#06b6d4]'
                  : !isOnline
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                  : pendingQueueCount > 0
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : 'bg-[#1a232e] border-[#2a3644] text-[#8a99ad]'
              }`}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-[#06b6d4]" />
                  <span>SYNCING ({pendingQueueCount})</span>
                </>
              ) : !isOnline ? (
                <>
                  <WifiOff className="w-3 h-3 text-amber-400" />
                  <span>OFFLINE ({pendingQueueCount})</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span>ONLINE {pendingQueueCount > 0 ? `(${pendingQueueCount})` : ''}</span>
                </>
              )}
            </button>
          </div>

          {/* Top-Right Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Capture Camera & Mic Buttons */}
            <FloatingQuickCapture mode="header" />

            {!isStandalone && (
              <button
                onClick={handleTriggerInstall}
                className="flex items-center gap-1 p-2 rounded-lg bg-[#1a232e] border border-[#f43f5e]/40 text-[#f43f5e] text-[11px] font-mono cursor-pointer active:scale-95 transition-transform"
                title="Install PWA"
              >
                <Download className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onLogout}
              className="flex items-center gap-1 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer font-mono text-[11px]"
              title="Disconnect"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Desktop Top Header */}
        <header className="hidden md:flex justify-between items-center pb-6 border-b border-[#2a3644] mb-6">
          <div>
            <span className="font-mono text-xs text-[#06b6d4] tracking-widest block">OPERATIONAL INTELLIGENCE DASHBOARD</span>
            <h2 className="text-2xl font-bold capitalize">{activeTab} Workspace</h2>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs">
            {/* Syncing / Network Status Banner */}
            <button
              onClick={() => setIsQueueModalOpen(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-all ${
                isSyncing
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-[#06b6d4]'
                  : !isOnline
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                  : 'bg-[#121820] border-[#2a3644] text-[#8a99ad] hover:text-white hover:border-[#06b6d4]'
              }`}
              title="Click to view offline queue"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#06b6d4]" />
                  <span>SYNCING QUEUE ({pendingQueueCount})...</span>
                </>
              ) : !isOnline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>OFFLINE MODE ({pendingQueueCount} QUEUED)</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>ONLINE {pendingQueueCount > 0 ? `(${pendingQueueCount} QUEUED)` : '• BACKEND ACTIVE'}</span>
                </>
              )}
            </button>

            {!isStandalone && (
              <button
                onClick={handleTriggerInstall}
                className="flex items-center gap-2 bg-gradient-to-r from-[#f43f5e]/15 to-[#a855f7]/15 hover:from-[#f43f5e]/25 hover:to-[#a855f7]/25 border border-[#f43f5e]/40 text-white px-3 py-1.5 rounded-full transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#f43f5e]" />
                <span>INSTALL APP</span>
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Screen Content */}
        <div className="flex-1 w-full max-w-md md:max-w-none mx-auto p-4 md:p-0">
          {children}
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#121820]/95 backdrop-blur-xl border-t border-[#2a3644] p-2 px-4 flex justify-between items-center z-50 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.isPrimary) {
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="relative -top-5 w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#f43f5e] to-[#a855f7] flex items-center justify-center text-white shadow-lg shadow-rose-500/30 active:scale-95 transition-transform cursor-pointer"
              >
                <Sparkles className="w-6 h-6 animate-pulse" />
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center gap-1 p-1 text-xs transition-colors cursor-pointer ${
                isActive ? 'text-[#f43f5e]' : 'text-[#8a99ad]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-sans">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Floating Controls (Desktop Floating Action Dock) */}
      <FloatingQuickCapture mode="dock" />

      {/* Offline Queue Modal */}
      <OfflineQueueModal
        isOpen={isQueueModalOpen}
        onClose={() => setIsQueueModalOpen(false)}
      />
    </div>
  );
}

export default AppLayout;
