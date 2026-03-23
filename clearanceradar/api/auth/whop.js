// Vercel serverless function — POST /api/auth/whop
// Exchanges a Whop OAuth code for an access token and returns user info.

const REDIRECT_URI = 'https://clearanceradar.vercel.app/auth/callback';

module.exports = async (req, res) => {
  // CORS headers (Vercel functions don't inherit the Express cors() middleware)
  res.setHeader('Access-Control-Allow-Origin', 'https://clearanceradar.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'No code provided' });

  const clientId     = process.env.WHOP_CLIENT_ID;
  const clientSecret = process.env.WHOP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Missing WHOP_CLIENT_ID or WHOP_CLIENT_SECRET env vars');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch('https://api.whop.com/v5/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     clientId,
        client_secret: clientSecret,
        code,
        grant_type:    'authorization_code',
        redirect_uri:  REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error(`Whop token exchange failed ${tokenRes.status}:`, errBody);
      return res.status(502).json({
        error: 'Token exchange failed',
        detail: errBody,
        status: tokenRes.status,
      });
    }

    const { access_token } = await tokenRes.json();

    // 2. Fetch user info using the access token
    const meRes = await fetch('https://api.whop.com/v5/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!meRes.ok) {
      const errBody = await meRes.text();
      console.error(`Whop /me failed ${meRes.status}:`, errBody);
      return res.status(502).json({ error: 'Failed to fetch user info', detail: errBody });
    }

    const whopUser = await meRes.json();

    return res.status(200).json({
      access_token,
      member_id: whopUser.id,
      email:     whopUser.email || '',
    });

  } catch (err) {
    console.error('Whop auth exception:', err.message);
    return res.status(500).json({ error: 'Authentication failed', detail: err.message });
  }
};
