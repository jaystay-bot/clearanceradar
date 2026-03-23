const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_BASE = 'https://api.apify.com/v2';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const payload = req.body;
    const runId = payload.eventData?.actorRunId || payload.resource?.id;
    const datasetId = payload.resource?.defaultDatasetId;

    if (!runId) {
      return res.status(400).json({ error: 'Missing actorRunId in webhook payload' });
    }

    console.log(`Apify webhook received: run=${runId}, dataset=${datasetId}, event=${payload.eventType}`);

    if (payload.eventType === 'ACTOR.RUN.FAILED') {
      console.error(`Apify run ${runId} failed`);
      return res.json({ received: true, status: 'run_failed' });
    }

    // Fetch dataset items from the completed run
    const fetchUrl = datasetId
      ? `${APIFY_BASE}/datasets/${datasetId}/items?token=${APIFY_TOKEN}&format=json&clean=true`
      : `${APIFY_BASE}/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&format=json&clean=true`;

    const { data: items } = await axios.get(fetchUrl, { timeout: 30000 });

    if (!Array.isArray(items)) {
      console.error('Unexpected dataset format:', typeof items);
      return res.status(400).json({ error: 'Unexpected dataset format' });
    }

    console.log(`Processing ${items.length} items from run ${runId}`);

    // Map Apify item fields → deals table columns
    // deals table: id, retailer, name, sku, category, original_price,
    //              clearance_price, discount_percent, in_stock, url,
    //              image_url, store_id, first_seen, last_seen
    const now = new Date().toISOString();
    const deals = [];

    for (const item of items) {
      const clearancePrice = item.salePrice ?? item.clearancePrice ?? item.currentPrice ?? item.price;
      const originalPrice = item.regularPrice ?? item.originalPrice ?? item.wasPrice;

      if (!clearancePrice) continue;

      const discountPercent = originalPrice > 0
        ? Math.round((1 - clearancePrice / originalPrice) * 100)
        : 0;

      if (discountPercent < 20) continue;

      const rawSku = item.itemNumber?.toString() ?? item.sku?.toString();
      // Require a real SKU — skip items without one to avoid constraint issues
      if (!rawSku) continue;

      deals.push({
        retailer: 'lowes',
        name: item.title ?? item.name ?? "Lowe's Clearance Item",
        sku: rawSku,
        url: item.url ?? item.productUrl ?? null,
        image_url: item.imageUrl ?? item.image ?? item.thumbnail ?? null,
        original_price: parseFloat(originalPrice) || null,
        clearance_price: parseFloat(clearancePrice),
        discount_percent: discountPercent,
        category: item.category ?? item.breadcrumbs?.[1] ?? 'General',
        in_stock: item.availability !== 'Out of Stock',
        last_seen: now,
      });
    }

    console.log(`${deals.length} deals qualify (>=20% off with SKU)`);

    // Upsert: update price/stock if SKU already exists, insert if new
    let saved = 0;
    let errors = 0;
    for (const deal of deals) {
      const { error } = await supabase
        .from('deals')
        .upsert(deal, { onConflict: 'retailer,sku' });
      if (error) {
        console.error('upsert error:', error.message, 'sku:', deal.sku);
        errors++;
      } else {
        saved++;
      }
    }

    console.log(`Saved ${saved} deals, ${errors} errors`);
    return res.json({
      success: true,
      itemsReceived: items.length,
      dealsQualified: deals.length,
      dealsSaved: saved,
      errors,
    });
  } catch (err) {
    console.error('apify-webhook error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
