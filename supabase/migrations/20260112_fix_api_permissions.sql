-- Make functions SECURITY DEFINER to bypass RLS on api_usage_logs
-- This allows the functions to count rows even though the user cannot SELECT them directly

CREATE OR REPLACE FUNCTION get_current_month_api_usage(p_api VARCHAR)
RETURNS TABLE (
  total_requests BIGINT,
  autocomplete_requests BIGINT,
  details_requests BIGINT,
  unique_users BIGINT,
  estimated_cost DECIMAL,
  percentage_used DECIMAL,
  monthly_limit INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER -- ADDED This
AS $$
DECLARE
  v_monthly_limit INTEGER;
  v_pricing JSONB;
BEGIN
  -- Get config
  SELECT monthly_limit, pricing 
  INTO v_monthly_limit, v_pricing
  FROM api_config 
  WHERE api = p_api;

  -- Default defaults if config missing
  IF v_monthly_limit IS NULL THEN
     v_monthly_limit := 10000;
     v_pricing := '{"autocomplete": 0.00283, "details": 0.017}'::jsonb;
  END IF;

  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_requests,
    COUNT(*) FILTER (WHERE endpoint = 'autocomplete')::BIGINT as autocomplete_requests,
    COUNT(*) FILTER (WHERE endpoint = 'details')::BIGINT as details_requests,
    COUNT(DISTINCT user_id)::BIGINT as unique_users,
    (
      COUNT(*) FILTER (WHERE endpoint = 'autocomplete') * (v_pricing->>'autocomplete')::DECIMAL +
      COUNT(*) FILTER (WHERE endpoint = 'details') * (v_pricing->>'details')::DECIMAL
    ) as estimated_cost,
    (COUNT(*)::DECIMAL / NULLIF(v_monthly_limit, 0) * 100)::DECIMAL(5,2) as percentage_used,
    v_monthly_limit
  FROM api_usage_logs
  WHERE api = p_api
    AND created_at >= date_trunc('month', CURRENT_DATE);
END;
$$;

CREATE OR REPLACE FUNCTION is_api_available(p_api VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- ADDED This
AS $$
DECLARE
  v_config RECORD;
  v_current_usage BIGINT;
BEGIN
  -- Get config
  SELECT * INTO v_config FROM api_config WHERE api = p_api;
  
  -- If no config, assume enabled and safe (fail open)
  IF NOT FOUND THEN
    RETURN true; 
  END IF;

  IF NOT v_config.is_enabled THEN
    RETURN false;
  END IF;
  
  -- Check if manually disabled
  IF v_config.disabled_until IS NOT NULL AND v_config.disabled_until > NOW() THEN
    RETURN false;
  END IF;
  
  -- Check current usage
  SELECT COUNT(*) INTO v_current_usage
  FROM api_usage_logs
  WHERE api = p_api
    AND created_at >= date_trunc('month', CURRENT_DATE);
  
  -- Check if above critical threshold
  IF v_current_usage >= (v_config.monthly_limit * v_config.critical_threshold_percent / 100) THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Ensure config exists
INSERT INTO api_config (api, monthly_limit, pricing) 
VALUES (
  'google_places', 
  10000,
  '{"autocomplete": 0.00283, "details": 0.017}'::jsonb
) ON CONFLICT (api) DO NOTHING;
