-- Migration: Add Rate Limiting Infrastructure
-- Created: 2025-01-30
-- Purpose: Implement rate limiting to prevent API abuse and ensure fair usage

-- ============================================================================
-- 1. Create rate_limit_logs table to track API requests
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address INET,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    window_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_endpoint ON public.rate_limit_logs(user_id, endpoint, window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_endpoint ON public.rate_limit_logs(ip_address, endpoint, window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window_end ON public.rate_limit_logs(window_end);

-- Enable RLS
ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (only service role can manage rate limits)
CREATE POLICY "Service role can manage rate limits"
    ON public.rate_limit_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- 2. Create rate_limit_config table for configurable limits
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_pattern TEXT UNIQUE NOT NULL,
    requests_per_window INTEGER NOT NULL DEFAULT 100,
    window_minutes INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.rate_limit_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies (read-only for authenticated users, full access for service role)
CREATE POLICY "Anyone can view rate limit config"
    ON public.rate_limit_config
    FOR SELECT
    USING (is_active = true);

CREATE POLICY "Service role can manage config"
    ON public.rate_limit_config
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- 3. Insert default rate limit configurations
-- ============================================================================

INSERT INTO public.rate_limit_config (endpoint_pattern, requests_per_window, window_minutes, description)
VALUES
    -- Authentication endpoints (stricter limits)
    ('auth/login', 5, 15, 'Login attempts - 5 per 15 minutes'),
    ('auth/register', 3, 60, 'Registration attempts - 3 per hour'),
    ('auth/reset-password', 3, 60, 'Password reset requests - 3 per hour'),
    
    -- Business operations (moderate limits)
    ('business/create', 5, 60, 'Business creation - 5 per hour'),
    ('business/update', 20, 60, 'Business updates - 20 per hour'),
    ('business/delete', 5, 60, 'Business deletion - 5 per hour'),
    
    -- Coupon operations (moderate limits)
    ('coupons/create', 10, 60, 'Coupon creation - 10 per hour'),
    ('coupons/update', 30, 60, 'Coupon updates - 30 per hour'),
    ('coupons/redeem', 50, 60, 'Coupon redemption - 50 per hour'),
    
    -- Search and browse (generous limits)
    ('search/general', 100, 1, 'General search - 100 per minute'),
    ('search/advanced', 60, 1, 'Advanced search - 60 per minute'),
    ('coupons/trending', 200, 1, 'Trending coupons - 200 per minute'),
    ('business/categories', 200, 1, 'Business categories - 200 per minute'),
    
    -- QR Code operations (moderate limits)
    ('qr/generate', 20, 1, 'QR code generation - 20 per minute'),
    ('qr/scan', 100, 1, 'QR code scanning - 100 per minute'),
    
    -- Check-in operations (moderate limits)
    ('checkin/create', 30, 60, 'Check-in creation - 30 per hour'),
    ('checkin/verify', 100, 60, 'Check-in verification - 100 per hour'),
    
    -- Analytics (generous limits for dashboard)
    ('analytics/business', 100, 1, 'Business analytics - 100 per minute'),
    ('analytics/coupon', 100, 1, 'Coupon analytics - 100 per minute'),
    
    -- Default catch-all (reasonable limit)
    ('*', 60, 1, 'Default rate limit - 60 per minute')
ON CONFLICT (endpoint_pattern) DO NOTHING;

-- ============================================================================
-- 4. Function to check rate limit
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_user_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_endpoint TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config RECORD;
    v_log RECORD;
    v_window_start TIMESTAMPTZ;
    v_window_end TIMESTAMPTZ;
    v_current_count INTEGER;
    v_is_allowed BOOLEAN;
    v_retry_after INTEGER;
BEGIN
    -- Get rate limit configuration for endpoint
    SELECT * INTO v_config
    FROM public.rate_limit_config
    WHERE is_active = true
        AND (endpoint_pattern = p_endpoint OR endpoint_pattern = '*')
    ORDER BY 
        CASE WHEN endpoint_pattern = p_endpoint THEN 1 ELSE 2 END
    LIMIT 1;
    
    -- If no config found, allow by default
    IF v_config IS NULL THEN
        RETURN jsonb_build_object(
            'allowed', true,
            'limit', NULL,
            'remaining', NULL,
            'reset_at', NULL
        );
    END IF;
    
    -- Calculate current window
    v_window_start := NOW() - (v_config.window_minutes || ' minutes')::INTERVAL;
    v_window_end := NOW() + (v_config.window_minutes || ' minutes')::INTERVAL;
    
    -- Check existing log within window
    IF p_user_id IS NOT NULL THEN
        SELECT * INTO v_log
        FROM public.rate_limit_logs
        WHERE user_id = p_user_id
            AND endpoint = p_endpoint
            AND window_start >= v_window_start
            AND window_end <= v_window_end
        ORDER BY window_start DESC
        LIMIT 1;
    ELSIF p_ip_address IS NOT NULL THEN
        SELECT * INTO v_log
        FROM public.rate_limit_logs
        WHERE ip_address = p_ip_address
            AND endpoint = p_endpoint
            AND window_start >= v_window_start
            AND window_end <= v_window_end
        ORDER BY window_start DESC
        LIMIT 1;
    END IF;
    
    -- Get or initialize count
    IF v_log IS NULL THEN
        v_current_count := 0;
    ELSE
        v_current_count := v_log.request_count;
    END IF;
    
    -- Check if limit exceeded
    v_is_allowed := v_current_count < v_config.requests_per_window;
    
    -- Calculate retry after time in seconds
    IF NOT v_is_allowed AND v_log IS NOT NULL THEN
        v_retry_after := EXTRACT(EPOCH FROM (v_log.window_end - NOW()))::INTEGER;
    ELSE
        v_retry_after := NULL;
    END IF;
    
    -- Return rate limit status
    RETURN jsonb_build_object(
        'allowed', v_is_allowed,
        'limit', v_config.requests_per_window,
        'remaining', GREATEST(0, v_config.requests_per_window - v_current_count - 1),
        'reset_at', COALESCE(v_log.window_end, v_window_end),
        'retry_after', v_retry_after,
        'endpoint', p_endpoint
    );
END;
$$;

-- ============================================================================
-- 5. Function to record rate limit request
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_rate_limit_request(
    p_user_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_endpoint TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config RECORD;
    v_window_start TIMESTAMPTZ;
    v_window_end TIMESTAMPTZ;
    v_existing_log RECORD;
BEGIN
    -- Get rate limit configuration
    SELECT * INTO v_config
    FROM public.rate_limit_config
    WHERE is_active = true
        AND (endpoint_pattern = p_endpoint OR endpoint_pattern = '*')
    ORDER BY 
        CASE WHEN endpoint_pattern = p_endpoint THEN 1 ELSE 2 END
    LIMIT 1;
    
    -- If no config, return early
    IF v_config IS NULL THEN
        RETURN;
    END IF;
    
    -- Calculate window
    v_window_start := NOW();
    v_window_end := NOW() + (v_config.window_minutes || ' minutes')::INTERVAL;
    
    -- Try to update existing log or insert new one
    IF p_user_id IS NOT NULL THEN
        -- Check for existing log
        SELECT * INTO v_existing_log
        FROM public.rate_limit_logs
        WHERE user_id = p_user_id
            AND endpoint = p_endpoint
            AND window_end > NOW()
        ORDER BY window_start DESC
        LIMIT 1;
        
        IF v_existing_log IS NOT NULL THEN
            -- Update existing log
            UPDATE public.rate_limit_logs
            SET request_count = request_count + 1,
                updated_at = NOW()
            WHERE id = v_existing_log.id;
        ELSE
            -- Insert new log
            INSERT INTO public.rate_limit_logs (user_id, endpoint, window_start, window_end)
            VALUES (p_user_id, p_endpoint, v_window_start, v_window_end);
        END IF;
    ELSIF p_ip_address IS NOT NULL THEN
        -- Check for existing log
        SELECT * INTO v_existing_log
        FROM public.rate_limit_logs
        WHERE ip_address = p_ip_address
            AND endpoint = p_endpoint
            AND window_end > NOW()
        ORDER BY window_start DESC
        LIMIT 1;
        
        IF v_existing_log IS NOT NULL THEN
            -- Update existing log
            UPDATE public.rate_limit_logs
            SET request_count = request_count + 1,
                updated_at = NOW()
            WHERE id = v_existing_log.id;
        ELSE
            -- Insert new log
            INSERT INTO public.rate_limit_logs (ip_address, endpoint, window_start, window_end)
            VALUES (p_ip_address, p_endpoint, v_window_start, v_window_end);
        END IF;
    END IF;
END;
$$;

-- ============================================================================
-- 6. Function to clean up expired rate limit logs (run periodically)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Delete logs older than 24 hours
    DELETE FROM public.rate_limit_logs
    WHERE window_end < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$;

-- ============================================================================
-- 7. Create a scheduled job to clean up old logs (using pg_cron if available)
-- ============================================================================

-- Note: This requires pg_cron extension. If not available, run cleanup manually or via cron job
-- Uncomment if pg_cron is enabled:
-- SELECT cron.schedule('cleanup-rate-limits', '0 */6 * * *', 'SELECT public.cleanup_expired_rate_limits();');

-- ============================================================================
-- Comments and Documentation
-- ============================================================================

COMMENT ON TABLE public.rate_limit_logs IS 'Stores rate limiting request counts per user/IP and endpoint';
COMMENT ON TABLE public.rate_limit_config IS 'Configuration for rate limiting rules per endpoint pattern';
COMMENT ON FUNCTION public.check_rate_limit IS 'Checks if a request is allowed based on rate limits';
COMMENT ON FUNCTION public.record_rate_limit_request IS 'Records a request for rate limiting purposes';
COMMENT ON FUNCTION public.cleanup_expired_rate_limits IS 'Removes expired rate limit logs to keep table size manageable';