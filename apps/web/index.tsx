import React from 'react';
import ReactDOM from 'react-dom/client';
import './lib/i18n';
import App from './App';
import './src/fonts.css';
import './index.css';

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