-- =====================================================
-- Global System Settings
-- =====================================================
-- Create a table to store platform-wide configuration.
-- This replaces browser-local storage for admin settings.
-- =====================================================

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can READ settings (authenticated and anon)
-- Needed so users can check 'require_gps_checkin_for_reviews'
CREATE POLICY "Everyone can read system settings"
  ON system_settings
  FOR SELECT
  USING (true);

-- Policy: Only Admins can UPDATE settings
-- Checks profiles.role = 'admin'
CREATE POLICY "Admins can update system settings"
  ON system_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only Admins can INSERT settings (usually seeded, but good to have)
CREATE POLICY "Admins can insert system settings"
  ON system_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Initial Seed: GPS Check-in Requirement
-- Default to TRUE (Production Mode)
INSERT INTO system_settings (key, value, description)
VALUES (
  'require_gps_checkin_for_reviews',
  'true'::jsonb,
  'If true, users must be physically checked in to write a review. If false, check-in is optional (Testing Mode).'
)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE system_settings IS 'Global platform configuration settings editable by admins';
