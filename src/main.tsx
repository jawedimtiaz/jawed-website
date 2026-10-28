import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import './mobile-ai-widget.css';

// Register PWA service worker for full offline data center functionality
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    import('virtual:pwa-register').then(({ registerSW }) => {
      registerSW({
        immediate: true,
        onOfflineReady() {
          console.log('[PWA] Cable Length & PoE Budget Checker ready for offline data center use');
        },
      });
    }).catch(() => {
      // Fallback service worker registration from public/sw.js
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then((reg) => {
          console.log('[PWA] Service Worker registered:', reg.scope);
        }).catch((err) => {
          console.warn('[PWA] Service Worker registration notice:', err);
        });
      });
    });
  } catch {}
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
