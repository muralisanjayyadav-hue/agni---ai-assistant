import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Route native Capacitor/mobile API calls to live production backend
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      const isNative =
        window.location.protocol === 'capacitor:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        !!(window as any).Capacitor?.isNativePlatform?.();
      if (isNative) {
        input = `https://agni-ai-assistant.vercel.app${input}`;
      }
    }
    return originalFetch(input, init);
  };
}

// Register PWA Service Worker for Android Chrome & Offline Mode
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[AGNI PWA] Service Worker registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[AGNI PWA] Service Worker registration failed:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
