const { createClient } = require('@supabase/supabase-js');
const { sendDealAlert } = require('./emailService');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function runAlertMatching(newDeals) {
  if (!newDeals || newDeals.length === 0) return;

  console.log(`🔔 Matching ${newDeals.length} new deals against user filters...`);

  try {
    // Get all active users with their filters
    const { data: activeFilters } = await supabase
      .from('user_filters')
      .select('*, users(id, email, notification_preference, subscription_status)')
      .eq('is_active', true);

    if (!activeFilters || activeFilters.length === 0) return;

    // Group filters by user
    const userFilterMap = {};
    for (const filter of activeFilters) {
      const user = filter.users;
      if (!user) continue;
      if (user.subscription_status !== 'active' && user.subscription_status !== 'trial') continue;

      if (!userFilterMap[user.id]) {
        userFilterMap[user.id] = { user, filters: [] };
      }
      userFilterMap[user.id].filters.push(filter);
    }

    // Match deals to each user's filters
    const alertsToSend = [];

    for (const [userId, { user, filters }] of Object.entries(userFilterMap)) {
      const matchedDeals = [];

      for (const deal of newDeals) {
        for (const filter of filters) {
          if (dealMatchesFilter(deal, filter)) {
            matchedDeals.push(deal);
            break; // Only add deal once even if matches multiple filters
          }
        }
      }

      if (matchedDeals.length > 0) {
        alertsToSend.push({ user, deals: matchedDeals });
      }
    }

    console.log(`📨 Sending alerts to ${alertsToSend.length} users`);

    // Send alerts and log them
    for (const { user, deals } of alertsToSend) {
      const notifPref = user.notification_preference || 'both';

      // Send email
      if (notifPref === 'email' || notifPref === 'both') {
        if (user.email) {
          await sendDealAlert(user.email, deals);
        }
      }

      // Log alerts to database
      const alertRecords = deals.map(deal => ({
        user_id: user.id,
        deal_id: deal.id,
        notification_type: notifPref,
        sent_at: new Date().toISOString(),
      }));

      await supabase.from('alerts_sent').insert(alertRecords);
    }

    console.log(`✅ Alert matching complete`);

  } catch (err) {
    console.error('Alert matching error:', err);
  }
}

function dealMatchesFilter(deal, filter) {
  // Check retailer
  if (filter.retailers && filter.retailers.length > 0) {
    if (!filter.retailers.includes(deal.retailer)) return false;
  }

  // Check discount
  if (filter.min_discount_percent) {
    if ((deal.discount_percent || 0) < filter.min_discount_percent) return false;
  }

  // Check price range
  if (filter.min_price) {
    if ((deal.clearance_price || 0) < parseFloat(filter.min_price)) return false;
  }
  if (filter.max_price) {
    if ((deal.clearance_price || 0) > parseFloat(filter.max_price)) return false;
  }

  // Check categories
  if (filter.categories && filter.categories.length > 0) {
    if (deal.category && !filter.categories.includes(deal.category)) return false;
  }

  return true;
}

module.exports = { runAlertMatching };
