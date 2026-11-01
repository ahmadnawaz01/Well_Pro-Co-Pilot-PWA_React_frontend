import { useState, useEffect, useCallback } from 'react';
import { Download, X, Smartphone, Monitor, Share, HelpCircle, CheckCircle2 } from 'lucide-react';

export function InstallPWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isManualTrigger, setIsManualTrigger] = useState(false);
  const [isInsecure, setIsInsecure] = useState(false);

  // Check standalone mode helper
  const checkIsStandalone = useCallback(() => {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    );
  }, []);

  useEffect(() => {
    if (checkIsStandalone()) {
      setIsInstalled(true);
    }

    const ua = window.navigator.userAgent || '';
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isAndroidDevice = /Android/.test(ua);
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    const insecure = typeof window !== 'undefined' &&
      !window.isSecureContext &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1';
    setIsInsecure(insecure);

    // Capture standard PWA install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Only auto-show if user hasn't dismissed recently
      const dismissed = localStorage.getItem('wellpro_install_dismissed');
      if (dismissed) {
        const dismissedAt = new Date(dismissed);
        const daysSince = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 3) return;
      }
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // App installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Custom event to manually open install prompt/guide from sidebar/header
    const handleManualTrigger = () => {
      setIsManualTrigger(true);
      setShowBanner(true);
    };

    window.addEventListener('wellpro:trigger_install', handleManualTrigger);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('wellpro:trigger_install', handleManualTrigger);
    };
  }, [checkIsStandalone]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
        setShowBanner(false);
        window.dispatchEvent(
          new CustomEvent('wellpro:toast', {
            detail: {
              type: 'success',
              title: 'App Installed!',
              message: 'WellPro Co-Pilot has been added to your device.'
            }
          })
        );
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setIsManualTrigger(false);
    if (!isManualTrigger) {
      localStorage.setItem('wellpro_install_dismissed', new Date().toISOString());
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#121820] border border-[#2a3644] rounded-3xl p-6 shadow-2xl shadow-rose-500/10 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-[#f43f5e] to-[#a855f7] text-white shadow-lg shadow-rose-500/20 shrink-0">
              {isIOS || isAndroid ? (
                <Smartphone className="w-6 h-6" />
              ) : (
                <Monitor className="w-6 h-6" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Install WellPro Co-Pilot
              </h3>
              <p className="font-mono text-[11px] text-[#06b6d4]">
                PWA / OFFLINE-CAPABLE APP
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-[#8a99ad] hover:text-white rounded-xl hover:bg-[#1a232e] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Insecure context warning for LAN IP users on mobile */}
        {isInsecure && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 text-amber-300 text-xs leading-relaxed space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-amber-200">
              ⚠️ LAN IP Connection (Insecure Origin)
            </span>
            <p className="text-[11px] text-amber-300/90">
              Android Chrome blocks WebAPK installation and microphone/camera on plain HTTP for network IPs.
              To install and enable all features, run <code className="bg-black/40 px-1 py-0.5 rounded text-amber-100 font-mono text-[10px]">npm run dev:https</code> and open the HTTPS link, or enable <span className="font-mono text-[10px] text-amber-100">chrome://flags/#unsafely-treat-insecure-origin-as-secure</span>.
            </p>
          </div>
        )}

        {/* Status / Instructions Body */}
        {isInstalled ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3 text-emerald-400">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <div className="font-sans text-xs">
              <span className="font-bold block">Already Installed!</span>
              WellPro is installed and operating as a standalone app.
            </div>
          </div>
        ) : deferredPrompt ? (
          /* Native 1-Click Install Button available */
          <div className="space-y-4">
            <p className="text-xs text-[#8a99ad] leading-relaxed">
              Install WellPro for fast one-tap launch from your desktop or phone home screen, offline syncing, and dedicated app window.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstallClick}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#f43f5e] to-[#a855f7] hover:opacity-90 text-white font-mono text-xs font-bold rounded-xl shadow-lg shadow-rose-500/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>INSTALL NOW</span>
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-3 bg-[#1a232e] hover:bg-[#2a3644] text-[#8a99ad] font-mono text-xs rounded-xl transition-colors cursor-pointer"
              >
                MAYBE LATER
              </button>
            </div>
          </div>
        ) : isIOS ? (
          /* iOS Safari Manual Instructions */
          <div className="space-y-3">
            <p className="text-xs text-[#8a99ad] leading-relaxed">
              Apple Safari does not allow automatic 1-click install. Add WellPro to your home screen in two simple steps:
            </p>
            <div className="space-y-2 font-sans text-xs">
              <div className="flex items-center gap-3 bg-[#1a232e] p-3 rounded-xl border border-[#2a3644]">
                <div className="w-7 h-7 rounded-lg bg-[#2a3644] flex items-center justify-center text-white shrink-0">
                  <Share className="w-4 h-4 text-[#06b6d4]" />
                </div>
                <div>
                  <span className="font-bold text-white block">1. Tap Share</span>
                  <span className="text-[#8a99ad]">Tap the Share button at the bottom of Safari</span>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-[#1a232e] p-3 rounded-xl border border-[#2a3644]">
                <div className="w-7 h-7 rounded-lg bg-[#2a3644] flex items-center justify-center text-white shrink-0">
                  <Download className="w-4 h-4 text-[#a855f7]" />
                </div>
                <div>
                  <span className="font-bold text-white block">2. Add to Home Screen</span>
                  <span className="text-[#8a99ad]">Scroll down and choose &quot;Add to Home Screen&quot;</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="w-full py-2.5 bg-[#1a232e] hover:bg-[#2a3644] text-white font-mono text-xs rounded-xl transition-colors cursor-pointer"
            >
              GOT IT
            </button>
          </div>
        ) : (
          /* Windows Chrome/Edge or Android Chrome Manual Instructions */
          <div className="space-y-3">
            <p className="text-xs text-[#8a99ad] leading-relaxed">
              {isAndroid
                ? 'To install WellPro on Android:'
                : 'To install WellPro on Windows or Chrome / Edge desktop:'}
            </p>
            <div className="space-y-2 font-sans text-xs">
              {isAndroid ? (
                <>
                  <div className="flex items-center gap-3 bg-[#1a232e] p-3 rounded-xl border border-[#2a3644]">
                    <div className="w-7 h-7 rounded-lg bg-[#2a3644] flex items-center justify-center text-[#06b6d4] font-bold shrink-0">
                      ⋮
                    </div>
                    <div>
                      <span className="font-bold text-white block">1. Open Chrome Menu</span>
                      <span className="text-[#8a99ad]">Tap the 3 dots (⋮) in the top right corner</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-[#1a232e] p-3 rounded-xl border border-[#2a3644]">
                    <div className="w-7 h-7 rounded-lg bg-[#2a3644] flex items-center justify-center text-[#a855f7] shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">2. Tap &quot;Install app&quot;</span>
                      <span className="text-[#8a99ad]">Or choose &quot;Add to Home screen&quot;</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 bg-[#1a232e] p-3 rounded-xl border border-[#2a3644]">
                    <div className="w-7 h-7 rounded-lg bg-[#2a3644] flex items-center justify-center text-[#06b6d4] shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">1. Check Address Bar</span>
                      <span className="text-[#8a99ad]">Click the Install icon (⊕ / ⬇) at the right end of the address bar</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-[#1a232e] p-3 rounded-xl border border-[#2a3644]">
                    <div className="w-7 h-7 rounded-lg bg-[#2a3644] flex items-center justify-center text-[#a855f7] font-bold shrink-0">
                      ⋮
                    </div>
                    <div>
                      <span className="font-bold text-white block">2. Or via Browser Menu</span>
                      <span className="text-[#8a99ad]">Click Menu (⋮) &rarr; &quot;Save and share&quot; / &quot;Apps&quot; &rarr; &quot;Install WellPro&quot;</span>
                    </div>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={handleDismiss}
              className="w-full py-2.5 bg-[#1a232e] hover:bg-[#2a3644] text-white font-mono text-xs rounded-xl transition-colors cursor-pointer"
            >
              GOT IT
            </button>
          </div>
        )}

        {/* Footer info note */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#2a3644]/50 font-mono text-[10px] text-[#8a99ad]">
          <HelpCircle className="w-3.5 h-3.5 text-[#06b6d4] shrink-0" />
          <span>Supports offline caching, background syncing, and biometric capture.</span>
        </div>
      </div>
    </div>
  );
}

export default InstallPWAPrompt;
