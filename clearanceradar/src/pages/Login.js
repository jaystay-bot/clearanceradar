import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { setWhopToken, setWhopUser } from '../lib/whop';
import { useAuth } from '../lib/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');

    try {
      // Generate a stable member_id from email
      const memberId = 'bypass_' + btoa(email.trim().toLowerCase()).replace(/[^a-zA-Z0-9]/g, '');

      // Upsert user in Supabase
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('whop_member_id', memberId)
        .single();

      if (!existingUser) {
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 30);

        await supabase.from('users').insert({
          whop_member_id: memberId,
          email: email.trim(),
          subscription_status: 'active',
          trial_ends_at: trialEndsAt.toISOString(),
        });
      }

      // Store session
      setWhopToken('bypass_token');
      setWhopUser({ id: memberId, email: email.trim() });

      await checkAuth();

      // Check if they have filters set up
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('whop_member_id', memberId)
        .single();

      if (user) {
        const { data: filters } = await supabase
          .from('user_filters')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        navigate(filters && filters.length > 0 ? '/' : '/onboarding');
      } else {
        navigate('/onboarding');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

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
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 10,
              padding: '14px 16px',
              color: '#fff',
              fontSize: 15,
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
          {error && (
            <p style={{ color: '#ff4d4d', fontSize: 13, margin: 0 }}>{error}</p>
          )}
          <button
            type="submit"
            className="login-whop-btn"
            disabled={loading}
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Signing in...' : 'Continue →'}
          </button>
        </form>

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
