const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function scrapeWalmart() {
  const deals = [];

  try {
    console.log('🔵 Scraping Walmart clearance...');

    const { data: stores } = await supabase
      .from('store_locations')
      .select('*')
      .eq('retailer', 'walmart')
      .eq('is_active', true)
      .limit(10);

    const targetStores = stores && stores.length > 0 ? stores : getDefaultWalmartStores();

    for (const store of targetStores.slice(0, 3)) {
      try {
        const storeDeals = await fetchWalmartClearance(store);
        deals.push(...storeDeals);
        await sleep(1000);
      } catch (err) {
        console.error('Walmart store scrape error:', store.store_number, err.message);
      }
    }

    return deals;
  } catch (err) {
    console.error('Walmart scraper error:', err);
    return deals;
  }
}

async function fetchWalmartClearance(store) {
  const deals = [];

  try {
    // Walmart's search API
    const response = await axios.get('https://www.walmart.com/search', {
      params: {
        q: 'clearance',
        sort: 'price_low',
        facet: 'price_type:Clearance',
        stores: store.store_number,
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'WM_SVCNAME': 'search',
      },
      timeout: 10000,
    });

    // Parse Walmart response
    const data = response.data;
    if (data?.query?.searchResult?.itemStacks) {
      for (const stack of data.query.searchResult.itemStacks) {
        for (const item of (stack.items || [])) {
          if (item.priceInfo?.clearance) {
            const clearancePrice = item.priceInfo?.currentPrice?.price;
            const originalPrice = item.priceInfo?.wasPrice?.price;
            const discountPercent = originalPrice > 0
              ? Math.round((1 - clearancePrice / originalPrice) * 100)
              : 0;

            if (discountPercent >= 20 && clearancePrice) {
              deals.push({
                retailer: 'walmart',
                store_id: store.id,
                product_name: item.name || 'Walmart Clearance Item',
                sku: item.usItemId,
                product_url: `https://www.walmart.com/ip/${item.usItemId}`,
                image_url: item.imageInfo?.thumbnailUrl,
                original_price: parseFloat(originalPrice) || null,
                clearance_price: parseFloat(clearancePrice),
                discount_percent: discountPercent,
                category: item.categoryPath?.[1] || 'General',
                in_stock_quantity: item.availabilityStatusDisplayValue === 'In stock' ? null : 0,
              });
            }
          }
        }
      }
    }
  } catch (err) {
    // Individual store failures are non-fatal
  }

  return deals;
}

function getDefaultWalmartStores() {
  return [
    { id: null, store_number: '1701', city: 'Norfolk', state: 'VA' },
    { id: null, store_number: '1702', city: 'Virginia Beach', state: 'VA' },
  ];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { scrapeWalmart };
