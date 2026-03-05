import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import Navigation from '../components/Navigation';
import toast from 'react-hot-toast';

export default function Account() {
  const { user, logout, setUser } = useAuth();
  const [notifPref, setNotifPref] = useState(user?.notification_preference || 'both');
  const trialEndsAt = user?.trial_ends_at ? new Date(user.trial_ends_at) : null;
  const trialDaysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt - new Date()) / (1000 * 60 * 60 * 24))) : null;

  async function saveNotifPref(pref) {
    setNotifPref(pref);
    await supabase.from('users').update({ notification_preference: pref }).eq('id', user.id);
    setUser(u => ({ ...u, notification_preference: pref }));
    toast.success('Saved');
  }

  return (
    <div className="app-layout">
      <div className="top-nav">
        <div className="nav-logo"><span className="nav-logo-text">My <span>Account</span></span></div>
      </div>
      <div className="page-content">
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 24, background: 'var(--accent-dim)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{user?.email || 'Reseller'}</div>
              <span className={`status-badge ${user?.subscription_status}`}>{user?.subscription_status?.toUpperCase()}</span>
            </div>
          </div>
          {user?.subscription_status === 'trial' && trialDaysLeft !== null && (
            <div style={{ background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--warning)' }}>
              ⏱ {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left in your free trial
            </div>
          )}
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>SUBSCRIPTION</div>
          <a href="https://whop.com/clearanceradar/clearanceradar-7b" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-full" style={{ fontSize: 13 }}>Manage on Whop →</a>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>NOTIFICATIONS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[{ id: 'both', label: 'Push + Email' }, { id: 'email', label: 'Email Only' }, { id: 'none', label: 'None' }].map(opt => (
              <button key={opt.id} onClick={() => saveNotifPref(opt.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: notifPref === opt.id ? 'var(--accent-dim)' : 'var(--bg-secondary)', border: `1px solid ${notifPref === opt.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', color: notifPref === opt.id ? 'var(--accent)' : 'var(--text-primary)', fontSize: 14, fontWeight: 500 }}>
                {opt.label}
                {notifPref === opt.id && <svg width="16" height="16" viewBox="0 0 20 20" fill="var(--accent)"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>}
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn-danger btn-full" onClick={logout} style={{ marginBottom: 20 }}>Sign Out</button>
      </div>
      <Navigation />
    </div>
  );
}