const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Exchange Whop OAuth code for access token
router.post('/whop', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'No code provided' });

    // Exchange code for token with Whop
    const tokenRes = await axios.post('https://api.whop.com/v5/oauth/token', {
      client_id: process.env.WHOP_CLIENT_ID,
      client_secret: process.env.WHOP_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.FRONTEND_URL + '/auth/callback',
    });

    const { access_token } = tokenRes.data;

    // Get user info from Whop
    const userRes = await axios.get('https://api.whop.com/v5/me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const whopUser = userRes.data;

    // Get membership info
    const memberRes = await axios.get(
      `https://api.whop.com/v5/memberships?product_id=${process.env.WHOP_PRODUCT_ID}`,
      { headers: { Authorization: `Bearer ${process.env.WHOP_API_KEY}` } }
    );

    const membership = memberRes.data?.data?.find(m => m.user_id === whopUser.id);

    // Upsert user in Supabase
    const { data: dbUser } = await supabase
      .from('users')
      .upsert({
        whop_member_id: whopUser.id,
        email: whopUser.email || '',
        subscription_status: membership?.status === 'active' ? 'active' : 'trial',
        trial_ends_at: membership?.renewal_period_start
          ? new Date(membership.renewal_period_start * 1000 + 7 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        last_login_at: new Date().toISOString(),
      }, { onConflict: 'whop_member_id' })
      .select()
      .single();

    res.json({
      access_token,
      member_id: whopUser.id,
      email: whopUser.email,
      user: dbUser,
    });

  } catch (err) {
    console.error('Whop auth error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Validate token middleware
router.get('/validate', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ valid: false });

    const userRes = await axios.get('https://api.whop.com/v5/me', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!userRes.data?.id) return res.status(401).json({ valid: false });

    const { data: dbUser } = await supabase
      .from('users')
      .select('subscription_status')
      .eq('whop_member_id', userRes.data.id)
      .single();

    const isActive = dbUser?.subscription_status === 'active' || dbUser?.subscription_status === 'trial';

    res.json({ valid: isActive, status: dbUser?.subscription_status });
  } catch (err) {
    res.status(401).json({ valid: false });
  }
});

module.exports = router;
