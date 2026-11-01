import { useEffect, useState, useCallback } from 'react';
import { authService } from './services/authService';
import { AuthPage } from './pages/AuthPage';
import { AppLayout } from './components/AppLayout';
import { LifeFeedPage } from './pages/LifeFeedPage';
import { AICapturePage } from './pages/AICapturePage';
import { MyLifePage } from './pages/MyLifePage';
import { CoPilotPage } from './pages/CoPilotPage';
import { InstallPWAPrompt } from './components/InstallPWAPrompt';
import { ToastNotification } from './components/ToastNotification';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('feed');

  const checkSession = useCallback(async () => {
    setCheckingAuth(true);
    const session = await authService.verifySession();
    if (session) {
      setUserData(session);
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
      setUserData(null);
    }
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    checkSession();

    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      setUserData(null);
    };

    window.addEventListener('wellpro:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('wellpro:unauthorized', handleUnauthorized);
  }, [checkSession]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#090d12] flex flex-col justify-center items-center font-mono text-xs text-[#8a99ad]">
        <div className="w-8 h-8 rounded-full border-2 border-[#f43f5e] border-t-transparent animate-spin mb-3" />
        <span className="tracking-widest">INITIALIZING WELLPRO CO-PILOT PLATFORM...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <InstallPWAPrompt />
        <ToastNotification />
        <AuthPage onAuthSuccess={checkSession} />
      </>
    );
  }

  return (
    <>
      <InstallPWAPrompt />
      <ToastNotification />
      <AppLayout
        userEmail={userData?.user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={() => authService.logout()}
      >
        {activeTab === 'feed' && (
          <LifeFeedPage userProfile={userData?.profile} />
        )}

        {activeTab === 'capture' && (
          <AICapturePage onRecordCreated={() => { }} />
        )}

        {activeTab === 'life' && (
          <MyLifePage
            userEmail={userData?.user}
            userProfile={userData?.profile}
            userConsent={userData?.consent}
            onProfileUpdated={(updatedProfile) => {
              setUserData(prev => ({ ...prev, profile: updatedProfile }));
            }}
          />
        )}

        {activeTab === 'copilot' && (
          <CoPilotPage />
        )}
      </AppLayout>
    </>
  );
}

export default App;
