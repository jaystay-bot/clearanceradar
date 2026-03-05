import React from 'react';
import { getWhopAuthUrl } from '../lib/whop';

export default function Login() {
  const handleWhopLogin = () => {
    window.location.href = getWhopAuthUrl();
  };

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none" style={{ margin: '0 auto 16px', display: 'block' }}>
          <circle cx="36" cy="36" r="34" stroke="#00FF85" strokeWidth="1.5" strokeOpacity="0.3"/>
          <circle cx="36" cy="36" r="24" stroke="#00FF85" strokeWidth="1.5" strokeOpacity="0.5"/>
          <circle cx="36" cy="36" r="14" stroke="#00FF85" strokeWidth="1.5" strokeOpacity="0.7"/>
          <circle cx="36" cy="36" r="5" fill="#00FF85"/>
          <line x1="36" y1="36" x2="64" y2="20" stroke="#00FF85" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <h1 className="login-title">Clearance<span>Radar</span></h1>
        <p className="login-subtitle">Find deals before anyone else does</p>
      </div>
      <div className="login-card">
        <button className="login-whop-btn" onClick={handleWhopLogin}>
          Continue with Whop
        </button>
        <div className="divider" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {['Real-time alerts from Home Depot, Lowe\'s & Walmart', 'Filter by discount %, category & location', '7-day free trial — cancel anytime'].map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="var(--accent)">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}