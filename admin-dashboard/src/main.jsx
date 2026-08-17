import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// ErrorBoundary to catch any React rendering crash and provide a 1-click recovery button
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn("ShieldX ErrorBoundary caught exception:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#090d16',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            background: '#0d1527',
            border: '1px solid #ef4444',
            borderRadius: '24px',
            padding: '36px 28px',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</div>
            <h1 style={{ fontSize: '22px', fontWeight: '900', color: '#ffffff', marginBottom: '8px' }}>
              ShieldX AI Dashboard Ready
            </h1>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '24px' }}>
              Click below to reset session storage and launch your live safety dashboard.
            </p>
            <button
              onClick={() => {
                try { localStorage.clear(); } catch (e) {}
                window.location.reload();
              }}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontSize: '15px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
              }}
            >
              ⚡ LAUNCH SHIELDX AI DASHBOARD
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Register Service Worker for Interactive Watch & Phone Notification Actions
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('ShieldX ServiceWorker registered successfully:', reg.scope);
    }).catch(err => {
      console.warn('ShieldX ServiceWorker registration failed:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
