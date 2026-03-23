const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function sendDealAlert(userEmail, deals) {
  if (!deals || deals.length === 0) return;

  const dealRows = deals.map(deal => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #1C2333;">
        <strong style="color: #FFFFFF; font-size: 14px;">${deal.product_name}</strong><br>
        <span style="color: #A0ADB8; font-size: 12px;">${deal.category || 'General'}</span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #1C2333; text-align: right;">
        <span style="color: #00FF85; font-family: monospace; font-size: 18px; font-weight: bold;">$${parseFloat(deal.clearance_price).toFixed(2)}</span><br>
        <span style="color: #A0ADB8; text-decoration: line-through; font-size: 12px;">$${parseFloat(deal.original_price).toFixed(2)}</span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #1C2333; text-align: center;">
        <span style="background: rgba(0,255,133,0.15); color: #00FF85; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">-${deal.discount_percent}%</span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #1C2333; text-align: center;">
        <span style="color: ${deal.retailer === 'home_depot' ? '#FF6700' : deal.retailer === 'lowes' ? '#4A9EFF' : '#00BFFF'}; font-size: 12px; font-weight: bold;">
          ${deal.retailer === 'home_depot' ? 'Home Depot' : deal.retailer === 'lowes' ? "Lowe's" : 'Walmart'}
        </span>
      </td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body style="margin: 0; padding: 0; background-color: #0A0F1E; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 24px 16px;">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #FFFFFF; font-size: 24px; margin: 0; letter-spacing: -0.02em;">
            Clearance<span style="color: #00FF85;">Radar</span>
          </h1>
          <p style="color: #A0ADB8; margin: 8px 0 0; font-size: 14px;">
            🎯 ${deals.length} new deal${deals.length > 1 ? 's' : ''} matching your filters
          </p>
        </div>

        <!-- Deals Table -->
        <div style="background: #161B27; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: rgba(0,255,133,0.05);">
                <th style="padding: 10px 12px; text-align: left; font-size: 10px; color: #A0ADB8; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #1C2333;">Product</th>
                <th style="padding: 10px 12px; text-align: right; font-size: 10px; color: #A0ADB8; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #1C2333;">Price</th>
                <th style="padding: 10px 12px; text-align: center; font-size: 10px; color: #A0ADB8; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #1C2333;">Off</th>
                <th style="padding: 10px 12px; text-align: center; font-size: 10px; color: #A0ADB8; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #1C2333;">Store</th>
              </tr>
            </thead>
            <tbody>
              ${dealRows}
            </tbody>
          </table>
        </div>

        <!-- CTA -->
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${process.env.FRONTEND_URL || 'https://clearanceradar.vercel.app'}" 
             style="display: inline-block; background: #00FF85; color: #0A0F1E; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px;">
            View All Deals →
          </a>
        </div>

        <!-- Footer -->
        <div style="text-align: center; color: #4A5568; font-size: 11px; line-height: 1.5;">
          <p>You're receiving this because you have deal alerts enabled in ClearanceRadar.</p>
          <p>Manage your alerts at <a href="${process.env.FRONTEND_URL}/account" style="color: #00FF85;">clearanceradar.app/account</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"ClearanceRadar" <${process.env.GMAIL_USER}>`,
      to: userEmail,
      subject: `🎯 ${deals.length} new clearance deal${deals.length > 1 ? 's' : ''} found`,
      html,
    });
    return true;
  } catch (err) {
    console.error('Email send error:', err);
    return false;
  }
}

async function sendWelcomeEmail(userEmail) {
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; background-color: #0A0F1E; font-family: -apple-system, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 16px; text-align: center;">
        <h1 style="color: #FFFFFF; font-size: 28px; margin-bottom: 8px;">
          Welcome to Clearance<span style="color: #00FF85;">Radar</span>
        </h1>
        <p style="color: #A0ADB8; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
          You're all set. ClearanceRadar is now scanning Home Depot, Lowe's, and Walmart for deals that match your filters. The moment something profitable drops, you'll know.
        </p>
        <div style="background: #161B27; border: 1px solid rgba(0,255,133,0.2); border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: left;">
          <p style="color: #A0ADB8; font-size: 13px; margin: 0 0 8px;">✅ Home Depot — scanned every 15 minutes</p>
          <p style="color: #A0ADB8; font-size: 13px; margin: 0 0 8px;">✅ Lowe's — scanned every 30 minutes</p>
          <p style="color: #A0ADB8; font-size: 13px; margin: 0;">✅ Walmart — scanned every 30 minutes</p>
        </div>
        <a href="${process.env.FRONTEND_URL || 'https://clearanceradar.vercel.app'}"
           style="display: inline-block; background: #00FF85; color: #0A0F1E; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px;">
          Go to Dashboard →
        </a>
        <p style="color: #4A5568; font-size: 12px; margin-top: 32px;">
          Your 7-day free trial has started. You won't be charged until day 8.
        </p>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"ClearanceRadar" <${process.env.GMAIL_USER}>`,
      to: userEmail,
      subject: `🎯 ClearanceRadar is now watching for deals`,
      html,
    });
  } catch (err) {
    console.error('Welcome email error:', err);
  }
}

module.exports = { sendDealAlert, sendWelcomeEmail };
