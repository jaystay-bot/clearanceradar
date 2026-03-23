const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const rateLimit = require('express-rate-limit');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const flagLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 10,
  message: { error: 'Flag limit reached for today' }
});

// Get deals matching user filters
router.get('/', async (req, res) => {
  try {
    const { retailer, min_discount, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('deals')
      .select('*, store_locations(*)')
      .eq('is_active', true)
      .order('first_seen_at', { ascending: false })
      .limit(parseInt(limit))
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (retailer && retailer !== 'all') query = query.eq('retailer', retailer);
    if (min_discount) query = query.gte('discount_percent', parseInt(min_discount));

    const { data, error } = await query;
    if (error) throw error;

    res.json({ deals: data, count: data?.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load deals' });
  }
});

// Get single deal
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('deals')
      .select('*, store_locations(*)')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Deal not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load deal' });
  }
});

// Flag a deal as inaccurate
router.post('/:id/flag', flagLimiter, async (req, res) => {
  try {
    const { data: deal } = await supabase
      .from('deals')
      .select('flagged_count')
      .eq('id', req.params.id)
      .single();

    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    await supabase
      .from('deals')
      .update({ flagged_count: (deal.flagged_count || 0) + 1 })
      .eq('id', req.params.id);

    // Auto-deactivate if flagged 5+ times
    if (deal.flagged_count >= 4) {
      await supabase.from('deals').update({ is_active: false }).eq('id', req.params.id);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to flag deal' });
  }
});

module.exports = router;
