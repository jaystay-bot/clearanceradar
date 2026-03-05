import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { setWhopToken, setWhopUser } from '../lib/whop';
import { useAuth } from '../lib/AuthContext';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const [status, setStatus] = useState('Processing your login...');

  useEffect(() => { handleCallback(); }, []);

  async function handleCallback() {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const token = params.get('token');
      const memberId = params.get('member_id');
      const email = params.get('email');

      if (token && memberId) {
        await processLogin(token, memberId, email);
        return;
      }

      if (code) {
        setStatus('Exchanging authorization code...');
        const response = await fetch('/api/auth/whop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        if (!response.ok) throw new Error('Auth exchange failed');
        const data = await response.json();
        await processLogin(data.access_token, data.member_id, data.email);
        return;
      }

      throw new Error('No auth code received');
    } catch (err) {
      setStatus('Login failed. Redirecting...');
      setTimeout(() => navigate('/login'), 2000);
    }
  }

  async function processLogin(accessToken, memberId, email) {
    setStatus('Setting up your account...');
    setWhopToken(accessToken);
    setWhopUser({ id: memberId, email });

    const { data: existingUser } = await supabase
      .from('users').select('*').eq('whop_member_id', memberId).single();

    if (!existingUser) {
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
      const { data: filters } = await supabase
        .from('user_filters').select('id').eq('user_id', existingUser.id).limit(1);
      navigate(filters?.length ? '/' : '/onboarding');
    }
  }

  return (
    <div className="loading-screen">
      <div className="radar-pulse">
        <div className="pulse-ring"></div>
        <div className="pulse-ring"></div>
        <div className="pulse-ring"></div>
      </div>
      <p>{status}</p>
    </div>
  );
}