import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getWhopToken, getWhopUser, clearWhopToken } from '../lib/whop';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const whopUser = getWhopUser();
      const whopToken = getWhopToken();

      const memberId = whopUser?.id || 'guest_bypass';
      const email    = whopUser?.email || 'guest@clearanceradar.app';

      // Get or create user in Supabase
      let { data: dbUser } = await supabase
        .from('users')
        .select('*')
        .eq('whop_member_id', memberId)
        .single();

      if (!dbUser) {
        const { data: newUser } = await supabase
          .from('users')
          .insert({
            whop_member_id: memberId,
            email,
            subscription_status: 'active',
            trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select()
          .single();
        dbUser = newUser;
      }

      if (!dbUser) { setLoading(false); return; }

      setUser(dbUser);
      setSubscriptionStatus(dbUser.subscription_status || 'active');

    } catch (err) {
      console.error('Auth check error:', err);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    clearWhopToken();
    setUser(null);
    setSubscriptionStatus(null);
  }

  const isSubscribed = true; // auth bypassed for testing

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      subscriptionStatus,
      isSubscribed,
      checkAuth,
      logout,
      setUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
