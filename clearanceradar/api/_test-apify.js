require('dotenv').config();
const axios = require('axios');

const token = process.env.APIFY_API_TOKEN;
const storeNumber = process.argv[2] || '0597';

console.log('--- Env check ---');
console.log('APIFY_API_TOKEN:', token || '(not set)');
console.log('SUPABASE_URL   :', process.env.SUPABASE_URL || '(not set)');
console.log('-----------------');

if (!token || token === 'YOUR_APIFY_API_TOKEN') {
  console.error('ERROR: APIFY_API_TOKEN is missing or still a placeholder. Update .env and retry.');
  process.exit(1);
}

const clearanceUrl = `https://www.lowes.com/pl/Clearance-Deals/4294857975?storeId=${storeNumber}`;
console.log(`\nFiring Apify actor for store ${storeNumber}...`);
console.log('URL:', clearanceUrl);
console.log('(This may take up to 2 minutes)\n');

axios.post(
  `https://api.apify.com/v2/acts/epctex~lowes-scraper/run-sync-get-dataset-items?token=${token}&timeout=120`,
  { startUrls: [{ url: clearanceUrl }], maxItems: 50, proxyConfiguration: { useApifyProxy: true } },
  { headers: { 'Content-Type': 'application/json' }, timeout: 135000 }
).then(r => {
  const items = r.data;
  if (!Array.isArray(items)) {
    console.error('Unexpected response shape:', typeof items, items);
    process.exit(1);
  }
  console.log(`Items returned: ${items.length}`);
  if (items.length === 0) {
    console.log('No items — the actor ran but found nothing. Try a different storeId.');
  } else {
    console.log('\n--- First item ---');
    console.log(JSON.stringify(items[0], null, 2));
    console.log('\n--- Summary of all items ---');
    items.forEach((it, i) => {
      const price = it.salePrice ?? it.clearancePrice ?? it.currentPrice ?? it.price;
      const orig  = it.regularPrice ?? it.originalPrice ?? it.wasPrice;
      const pct   = orig > 0 ? Math.round((1 - price / orig) * 100) : '?';
      console.log(`[${i+1}] ${(it.title ?? it.name ?? 'Unknown').substring(0, 60)} | $${price} (${pct}% off)`);
    });
  }
}).catch(e => {
  const status = e.response?.status;
  const body   = e.response?.data;
  console.error(`\nApify call failed — HTTP ${status ?? 'no response'}`);
  if (body)   console.error('Body:', JSON.stringify(body));
  if (!status) console.error('Network error:', e.message);
  if (status === 401) console.error('=> Token is invalid or expired. Regenerate at console.apify.com.');
  if (status === 404) console.error('=> Actor "epctex~lowes-scraper" not found. Check actor name.');
  if (status === 403) console.error('=> Access denied. Token may lack permission to run this actor.');
});
