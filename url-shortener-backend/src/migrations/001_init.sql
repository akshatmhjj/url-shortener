-- UUID generation used by the application models
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(50) UNIQUE,
  tier VARCHAR(20) DEFAULT 'free', -- free, pro, enterprise
  api_key VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Create URLs table
CREATE TABLE IF NOT EXISTS urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code VARCHAR(50) UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  custom_alias VARCHAR(50) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  title VARCHAR(255),
  metadata JSONB,
  CONSTRAINT valid_custom_alias CHECK (custom_alias IS NULL OR LENGTH(custom_alias) >= 3)
);

-- Keep existing databases compatible with model methods that update URLs.
ALTER TABLE urls ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create Clicks table
CREATE TABLE IF NOT EXISTS clicks (
  id BIGSERIAL PRIMARY KEY,
  url_id UUID NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  referrer VARCHAR(2048),
  country_code CHAR(2),
  city VARCHAR(100),
  device_type VARCHAR(20) DEFAULT 'unknown'
);

-- Create indexes for URLs table
CREATE UNIQUE INDEX IF NOT EXISTS idx_urls_short_code ON urls(short_code);
CREATE INDEX IF NOT EXISTS idx_urls_user_id ON urls(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_urls_custom_alias ON urls(custom_alias) WHERE custom_alias IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_urls_active ON urls(is_active) WHERE is_active = TRUE;

-- Create indexes for Clicks table
CREATE INDEX IF NOT EXISTS idx_clicks_url_id_created ON clicks(url_id, clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_country ON clicks(country_code);
CREATE INDEX IF NOT EXISTS idx_clicks_referrer ON clicks(referrer);
CREATE INDEX IF NOT EXISTS idx_clicks_device ON clicks(device_type);

-- Create indexes for Users table
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key) WHERE api_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);

-- Create a counter table for sequential ID generation
CREATE TABLE IF NOT EXISTS url_counter (
  id SERIAL PRIMARY KEY,
  last_counter BIGINT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Initialize counter
INSERT INTO url_counter (id, last_counter) VALUES (1, 0) ON CONFLICT (id) DO NOTHING;

-- Create function to get next counter value
CREATE OR REPLACE FUNCTION get_next_short_code_counter()
RETURNS BIGINT AS $$
BEGIN
  UPDATE url_counter SET last_counter = last_counter + 1, updated_at = NOW() WHERE id = 1;
  RETURN (SELECT last_counter FROM url_counter WHERE id = 1);
END;
$$ LANGUAGE plpgsql;

-- Create analytics view for quick reporting
CREATE OR REPLACE VIEW url_analytics AS
SELECT
  u.id as url_id,
  u.short_code,
  u.original_url,
  u.created_at,
  COUNT(c.id) as total_clicks,
  COUNT(DISTINCT c.ip_address) as unique_visitors,
  MAX(c.clicked_at) as last_clicked
FROM urls u
LEFT JOIN clicks c ON u.id = c.url_id
WHERE u.is_active = TRUE
GROUP BY u.id, u.short_code, u.original_url, u.created_at;
