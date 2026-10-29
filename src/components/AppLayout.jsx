import React from 'react';
import { Activity, Wallet, Heart, Cpu, LogOut, Sparkles } from 'lucide-react';

export function AppLayout({ userEmail, activeTab, onTabChange, onLogout, children }) {
  const navItems = [
    { id: 'feed', label: 'Feed', icon: Activity, tag: '01' },
    { id: 'capture', label: 'AI Capture', icon: Sparkles, tag: '02', isPrimary: true },
    { id: 'life', label: 'My Life', icon: Heart, tag: '03' },
    { id: 'copilot', label: 'Co-Pilot', icon: Cpu, tag: '04' },
  ];

  return (
    <div className="min-h-screen bg-[#090d12] text-[#f0f4f8] flex flex-col md:flex-row">
      {/* DESKTOP SIDEBAR (Visible on md and larger) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-[#2a3644] bg-[#121820]/80 backdrop-blur-xl p-5 justify-between">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f43f5e] to-[#a855f7] flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight">WELLPRO</h1>
              <span className="font-mono text-[10px] text-[#06b6d4] tracking-wider block">AI CO-PILOT v1.0</span>
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
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
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

        {/* User Session Info & Logout */}
        <div className="border-t border-[#2a3644] pt-4 space-y-3 font-mono text-xs">
          <div className="bg-[#1a232e] p-2.5 rounded-lg border border-[#2a3644]">
            <span className="text-[10px] text-[#8a99ad] block">CONNECTED USER</span>
            <span className="text-white truncate block font-sans font-medium text-xs">{userEmail}</span>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>DISCONNECT</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col max-w-full md:max-w-6xl mx-auto p-0 md:p-6 pb-20 md:pb-6">
        {/* Desktop Top Bar Header */}
        <header className="hidden md:flex justify-between items-center pb-6 border-b border-[#2a3644] mb-6">
          <div>
            <span className="font-mono text-xs text-[#06b6d4] tracking-widest block">OPERATIONAL DASHBOARD</span>
            <h2 className="text-2xl font-bold capitalize">{activeTab} Workspace</h2>
          </div>
          <div className="flex items-center gap-4 font-mono text-xs">
            <span className="flex items-center gap-2 bg-[#121820] px-3 py-1.5 rounded-full border border-[#2a3644]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              SYSTEM ACTIVE
            </span>
          </div>
        </header>

        {/* Dynamic Screen Slot */}
        <div className="flex-1 w-full max-w-md md:max-w-none mx-auto">
          {children}
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR (Visible on mobile only) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#121820]/90 backdrop-blur-xl border-t border-[#2a3644] p-2 px-4 flex justify-between items-center z-50">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.isPrimary) {
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="relative -top-5 w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#f43f5e] to-[#a855f7] flex items-center justify-center text-white shadow-lg shadow-rose-500/30 active:scale-95 transition-transform"
              >
                <Sparkles className="w-6 h-6 animate-pulse" />
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center gap-1 p-1 text-xs transition-colors ${
                isActive ? 'text-[#f43f5e]' : 'text-[#8a99ad]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-sans">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}