import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import Navigation from '../components/Navigation';
import toast from 'react-hot-toast';

const WHOP_PRODUCT_URL = 'https://whop.com/clearanceradar/clearanceradar-7b';

export default function Account() {
  const { user, logout, setUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [notifPref, setNotifPref] = useState(user?.notification_preference || 'both');

  const trialEndsAt = user?.trial_ends_at ? new Date(user.trial_ends_at) : null;
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  async function saveNotifPref(pref) {
    setNotifPref(pref);
    setSaving(true);
    try {
      await supabase.from('users').update({ notification_preference: pref }).eq('id', user.id);
      setUser(u => ({ ...u, notification_preference: pref }));
      toast.success('Preferences saved');
    } catch (err) {
      toast.error('Could not save preferences');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-layout">
      <div className="top-nav">
        <div className="nav-logo">
          <span className="nav-logo-text">My <span>Account</span></span>
        </div>
      </div>

      <div className="page-content">
        {/* Profile Card */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 24,
              background: 'var(--accent-dim)', border: '1px solid var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--accent)',
            }}>
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                {user?.email || 'Reseller'}
              </div>
              <div style={{ marginTop: 4 }}>
                <span className={`status-badge ${user?.subscription_status}`}>
                  {user?.subscription_status?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {user?.subscription_status === 'trial' && trialDaysLeft !== null && (
            <div style={{
              background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.2)',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, color: 'var(--warning)',
            }}>
              ⏱ {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left in your free trial
            </div>
          )}
        </div>

        {/* Subscription */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>SUBSCRIPTION</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Plan</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>ClearanceRadar • $19.99/mo</span>
          </div>
          <a
            href={WHOP_PRODUCT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-full"
            style={{ fontSize: 13 }}
          >
            Manage on Whop →
          </a>
        </div>

        {/* Notification Preferences */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>NOTIFICATIONS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { id: 'both', label: 'Push + Email', desc: 'Get alerted everywhere' },
              { id: 'push', label: 'Push Only', desc: 'In-app notifications' },
              { id: 'email', label: 'Email Only', desc: 'Email alerts only' },
              { id: 'none', label: 'None', desc: 'Pause all alerts' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => saveNotifPref(opt.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: notifPref === opt.id ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                  border: `1px solid ${notifPref === opt.id ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: notifPref === opt.id ? 'var(--accent)' : 'var(--text-primary)' }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{opt.desc}</div>
                </div>
                {notifPref === opt.id && (
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="var(--accent)">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>YOUR STATS</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Member since</span>
            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Last active</span>
            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
              {user?.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : '—'}
            </span>
          </div>
        </div>

        {/* Logout */}
        <button className="btn btn-danger btn-full" onClick={logout} style={{ marginBottom: 20 }}>
          Sign Out
        </button>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
          ClearanceRadar v1.0 • Built for resellers
        </p>
      </div>

      <Navigation />
    </div>
  );
}
