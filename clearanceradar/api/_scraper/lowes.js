const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Browser-like headers to avoid bot detection
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-CH-UA': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'Sec-CH-UA-Mobile': '?0',
  'Sec-CH-UA-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0',
};

const PAGE_SIZE = 48;
const MAX_PAGES = 5;
const MIN_DISCOUNT = 20;

async function scrapeLowes() {
  const deals = [];

  console.log("🔷 Scraping Lowe's clearance via direct HTTP...");

  const { data: stores } = await supabase
    .from('store_locations')
    .select('*')
    .eq('retailer', 'lowes')
    .eq('is_active', true)
    .limit(10);

  const targetStores = stores?.length > 0 ? stores : getDefaultLowesStores();

  for (const store of targetStores.slice(0, 10)) {
    try {
      const storeDeals = await fetchLowesClearance(store);
      deals.push(...storeDeals);
      await sleep(1000 + Math.random() * 1000); // 1-2s randomized delay between stores
    } catch (err) {
      console.error("Lowe's store error:", store.store_number, err.message);
    }
  }

  return deals;
}

async function fetchLowesClearance(store) {
  const deals = [];
  const storeId = store.store_number;

  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE;

    // Lowe's clearance PLP — 5yc1vZc7nr is the Endeca nav code for Clearance
    // storeId scopes results to that store; sn cookie is set as backup
    const url = `https://www.lowes.com/pl/Clearance/5yc1vZc7nr?storeId=${storeId}&Nrpp=${PAGE_SIZE}&No=${offset}`;

    let items = [];
    try {
      const response = await axios.get(url, {
        headers: {
          ...HEADERS,
          // Setting sn cookie tells Lowe's which store to scope inventory to
          'Cookie': `sn=${storeId}; region=0; userLocale=en_US`,
        },
        timeout: 30000,
        maxRedirects: 5,
      });

      items = parseResponse(response.data, response.headers['content-type'] || '');
    } catch (err) {
      console.error(`Lowe's HTTP error store=${storeId} page=${page}:`, err.message);
      break;
    }

    if (items.length === 0) break;

    for (const item of items) {
      if (!item.clearance_price || !item.sku) continue;

      const discountPercent =
        item.original_price > 0
          ? Math.round((1 - item.clearance_price / item.original_price) * 100)
          : 0;

      if (discountPercent >= MIN_DISCOUNT) {
        deals.push({
          retailer: 'lowes',
          store_id: store.id,
          store_number: store.store_number,
          product_name: item.product_name,
          sku: item.sku,
          product_url: item.product_url,
          image_url: item.image_url,
          original_price: item.original_price,
          clearance_price: item.clearance_price,
          discount_percent: discountPercent,
          category: item.category || 'General',
          in_stock_quantity: item.in_stock_quantity,
          aisle: item.aisle || null,
          bay: item.bay || null,
        });
      }
    }

    // Last page — no need to fetch more
    if (items.length < PAGE_SIZE) break;

    await sleep(500);
  }

  console.log(`🔷 Lowe's store ${storeId}: ${deals.length} qualifying deals`);
  return deals;
}

// ─── Response Parsing ──────────────────────────────────────────────────────────

function parseResponse(data, contentType) {
  // JSON API response
  if (contentType.includes('application/json') || typeof data === 'object') {
    return extractFromJson(data);
  }
  // HTML page — extract embedded Next.js or preloaded state JSON
  return extractFromHtml(data);
}

function extractFromJson(data) {
  const raw =
    data?.products ||
    data?.searchResults?.products ||
    data?.data?.products ||
    data?.plpResults?.products ||
    data?.result?.products ||
    data?.items ||
    [];

  return raw.map(mapProduct).filter(Boolean);
}

function extractFromHtml(html) {
  const $ = cheerio.load(html);

  // Strategy 1: Next.js SSR data in <script id="__NEXT_DATA__">
  try {
    const raw = $('#__NEXT_DATA__').html();
    if (raw) {
      const nextData = JSON.parse(raw);
      const pageProps = nextData?.props?.pageProps;

      // Try every known path Lowe's has used across different page versions
      const products =
        pageProps?.searchResults?.products ||
        pageProps?.plpResults?.products ||
        pageProps?.products ||
        pageProps?.initialData?.products ||
        pageProps?.hydrationData?.plpReducer?.products ||
        pageProps?.hydrationData?.searchReducer?.products ||
        pageProps?.initialProps?.products ||
        nextData?.query?.products ||
        [];

      if (products.length > 0) {
        console.log(`  Found ${products.length} products in __NEXT_DATA__`);
        return products.map(mapProduct).filter(Boolean);
      }
      // Log what keys are available to help debugging
      if (pageProps) {
        console.log('  __NEXT_DATA__ pageProps keys:', Object.keys(pageProps).slice(0, 10));
      }
    }
  } catch (_) { /* fall through */ }

  // Strategy 2: application/json script blocks
  const items = [];
  $('script[type="application/json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html());
      const products =
        data?.products ||
        data?.searchResults?.products ||
        data?.plpResults?.products ||
        [];
      products.forEach(p => {
        const item = mapProduct(p);
        if (item) items.push(item);
      });
    } catch (_) { /* skip */ }
  });

  return items;
}

// ─── Product Mapping ───────────────────────────────────────────────────────────

function mapProduct(product) {
  if (!product) return null;

  // Price — handle many field name variations across Lowe's API versions
  const clearancePrice =
    product.clearancePrice ??
    product.salePrice ??
    product.currentPrice ??
    product.price?.clearancePrice ??
    product.price?.finalPrice ??
    product.pricing?.specialBuyPrice ??
    product.pricing?.clearancePrice;

  const originalPrice =
    product.regularPrice ??
    product.originalPrice ??
    product.wasPrice ??
    product.price?.regularPrice ??
    product.price?.was ??
    product.pricing?.originalPrice ??
    product.pricing?.regularPrice;

  if (!clearancePrice) return null;

  const sku = (
    product.itemNumber ??
    product.sku ??
    product.id ??
    product.productId
  )?.toString();

  if (!sku) return null;

  // Aisle/bay in-store location data
  const aisle =
    product.aisle ??
    product.location?.aisle ??
    product.storeLocation?.aisle ??
    null;

  const bay =
    product.bay ??
    product.location?.bay ??
    product.storeLocation?.bay ??
    null;

  // Stock count — prefer explicit quantity fields over availability strings
  let in_stock_quantity = null;
  if (
    product.availability === 'Out of Stock' ||
    product.inStock === false ||
    product.stockStatus === 'out_of_stock'
  ) {
    in_stock_quantity = 0;
  } else if (product.quantity != null) {
    in_stock_quantity = parseInt(product.quantity, 10) || null;
  } else if (product.stockCount != null) {
    in_stock_quantity = parseInt(product.stockCount, 10) || null;
  } else if (product.inventoryCount != null) {
    in_stock_quantity = parseInt(product.inventoryCount, 10) || null;
  }

  const rawUrl = product.url ?? product.productUrl ?? product.pdpUrl ?? null;

  return {
    product_name:
      product.title ?? product.name ?? product.description ?? "Lowe's Clearance Item",
    sku,
    product_url: rawUrl
      ? rawUrl.startsWith('http') ? rawUrl : `https://www.lowes.com${rawUrl}`
      : null,
    image_url:
      product.imageUrl ??
      product.image ??
      product.thumbnail ??
      product.images?.[0] ??
      null,
    original_price: parseFloat(originalPrice) || null,
    clearance_price: parseFloat(clearancePrice),
    category:
      product.category ??
      product.categoryLabel ??
      product.department ??
      product.breadcrumbs?.[1] ??
      'General',
    in_stock_quantity,
    aisle,
    bay,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getDefaultLowesStores() {
  return [
    { id: null, store_number: '0552', city: 'Norfolk', state: 'VA' },
    { id: null, store_number: '0553', city: 'Virginia Beach', state: 'VA' },
  ];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { scrapeLowes, fetchLowesClearance };
