-- Fix ambiguous column reference by aliasing variables and qualifying columns

CREATE OR REPLACE FUNCTION get_current_month_api_usage(p_api VARCHAR)
RETURNS TABLE (
  total_requests BIGINT,
  autocomplete_requests BIGINT,
  details_requests BIGINT,
  unique_users BIGINT,
  estimated_cost DECIMAL,
  percentage_used DECIMAL,
  monthly_limit INTEGER -- Output column name
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _limit INTEGER; -- Renamed variable to avoid conflict
  _pricing JSONB;
BEGIN
  -- Get config
  SELECT c.monthly_limit, c.pricing 
  INTO _limit, _pricing
  FROM api_config c
  WHERE c.api = p_api;

  -- Default defaults if config missing
  IF _limit IS NULL THEN
     _limit := 10000;
     _pricing := '{"autocomplete": 0.00283, "details": 0.017}'::jsonb;
  END IF;

  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_requests,
    COUNT(*) FILTER (WHERE endpoint = 'autocomplete')::BIGINT as autocomplete_requests,
    COUNT(*) FILTER (WHERE endpoint = 'details')::BIGINT as details_requests,
    COUNT(DISTINCT user_id)::BIGINT as unique_users,
    (
      COUNT(*) FILTER (WHERE endpoint = 'autocomplete') * (_pricing->>'autocomplete')::DECIMAL +
      COUNT(*) FILTER (WHERE endpoint = 'details') * (_pricing->>'details')::DECIMAL
    ) as estimated_cost,
    (COUNT(*)::DECIMAL / NULLIF(_limit, 0) * 100)::DECIMAL(5,2) as percentage_used,
    _limit -- Return the variable
  FROM api_usage_logs
  WHERE api = p_api
    AND created_at >= date_trunc('month', CURRENT_DATE);
END;
$$;
