-- ============================================
-- STEP 1: CREATE TABLES (Run this first)
-- ============================================

CREATE TABLE IF NOT EXISTS share_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('storefront', 'product', 'offer', 'profile')),
  entity_id UUID NOT NULL,
  share_method TEXT NOT NULL CHECK (share_method IN ('chat', 'native_share', 'copy_link', 'facebook', 'twitter', 'whatsapp', 'email')),
  recipient_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  utm_source TEXT DEFAULT 'sync',
  utm_medium TEXT DEFAULT 'share',
  utm_campaign TEXT,
  utm_content TEXT,
  shared_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS share_clicks_unified (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_event_id UUID NOT NULL REFERENCES share_events(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  ip_hash TEXT,
  user_agent TEXT,
  referrer TEXT
);

CREATE TABLE IF NOT EXISTS share_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_event_id UUID NOT NULL REFERENCES share_events(id) ON DELETE CASCADE,
  conversion_type TEXT NOT NULL CHECK (conversion_type IN ('favorite', 'follow', 'add_friend', 'signup', 'purchase')),
  converted_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ DEFAULT NOW()
);
