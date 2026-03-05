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

      if (!whopUser || !whopToken) {
        setLoading(false);
        return;
      }

      // Get user from Supabase
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('whop_member_id', whopUser.id)
        .single();

      if (error || !dbUser) {
        clearWhopToken();
        setLoading(false);
        return;
      }

      // Check subscription is still valid
      if (dbUser.subscription_status === 'expired' || dbUser.subscription_status === 'cancelled') {
        setSubscriptionStatus(dbUser.subscription_status);
        setUser(dbUser);
        setLoading(false);
        return;
      }

      setUser(dbUser);
      setSubscriptionStatus(dbUser.subscription_status);

      // Update last login
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', dbUser.id);

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

  const isSubscribed = subscriptionStatus === 'active' || subscriptionStatus === 'trial';

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
