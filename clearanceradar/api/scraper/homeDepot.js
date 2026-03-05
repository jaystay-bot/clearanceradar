const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Home Depot clearance API endpoints
const HD_BASE_URL = 'https://www.homedepot.com';
const HD_API_URL = 'https://api.homedepot.com/v2';

const CATEGORIES = [
  { id: 'Tools', name: 'Tools & Hardware' },
  { id: 'Appliances', name: 'Appliances' },
  { id: 'Outdoor_Living', name: 'Outdoor & Garden' },
  { id: 'Flooring', name: 'Flooring' },
  { id: 'Lighting_Ceiling_Fans', name: 'Lighting' },
  { id: 'Paint', name: 'Paint' },
  { id: 'Plumbing', name: 'Plumbing' },
  { id: 'Storage_Organization', name: 'Storage' },
  { id: 'Electrical', name: 'Electronics' },
  { id: 'Building_Materials', name: 'Building Materials' },
];

async function scrapeHomeDepot(storeId = null) {
  const deals = [];

  try {
    console.log('🟠 Scraping Home Depot clearance...');

    // Get store locations from our DB
    const { data: stores } = await supabase
      .from('store_locations')
      .select('*')
      .eq('retailer', 'home_depot')
      .eq('is_active', true)
      .limit(20);

    const targetStores = stores && stores.length > 0 ? stores : await getDefaultHDStores();

    for (const store of targetStores.slice(0, 5)) { // Limit to 5 stores per run
      for (const category of CATEGORIES.slice(0, 5)) { // Limit categories per run
        try {
          const categoryDeals = await fetchHDClearanceByCategory(store, category);
          deals.push(...categoryDeals);
          await sleep(500); // Be respectful
        } catch (err) {
          // Continue with next category
        }
      }
    }

    return deals;
  } catch (err) {
    console.error('Home Depot scraper error:', err);
    return deals;
  }
}

async function fetchHDClearanceByCategory(store, category) {
  const deals = [];

  try {
    // Home Depot search API for clearance items
    const response = await axios.get(`${HD_BASE_URL}/b/${category.id}/N-5yc1vZ${encodeURIComponent(category.id)}`, {
      params: {
        storeSelection: store.store_number,
        Nao: 0,
        Ns: 'P_REP_PRC_MODE|1',
        sortby: 'price_asc',
        keyword: 'clearance',
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 10000,
    });

    // Parse response - Home Depot returns JSON data in script tags
    // This is a simplified version - real scraping would parse HTML
    if (response.data && response.data.searchModel) {
      const products = response.data.searchModel.products || [];
      for (const product of products) {
        if (product.pricing?.specialBuyPrice || product.pricing?.mapAboveOriginalPrice) {
          const clearancePrice = product.pricing.specialBuyPrice || product.pricing.value;
          const originalPrice = product.pricing.mapAboveOriginalPrice || product.pricing.original;
          const discountPercent = originalPrice > 0
            ? Math.round((1 - clearancePrice / originalPrice) * 100)
            : 0;

          if (discountPercent >= 20) {
            deals.push({
              retailer: 'home_depot',
              store_id: store.id,
              product_name: product.identifiers?.productLabel || 'Unknown Product',
              sku: product.identifiers?.storeSkuNumber,
              product_url: `https://www.homedepot.com${product.identifiers?.canonicalUrl || ''}`,
              image_url: product.media?.images?.[0]?.url,
              original_price: parseFloat(originalPrice) || null,
              clearance_price: parseFloat(clearancePrice),
              discount_percent: discountPercent,
              category: category.name,
              in_stock_quantity: product.availabilityType?.type === 'Out of Stock' ? 0 : null,
            });
          }
        }
      }
    }
  } catch (err) {
    // Silently fail for individual category fetches
  }

  return deals;
}

async function getDefaultHDStores() {
  // Return a default set of store data if none in DB
  return [
    { id: null, store_number: '1234', city: 'Norfolk', state: 'VA' },
    { id: null, store_number: '1235', city: 'Virginia Beach', state: 'VA' },
  ];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { scrapeHomeDepot };
