require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Supabase admin client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Middleware
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'https://clearanceradar.vercel.app', /\.vercel\.app$/],
  credentials: true,
}));

app.use(express.json());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again in an hour.' }
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts. Try again in an hour.' }
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/deals', require('./routes/deals'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Schedule scrapers
if (process.env.NODE_ENV !== 'test') {
  const { runScraper } = require('./scraper/scheduler');

  // Home Depot every 15 minutes
  cron.schedule('*/15 * * * *', () => runScraper('home_depot'));

  // Lowe's every 30 minutes
  cron.schedule('*/30 * * * *', () => runScraper('lowes'));

  // Walmart every 30 minutes (offset by 15 min)
  cron.schedule('15,45 * * * *', () => runScraper('walmart'));

  console.log('⏰ Scrapers scheduled');
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 ClearanceRadar API running on port ${PORT}`);
});

module.exports = app;
