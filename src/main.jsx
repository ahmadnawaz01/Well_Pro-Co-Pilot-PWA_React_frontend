import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Register Service Worker for offline PWA functionality
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('WellPro: New content available, updated.');
  },
  onOfflineReady() {
    console.log('WellPro: App ready for offline use on Web, iPhone, and Android.');
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
