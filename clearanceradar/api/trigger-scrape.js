const axios = require('axios');

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_ACTOR = 'natanielsantos~lowe-s-scraper';
const APIFY_BASE = 'https://api.apify.com/v2';

const DEFAULT_STORES = [
  { store_number: '0552', city: 'Norfolk', state: 'VA' },
  { store_number: '0553', city: 'Virginia Beach', state: 'VA' },
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (!APIFY_TOKEN) {
    return res.status(500).json({ error: 'APIFY_API_TOKEN not set in Vercel environment variables' });
  }

  const webhookBase = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://clearanceradar.vercel.app';

  try {
    const runs = [];

    for (const store of DEFAULT_STORES) {
      const clearanceUrl = `https://www.lowes.com/pl/Clearance-Deals/4294857975?storeId=${store.store_number}`;

      const webhooksParam = Buffer.from(
        JSON.stringify([{
          eventTypes: ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED'],
          requestUrl: `${webhookBase}/api/apify-webhook`,
        }])
      ).toString('base64');

      const { data: runData } = await axios.post(
        `${APIFY_BASE}/acts/${APIFY_ACTOR}/runs?token=${APIFY_TOKEN}&webhooks=${webhooksParam}`,
        {
          startUrls: [{ url: clearanceUrl }],
          maxItems: 100,
          proxyConfiguration: { useApifyProxy: true },
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000,
        }
      );

      runs.push({
        store: `${store.city}, ${store.state} (#${store.store_number})`,
        runId: runData.data?.id,
        status: runData.data?.status,
      });
    }

    return res.json({
      status: 'started',
      message: `Scraping ${runs.length} Lowe's store(s). Deals will appear in Supabase in ~2-3 minutes.`,
      webhookUrl: `${webhookBase}/api/apify-webhook`,
      runs,
    });
  } catch (err) {
    console.error('trigger-scrape error:', err.response?.data || err.message);
    return res.status(500).json({ error: err.message, detail: err.response?.data });
  }
};
