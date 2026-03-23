import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { setWhopToken, setWhopUser } from '../lib/whop';
import { useAuth } from '../lib/AuthContext';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const [status, setStatus] = useState('Processing your login...');

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const token = params.get('token');
      const memberId = params.get('member_id');
      const email = params.get('email');

      // Handle direct token from Whop webhook redirect
      if (token && memberId) {
        await processLogin(token, memberId, email);
        return;
      }

      // Handle OAuth code exchange
      if (code) {
        setStatus('Exchanging authorization code...');
        const response = await fetch('/api/auth/whop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(`Auth exchange failed (${response.status}): ${errData.detail || errData.error || 'unknown'}`);
        }
        const data = await response.json();
        await processLogin(data.access_token, data.member_id, data.email);
        return;
      }

      throw new Error('No auth code received');

    } catch (err) {
      console.error('Auth callback error:', err);
      setStatus(`Login failed: ${err.message}`);
    }
  }

  async function processLogin(accessToken, memberId, email) {
    setStatus('Setting up your account...');

    // Store token
    setWhopToken(accessToken);
    setWhopUser({ id: memberId, email });

    // Check if user exists in Supabase
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('whop_member_id', memberId)
      .single();

    if (!existingUser) {
      // Create new user
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);

      await supabase.from('users').insert({
        whop_member_id: memberId,
        email: email || '',
        subscription_status: 'trial',
        trial_ends_at: trialEndsAt.toISOString(),
      });

      await checkAuth();
      navigate('/onboarding');
    } else {
      await checkAuth();

      // Check if they have filters set up
      const { data: filters } = await supabase
        .from('user_filters')
        .select('id')
        .eq('user_id', existingUser.id)
        .limit(1);

      if (!filters || filters.length === 0) {
        navigate('/onboarding');
      } else {
        navigate('/');
      }
    }
  }

  return (
    <div className="loading-screen">
      <div className="radar-pulse">
        <div className="pulse-ring"></div>
        <div className="pulse-ring delay-1"></div>
        <div className="pulse-ring delay-2"></div>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14" stroke="#00FF85" strokeWidth="2"/>
          <path d="M16 16 L28 10" stroke="#00FF85" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="16" cy="16" r="3" fill="#00FF85"/>
        </svg>
      </div>
      <p>{status}</p>
    </div>
  );
}
