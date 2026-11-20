import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

const splash = document.getElementById('splash');
if (splash) {
  setTimeout(() => {
    splash.classList.add('fade-out');
    setTimeout(() => splash.remove(), 500);
  }, 800);
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(reg => {
    reg.update().catch(() => {});
  }).catch(() => {});
}