const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { runScraper } = require('../scraper/scheduler');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Simple admin auth middleware
function adminAuth(req, res, next) {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_KEY && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Get overall metrics
router.get('/metrics', adminAuth, async (req, res) => {
  try {
    const [usersRes, dealsRes, alertsRes, logsRes] = await Promise.all([
      supabase.from('users').select('subscription_status, created_at'),
      supabase.from('deals').select('retailer, is_active, discount_percent'),
      supabase.from('alerts_sent').select('sent_at').gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('scraper_logs').select('*').order('started_at', { ascending: false }).limit(10),
    ]);

    const users = usersRes.data || [];
    const activeDeals = (dealsRes.data || []).filter(d => d.is_active);

    res.json({
      users: {
        total: users.length,
        active: users.filter(u => u.subscription_status === 'active').length,
        trial: users.filter(u => u.subscription_status === 'trial').length,
        cancelled: users.filter(u => u.subscription_status === 'cancelled').length,
        mrr: users.filter(u => u.subscription_status === 'active').length * 19.99,
      },
      deals: {
        total: activeDeals.length,
        home_depot: activeDeals.filter(d => d.retailer === 'home_depot').length,
        lowes: activeDeals.filter(d => d.retailer === 'lowes').length,
        walmart: activeDeals.filter(d => d.retailer === 'walmart').length,
        avg_discount: activeDeals.length > 0
          ? Math.round(activeDeals.reduce((s, d) => s + (d.discount_percent || 0), 0) / activeDeals.length)
          : 0,
      },
      alerts_24h: alertsRes.data?.length || 0,
      scraper_logs: logsRes.data,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load metrics' });
  }
});

// Trigger manual scraper run
router.post('/scraper/run', adminAuth, async (req, res) => {
  const { retailer = 'home_depot' } = req.body;
  try {
    // Run async - don't wait
    runScraper(retailer).catch(console.error);
    res.json({ message: `${retailer} scraper triggered` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to trigger scraper' });
  }
});

// Get all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { data } = await supabase
      .from('users')
      .select('id, email, subscription_status, created_at, last_login_at')
      .order('created_at', { ascending: false });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// Create promo code
router.post('/promo', adminAuth, async (req, res) => {
  try {
    const { code, discount_type, discount_value, max_uses, expires_at } = req.body;
    const { data } = await supabase.from('promo_codes').insert({
      code: code.toUpperCase(),
      discount_type,
      discount_value,
      max_uses,
      expires_at,
      is_active: true,
    }).select().single();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create promo code' });
  }
});

module.exports = router;
