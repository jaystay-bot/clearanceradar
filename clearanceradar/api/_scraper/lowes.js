const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_ACTOR = 'epctex~lowes-scraper';
const APIFY_BASE = 'https://api.apify.com/v2';

async function scrapeLowes() {
  const deals = [];

  try {
    console.log('🔷 Scraping Lowe\'s clearance via Apify...');

    const { data: stores } = await supabase
      .from('store_locations')
      .select('*')
      .eq('retailer', 'lowes')
      .eq('is_active', true)
      .limit(10);

    const targetStores = stores && stores.length > 0 ? stores : getDefaultLowesStores();

    for (const store of targetStores.slice(0, 10)) {
      try {
        const storeDeals = await fetchLowesClearance(store);
        deals.push(...storeDeals);
        await sleep(500);
      } catch (err) {
        console.error('Lowes store error:', store.store_number, err.message);
      }
    }

    return deals;
  } catch (err) {
    console.error('Lowes scraper error:', err);
    return deals;
  }
}

async function fetchLowesClearance(store) {
  const deals = [];

  // Store-specific clearance page — storeId scopes results to that location
  const clearanceUrl = `https://www.lowes.com/pl/Clearance-Deals/4294857975?storeId=${store.store_number}`;

  // Run Apify actor synchronously and receive dataset items directly
  let items;
  try {
    const response = await axios.post(
      `${APIFY_BASE}/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=120`,
      {
        startUrls: [{ url: clearanceUrl }],
        maxItems: 100,
        proxyConfiguration: { useApifyProxy: true },
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 135000, // 135s axios timeout — slightly over Apify's 120s actor timeout
      }
    );
    items = response.data;
  } catch (err) {
    console.error(`Lowes Apify run failed for store ${store.store_number}:`, err.message);
    return deals;
  }

  if (!Array.isArray(items)) {
    console.error(`Lowes Apify: unexpected response shape for store ${store.store_number}:`, typeof items);
    return deals;
  }

  console.log(`🔷 Lowe's store ${store.store_number}: ${items.length} raw items from Apify`);

  for (const item of items) {
    // epctex/lowes-scraper field names — with fallbacks for minor schema variations
    const clearancePrice = item.salePrice ?? item.clearancePrice ?? item.currentPrice ?? item.price;
    const originalPrice = item.regularPrice ?? item.originalPrice ?? item.wasPrice;

    if (!clearancePrice) continue;

    const discountPercent = originalPrice > 0
      ? Math.round((1 - clearancePrice / originalPrice) * 100)
      : 0;

    if (discountPercent >= 20) {
      deals.push({
        retailer: 'lowes',
        store_id: store.id,
        product_name: item.title ?? item.name ?? "Lowe's Clearance Item",
        sku: item.itemNumber?.toString() ?? item.sku?.toString(),
        product_url: item.url ?? item.productUrl,
        image_url: item.imageUrl ?? item.image ?? item.thumbnail,
        original_price: parseFloat(originalPrice) || null,
        clearance_price: parseFloat(clearancePrice),
        discount_percent: discountPercent,
        category: item.category ?? item.breadcrumbs?.[1] ?? 'General',
        in_stock_quantity: item.availability === 'Out of Stock' ? 0 : null,
      });
    }
  }

  return deals;
}

function getDefaultLowesStores() {
  return [
    { id: null, store_number: '0552', city: 'Norfolk', state: 'VA' },
    { id: null, store_number: '0553', city: 'Virginia Beach', state: 'VA' },
  ];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { scrapeLowes };
