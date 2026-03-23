require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { fetchLowesClearance } = require('./_scraper/lowes');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_STORES = [
  { id: null, store_number: '0552', city: 'Norfolk', state: 'VA' },
  { id: null, store_number: '0553', city: 'Virginia Beach', state: 'VA' },
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  // Accept both GET (Vercel cron) and POST (manual trigger)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Accept a single storeId to scrape, or scrape all default stores
  const { storeId } = req.body || {};

  let targetStores = DEFAULT_STORES;

  if (storeId) {
    // Look up store in DB, fall back to in-memory stub
    const { data: dbStore } = await supabase
      .from('store_locations')
      .select('*')
      .eq('retailer', 'lowes')
      .eq('store_number', storeId)
      .single();

    targetStores = dbStore ? [dbStore] : [{ id: null, store_number: storeId }];
  }

  try {
    const allDeals = [];

    for (const store of targetStores) {
      const deals = await fetchLowesClearance(store);
      allDeals.push(...deals);
    }

    // Upsert deals into Supabase
    let saved = 0;
    let errors = 0;

    for (const deal of allDeals) {
      const { error } = await supabase
        .from('deals')
        .upsert(
          {
            retailer: deal.retailer,
            store_location_id: deal.store_id,
            product_name: deal.product_name,
            sku: deal.sku,
            product_url: deal.product_url,
            image_url: deal.image_url,
            original_price: deal.original_price,
            clearance_price: deal.clearance_price,
            discount_percent: deal.discount_percent,
            category: deal.category,
            in_stock_quantity: deal.in_stock_quantity,
            is_active: true,
            last_verified_at: new Date().toISOString(),
          },
          { onConflict: 'retailer,sku' }
        );

      if (error) {
        console.error('upsert error:', error.message, 'sku:', deal.sku);
        errors++;
      } else {
        saved++;
      }
    }

    return res.json({
      status: 'complete',
      stores: targetStores.map(s => s.store_number),
      dealsFound: allDeals.length,
      dealsSaved: saved,
      errors,
    });
  } catch (err) {
    console.error('trigger-scrape error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
