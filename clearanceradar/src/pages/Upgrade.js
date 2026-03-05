import React from 'react';
import { useAuth } from '../lib/AuthContext';

const WHOP_PRODUCT_URL = 'https://whop.com/clearanceradar/clearanceradar-7b';

export default function Upgrade() {
  const { logout } = useAuth();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      textAlign: 'center',
    }}>
      <div style={{ marginBottom: 32 }}>
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none" style={{ margin: '0 auto 16px', display: 'block' }}>
          <circle cx="36" cy="36" r="34" stroke="#00FF85" strokeWidth="1.5" strokeOpacity="0.2"/>
          <circle cx="36" cy="36" r="24" stroke="#00FF85" strokeWidth="1.5" strokeOpacity="0.4"/>
          <circle cx="36" cy="36" r="14" stroke="#00FF85" strokeWidth="1.5" strokeOpacity="0.6"/>
          <circle cx="36" cy="36" r="5" fill="#00FF85"/>
          <line x1="36" y1="36" x2="64" y2="20" stroke="#00FF85" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
          Clearance<span style={{ color: 'var(--accent)' }}>Radar</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
          Your subscription has ended
        </p>
      </div>

      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 28,
        width: '100%',
        maxWidth: 360,
        marginBottom: 24,
      }}>
        <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent)', marginBottom: 4 }}>
          $19.99
          <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}>/month</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
          One good flip pays for the next 2 months
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, textAlign: 'left' }}>
          {[
            'Real-time clearance alerts',
            'Home Depot, Lowe\'s & Walmart',
            'Filter by discount & location',
            'Push + email notifications',
            'Deal history & alert log',
          ].map((feature, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="var(--accent)">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              {feature}
            </div>
          ))}
        </div>

        <a
          href={WHOP_PRODUCT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-full"
          style={{ fontSize: 15, padding: '14px' }}
        >
          Reactivate on Whop →
        </a>
      </div>

      <button
        onClick={logout}
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}
      >
        Sign out
      </button>
    </div>
  );
}
