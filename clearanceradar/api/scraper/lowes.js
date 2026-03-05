const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function scrapeLowes() {
  const deals = [];

  try {
    console.log('🔷 Scraping Lowe\'s clearance...');

    const { data: stores } = await supabase
      .from('store_locations')
      .select('*')
      .eq('retailer', 'lowes')
      .eq('is_active', true)
      .limit(10);

    const targetStores = stores && stores.length > 0 ? stores : getDefaultLowesStores();

    for (const store of targetStores.slice(0, 3)) {
      try {
        const storeDeals = await fetchLowesClearance(store);
        deals.push(...storeDeals);
        await sleep(1000);
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

  try {
    // Lowe's product search API
    const response = await axios.post('https://www.lowes.com/pl/Clearance-Deals/4294857975', {
      storeNumber: store.store_number,
    }, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const data = response.data;
    if (data?.productResults?.productResultDtos) {
      for (const product of data.productResults.productResultDtos) {
        const clearancePrice = product.pricingInfo?.specialPrice?.value || product.pricingInfo?.price?.value;
        const originalPrice = product.pricingInfo?.regularPrice?.value;
        const discountPercent = originalPrice > 0
          ? Math.round((1 - clearancePrice / originalPrice) * 100)
          : 0;

        if (discountPercent >= 20 && clearancePrice) {
          deals.push({
            retailer: 'lowes',
            store_id: store.id,
            product_name: product.description || 'Lowe\'s Clearance Item',
            sku: product.itemNumber?.toString(),
            product_url: `https://www.lowes.com${product.pdUrl || ''}`,
            image_url: product.productImage,
            original_price: parseFloat(originalPrice) || null,
            clearance_price: parseFloat(clearancePrice),
            discount_percent: discountPercent,
            category: product.categoryHierarchy?.[1] || 'General',
            in_stock_quantity: product.quantityAvailable || null,
          });
        }
      }
    }
  } catch (err) {
    // Non-fatal
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
