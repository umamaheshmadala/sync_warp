-- Create API usage tracking table
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api VARCHAR(50) NOT NULL,
  endpoint VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  business_id UUID REFERENCES businesses(id),
  session_id VARCHAR(100),
  request_params JSONB,
  response_status VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for usage queries
CREATE INDEX IF NOT EXISTS idx_api_usage_api_date 
ON api_usage_logs(api, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_usage_user_date 
ON api_usage_logs(user_id, created_at DESC);

-- Create usage summary table (populated by cron)
CREATE TABLE IF NOT EXISTS api_usage_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  endpoint VARCHAR(100) NOT NULL,
  request_count INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  estimated_cost DECIMAL(10, 4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(api, date, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_api_usage_summary_api_date 
ON api_usage_summary(api, date DESC);

-- API configuration table
CREATE TABLE IF NOT EXISTS api_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api VARCHAR(50) UNIQUE NOT NULL,
  monthly_limit INTEGER NOT NULL,
  warning_threshold_percent INTEGER DEFAULT 80,
  critical_threshold_percent INTEGER DEFAULT 95,
  is_enabled BOOLEAN DEFAULT true,
  disabled_reason TEXT,
  disabled_until TIMESTAMPTZ,
  pricing JSONB, -- { "autocomplete": 0.00283, "details": 0.017 }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config for Google Places
INSERT INTO api_config (api, monthly_limit, pricing) 
VALUES (
  'google_places', 
  10000,
  '{"autocomplete": 0.00283, "details": 0.017}'::jsonb
) ON CONFLICT (api) DO NOTHING;

-- RLS Policies
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_config ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (and authenticated users to read logs for now for demo purposes/admin)
CREATE POLICY "Service role can manage api_usage_logs"
ON api_usage_logs FOR ALL
USING (auth.role() = 'service_role');

-- Allow authenticated users to insert their own logs
CREATE POLICY "Users can insert own usage logs"
ON api_usage_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view summaries (assume admin check or public for now during dev)
CREATE POLICY "Admins can view api_usage_summary"
ON api_usage_summary FOR SELECT
USING (true); -- Simplified for dev speed, lock down later

-- Admins can manage config
CREATE POLICY "Admins can manage api_config"
ON api_config FOR ALL
USING (true); -- Simplified for dev speed

-- Function to get current month usage
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

-- Function to check if API is available
CREATE OR REPLACE FUNCTION is_api_available(p_api VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_config RECORD;
  v_current_usage BIGINT;
BEGIN
  -- Get config
  SELECT * INTO v_config FROM api_config WHERE api = p_api;
  
  IF NOT FOUND OR NOT v_config.is_enabled THEN
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

-- Function to log API usage
CREATE OR REPLACE FUNCTION log_api_usage(
  p_api VARCHAR,
  p_endpoint VARCHAR,
  p_user_id UUID DEFAULT NULL,
  p_business_id UUID DEFAULT NULL,
  p_session_id VARCHAR DEFAULT NULL,
  p_response_status VARCHAR DEFAULT 'success'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO api_usage_logs (
    api, 
    endpoint, 
    user_id, 
    business_id,
    session_id,
    response_status
  ) VALUES (
    p_api,
    p_endpoint,
    COALESCE(p_user_id, auth.uid()),
    p_business_id,
    p_session_id,
    p_response_status
  );
END;
$$;
