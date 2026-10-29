import React, { useEffect, useState } from 'react';
import { authService } from './services/authService';
import { AuthPage } from './pages/AuthPage';
import { AppLayout } from './components/AppLayout';
import { LifeFeedPage } from './pages/LifeFeedPage';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('feed');

  const checkSession = async () => {
    setCheckingAuth(true);
    const session = await authService.verifySession();
    if (session) {
      setUserData(session);
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
    setCheckingAuth(false);
  };

  useEffect(() => {
    checkSession();

    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      setUserData(null);
    };

    window.addEventListener('wellpro:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('wellpro:unauthorized', handleUnauthorized);
  }, []);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#090d12] flex flex-col justify-center items-center font-mono text-xs text-[#8a99ad]">
        <div className="w-8 h-8 rounded-full border-2 border-[#f43f5e] border-t-transparent animate-spin mb-3" />
        <span className="tracking-widest">INITIALIZING CO-PILOT DASHBOARD...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={checkSession} />;
  }

  return (
    <AppLayout
      userEmail={userData?.user}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogout={() => authService.logout()}
    >
      {activeTab === 'feed' && <LifeFeedPage />}
      
      {activeTab !== 'feed' && (
        <div className="bg-[#121820] border border-[#2a3644] p-6 rounded-2xl shadow-xl font-sans text-sm text-[#8a99ad]">
          Module workspace for <span className="text-white font-bold">{activeTab.toUpperCase()}</span> coming in next steps!
        </div>
      )}
    </AppLayout>
  );
}

export default App;