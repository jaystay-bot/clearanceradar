-- ClearanceRadar Supabase Schema
-- Run this in your Supabase SQL editor

-- Users table (referenced by whop_member_id)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  whop_member_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'cancelled', 'expired')),
  trial_ends_at TIMESTAMPTZ,
  notification_preference TEXT DEFAULT 'both' CHECK (notification_preference IN ('push', 'email', 'both', 'none')),
  zip_code TEXT,
  fcm_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store locations
CREATE TABLE IF NOT EXISTS store_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  retailer TEXT NOT NULL CHECK (retailer IN ('home_depot', 'lowes', 'walmart')),
  store_number TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(retailer, store_number)
);

-- Deals table
CREATE TABLE IF NOT EXISTS deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  retailer TEXT NOT NULL CHECK (retailer IN ('home_depot', 'lowes', 'walmart')),
  store_location_id UUID REFERENCES store_locations(id),
  product_name TEXT NOT NULL,
  sku TEXT,
  upc TEXT,
  product_url TEXT,
  image_url TEXT,
  original_price DECIMAL(10, 2),
  clearance_price DECIMAL(10, 2),
  discount_percent INTEGER,
  category TEXT,
  in_stock_quantity INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  flagged_count INTEGER DEFAULT 0,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- User filters
CREATE TABLE IF NOT EXISTS user_filters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  filter_name TEXT DEFAULT 'My Filter',
  retailers TEXT[] DEFAULT ARRAY['home_depot', 'lowes', 'walmart'],
  categories TEXT[],
  min_discount_percent INTEGER DEFAULT 30,
  min_price DECIMAL(10, 2),
  max_price DECIMAL(10, 2),
  zip_code TEXT,
  radius_miles INTEGER DEFAULT 25,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts sent log
CREATE TABLE IF NOT EXISTS alerts_sent (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  notification_type TEXT CHECK (notification_type IN ('push', 'email', 'both')),
  was_opened BOOLEAN DEFAULT FALSE
);

-- Promo codes
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT CHECK (discount_type IN ('percent', 'fixed')),
  discount_value DECIMAL(10, 2),
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scraper logs
CREATE TABLE IF NOT EXISTS scraper_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  retailer TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  deals_found INTEGER DEFAULT 0,
  deals_added INTEGER DEFAULT 0,
  deals_updated INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  error_message TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_deals_retailer ON deals(retailer);
CREATE INDEX IF NOT EXISTS idx_deals_active ON deals(is_active);
CREATE INDEX IF NOT EXISTS idx_deals_discount ON deals(discount_percent);
CREATE INDEX IF NOT EXISTS idx_user_filters_user ON user_filters(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts_sent(user_id);
CREATE INDEX IF NOT EXISTS idx_users_whop ON users(whop_member_id);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (service role bypasses these)
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (true);
CREATE POLICY "Users can read own filters" ON user_filters FOR ALL USING (true);
CREATE POLICY "Users can read own alerts" ON alerts_sent FOR SELECT USING (true);
CREATE POLICY "Anyone can read deals" ON deals FOR SELECT USING (true);
CREATE POLICY "Anyone can read stores" ON store_locations FOR SELECT USING (true);
