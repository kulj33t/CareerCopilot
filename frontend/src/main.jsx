import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { store } from './store/index.js';
import './index.css';

// Apply stored theme synchronously before first paint to avoid flash
try {
  const t = localStorage.getItem('cc-theme') || 'light';
  document.documentElement.setAttribute('data-theme', t);
} catch {}

// ErrorBoundary outside BrowserRouter so route-level crashes still get caught
// and the user gets a recoverable error screen instead of a blank page.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>
);
