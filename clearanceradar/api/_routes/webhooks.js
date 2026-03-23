const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Verify Whop webhook signature
function verifyWhopSignature(payload, signature, secret) {
  if (!secret) return true; // Skip in dev if not set
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return signature === `sha256=${digest}`;
}

// Handle Whop membership webhooks
router.post('/whop', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['whop-signature'];
    const payload = req.body;

    if (!verifyWhopSignature(payload, signature, process.env.WHOP_WEBHOOK_SECRET)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(payload.toString());
    const { action, data } = event;

    console.log(`📨 Whop webhook: ${action}`, data?.id);

    switch (action) {
      case 'membership.created':
      case 'membership.went_valid': {
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 7);

        await supabase.from('users').upsert({
          whop_member_id: data.user_id,
          email: data.user?.email || '',
          subscription_status: 'trial',
          trial_ends_at: trialEndsAt.toISOString(),
          last_login_at: new Date().toISOString(),
        }, { onConflict: 'whop_member_id' });
        break;
      }

      case 'membership.renewed':
      case 'membership.payment_succeeded': {
        await supabase.from('users')
          .update({ subscription_status: 'active' })
          .eq('whop_member_id', data.user_id);
        break;
      }

      case 'membership.cancelled':
      case 'membership.went_invalid': {
        await supabase.from('users')
          .update({ subscription_status: 'cancelled' })
          .eq('whop_member_id', data.user_id);
        break;
      }

      case 'membership.expired': {
        await supabase.from('users')
          .update({ subscription_status: 'expired' })
          .eq('whop_member_id', data.user_id);
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
