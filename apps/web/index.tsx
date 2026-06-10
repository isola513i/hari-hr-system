import React from 'react';
import ReactDOM from 'react-dom/client';
import './lib/i18n';
import { initAnalytics } from './lib/analytics';
import { initSentry } from './config/sentry';
import App from './App';
import './src/fonts.css';
import './index.css';

initSentry();
initAnalytics();

// Register service worker for push notifications
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// Prevent browser/PWA from restoring scroll position between sessions
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);