require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const { scrapeHomeDepot } = require('./homeDepot');
const { scrapeLowes } = require('./lowes');
const { scrapeWalmart } = require('./walmart');
const { runAlertMatching } = require('../_services/alertService');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function runScraper(retailer) {
  const logId = await createScraperLog(retailer);
  let newDeals = [];

  try {
    console.log(`\n🔍 Starting ${retailer} scraper...`);

    // Run the appropriate scraper
    let rawDeals = [];
    switch (retailer) {
      case 'home_depot':
        rawDeals = await scrapeHomeDepot();
        break;
      case 'lowes':
        rawDeals = await scrapeLowes();
        break;
      case 'walmart':
        rawDeals = await scrapeWalmart();
        break;
      default:
        throw new Error(`Unknown retailer: ${retailer}`);
    }

    console.log(`📦 ${retailer}: Found ${rawDeals.length} potential deals`);

    // Process and save deals
    const { added, updated } = await saveDeals(rawDeals);
    newDeals = added;

    // Update scraper log
    await updateScraperLog(logId, {
      status: 'success',
      deals_found: rawDeals.length,
      deals_added: added.length,
      deals_updated: updated,
      completed_at: new Date().toISOString(),
    });

    console.log(`✅ ${retailer}: ${added.length} new deals, ${updated} updated`);

    // Run alert matching for new deals
    if (newDeals.length > 0) {
      await runAlertMatching(newDeals);
    }

    // Deactivate old deals from this retailer not seen in this run
    await deactivateOldDeals(retailer, rawDeals);

  } catch (err) {
    console.error(`❌ ${retailer} scraper failed:`, err);
    await updateScraperLog(logId, {
      status: 'failed',
      error_message: err.message,
      completed_at: new Date().toISOString(),
    });
  }

  return newDeals;
}

async function saveDeals(rawDeals) {
  const added = [];
  let updated = 0;

  for (const deal of rawDeals) {
    try {
      // Check if deal already exists (by retailer + sku + store)
      const { data: existing } = await supabase
        .from('deals')
        .select('id, clearance_price')
        .eq('retailer', deal.retailer)
        .eq('sku', deal.sku || '')
        .eq('store_location_id', deal.store_id || null)
        .single();

      if (existing) {
        // Update if price changed
        if (existing.clearance_price !== deal.clearance_price) {
          await supabase.from('deals').update({
            clearance_price: deal.clearance_price,
            original_price: deal.original_price,
            discount_percent: deal.discount_percent,
            in_stock_quantity: deal.in_stock_quantity,
            last_verified_at: new Date().toISOString(),
            is_active: true,
          }).eq('id', existing.id);
          updated++;
        } else {
          // Just update verified timestamp
          await supabase.from('deals').update({
            last_verified_at: new Date().toISOString(),
            is_active: true,
          }).eq('id', existing.id);
        }
      } else {
        // Insert new deal
        const { data: newDeal } = await supabase.from('deals').insert({
          retailer: deal.retailer,
          store_location_id: deal.store_id,
          product_name: deal.product_name,
          sku: deal.sku,
          upc: deal.upc,
          product_url: deal.product_url,
          image_url: deal.image_url,
          original_price: deal.original_price,
          clearance_price: deal.clearance_price,
          discount_percent: deal.discount_percent,
          category: deal.category,
          in_stock_quantity: deal.in_stock_quantity,
          is_active: true,
        }).select().single();

        if (newDeal) added.push(newDeal);
      }
    } catch (err) {
      // Skip individual deal errors
    }
  }

  return { added, updated };
}

async function deactivateOldDeals(retailer, currentDeals) {
  try {
    // Deals not seen in last 2 scraper runs get deactivated
    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - 90); // 90 minute cutoff

    await supabase
      .from('deals')
      .update({ is_active: false })
      .eq('retailer', retailer)
      .eq('is_active', true)
      .lt('last_verified_at', cutoff.toISOString());
  } catch (err) {
    // Non-fatal
  }
}

async function createScraperLog(retailer) {
  const { data } = await supabase.from('scraper_logs').insert({
    retailer,
    started_at: new Date().toISOString(),
    status: 'running',
  }).select().single();
  return data?.id;
}

async function updateScraperLog(logId, updates) {
  if (!logId) return;
  await supabase.from('scraper_logs').update(updates).eq('id', logId);
}

module.exports = { runScraper };
