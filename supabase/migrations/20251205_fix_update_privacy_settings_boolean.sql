-- Migration: Fix update_privacy_settings to handle boolean values correctly
-- Story: 8.5.1 - Read Receipts
-- Issue: The function converts boolean values to strings instead of proper JSON booleans

CREATE OR REPLACE FUNCTION update_privacy_settings(
  setting_key TEXT,
  setting_value TEXT
)
RETURNS JSONB AS $$
DECLARE
  current_settings JSONB;
  json_value JSONB;
BEGIN
  -- Get current settings
  SELECT privacy_settings INTO current_settings 
  FROM profiles WHERE id = auth.uid();
  
  -- Convert setting_value to proper JSON type
  -- Handle booleans specially (they come as 'true' or 'false' strings from client)
  IF setting_value IN ('true', 'false') THEN
    json_value := setting_value::JSONB;  -- This converts 'true' to JSON true
  ELSE
    json_value := to_jsonb(setting_value);  -- For strings, wrap in quotes
  END IF;
  
  -- Update the specific setting
  current_settings = jsonb_set(
    current_settings, 
    ARRAY[setting_key], 
    json_value
  );
  
  -- Update last_updated timestamp
  current_settings = jsonb_set(
    current_settings,
    '{last_updated}',
    to_jsonb(NOW())
  );
  
  -- Save to database
  UPDATE profiles 
  SET privacy_settings = current_settings 
  WHERE id = auth.uid();
  
  RETURN current_settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
