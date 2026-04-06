import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Apply saved theme before first paint to prevent flash
const savedTheme = localStorage.getItem('ll_theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Hide the HTML loading splash once React has rendered
if (typeof window.__hideSplash === 'function') {
  window.__hideSplash();
}

// Optional: send Core Web Vitals to an analytics endpoint
// reportWebVitals(console.log);
reportWebVitals();
