import React from 'react';
import { useAuth } from '../lib/AuthContext';

export default function Upgrade() {
  const { logout } = useAuth();
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        Clearance<span style={{ color: 'var(--accent)' }}>Radar</span>
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 32 }}>Your subscription has ended</p>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 360, marginBottom: 24 }}>
        <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent)', marginBottom: 16 }}>
          $19.99<span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}>/month</span>
        </div>
        <a href="https://whop.com/clearanceradar/clearanceradar-7b" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-full" style={{ fontSize: 15, padding: 14 }}>
          Reactivate on Whop →
        </a>
      </div>
      <button onClick={logout} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>
        Sign out
      </button>
    </div>
  );
}