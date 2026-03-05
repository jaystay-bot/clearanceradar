import React from 'react';
import { getWhopAuthUrl } from '../lib/whop';

export default function Login() {
  const handleWhopLogin = () => {
    window.location.href = getWhopAuthUrl();
  };

  return (
    <div className="login-page">
      <div className="login-bg" />

      <div className="login-logo">
        <div className="login-logo-icon">
          <svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="36" cy="36" r="34" stroke="#00FF85" strokeWidth="1.5" strokeOpacity="0.3"/>
            <circle cx="36" cy="36" r="24" stroke="#00FF85" strokeWidth="1.5" strokeOpacity="0.5"/>
            <circle cx="36" cy="36" r="14" stroke="#00FF85" strokeWidth="1.5" strokeOpacity="0.7"/>
            <circle cx="36" cy="36" r="5" fill="#00FF85"/>
            <line x1="36" y1="36" x2="64" y2="20" stroke="#00FF85" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="64" cy="20" r="3" fill="#00FF85" opacity="0.8"/>
          </svg>
        </div>
        <h1 className="login-title">Clearance<span>Radar</span></h1>
        <p className="login-subtitle">Find deals before anyone else does</p>
      </div>

      <div className="login-card">
        <button className="login-whop-btn" onClick={handleWhopLogin}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2L12.5 7.5H18L13.5 11L15.5 17L10 13.5L4.5 17L6.5 11L2 7.5H7.5L10 2Z" fill="currentColor"/>
          </svg>
          Continue with Whop
        </button>

        <div className="divider" />

        <div className="login-features">
          <div className="login-feature">
            <svg className="login-feature-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            Real-time alerts from Home Depot, Lowe's & Walmart
          </div>
          <div className="login-feature">
            <svg className="login-feature-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            Filter by discount %, category & location
          </div>
          <div className="login-feature">
            <svg className="login-feature-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            7-day free trial — cancel anytime
          </div>
        </div>
      </div>

      <p style={{
        marginTop: 24,
        fontSize: 12,
        color: 'var(--text-muted)',
        textAlign: 'center',
        maxWidth: 280
      }}>
        By continuing you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  );
}
