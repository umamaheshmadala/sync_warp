# Story 4C.6: API Usage Monitoring

**Epic:** Epic 4C - Smart Business Onboarding  
**Priority:** 🟡 P2 - MEDIUM  
**Effort:** 1 day  
**Dependencies:** Story 4C.1 (Google Places API)  
**Status:** 📋 Ready for Implementation

---

## Overview

Implement tracking and monitoring for Google Places API usage to stay within free tier limits and alert before exceeding quotas. Essential for cost control and graceful degradation.

---

## User Stories

### US-4C.6.1: Track API Calls
**As the** platform  
**I want to** track every Google API call  
**So that** I know our usage patterns

**Acceptance Criteria:**
- [ ] Every autocomplete call logged
- [ ] Every place details call logged
- [ ] Logs include timestamp, endpoint, user_id
- [ ] Queryable by date range

---

### US-4C.6.2: Usage Alerts
**As the** platform  
**I want to** receive alerts at usage thresholds  
**So that** I can take action before exceeding limits

**Acceptance Criteria:**
- [ ] Email alert at 50% usage
- [ ] Slack/Email alert at 80% usage
- [ ] Critical alert at 95% usage
- [ ] Daily usage summary available

---

### US-4C.6.3: Graceful Degradation
**As the** platform  
**I want to** disable autocomplete when near limit  
**So that** we don't incur unexpected costs

**Acceptance Criteria:**
- [ ] Autocomplete disabled at 95% usage
- [ ] Manual entry remains available
- [ ] Message explains why search is unavailable
- [ ] Resets monthly

---

### US-4C.6.4: Admin Dashboard
**As an** admin  
**I want to** view API usage statistics  
**So that** I can monitor costs

**Acceptance Criteria:**
- [ ] Current month usage displayed
- [ ] Usage by day chart
- [ ] Usage by endpoint breakdown
- [ ] Estimated cost displayed

---

## Database Schema

**File:** `supabase/migrations/20260111_02_api_usage_tracking.sql`

```sql
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
CREATE INDEX idx_api_usage_api_date 
ON api_usage_logs(api, created_at DESC);

CREATE INDEX idx_api_usage_user_date 
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

CREATE INDEX idx_api_usage_summary_api_date 
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

-- Allow service role full access
CREATE POLICY "Service role can manage api_usage_logs"
ON api_usage_logs FOR ALL
USING (auth.role() = 'service_role');

-- Allow authenticated users to insert their own logs
CREATE POLICY "Users can insert own usage logs"
ON api_usage_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view summaries
CREATE POLICY "Admins can view api_usage_summary"
ON api_usage_summary FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Admins can manage config
CREATE POLICY "Admins can manage api_config"
ON api_config FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

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
    (COUNT(*)::DECIMAL / v_monthly_limit * 100)::DECIMAL(5,2) as percentage_used,
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
```

---

## Service Implementation

**File:** `src/services/apiUsageService.ts`

```typescript
import { supabase } from '@/lib/supabase';

export interface ApiUsageStats {
  totalRequests: number;
  autocompleteRequests: number;
  detailsRequests: number;
  uniqueUsers: number;
  estimatedCost: number;
  percentageUsed: number;
  monthlyLimit: number;
  isAvailable: boolean;
}

/**
 * Log an API call to the usage tracking table
 */
export async function logApiUsage(
  api: string,
  endpoint: string,
  options?: {
    businessId?: string;
    sessionId?: string;
    status?: 'success' | 'error' | 'rate_limited';
  }
): Promise<void> {
  try {
    await supabase.rpc('log_api_usage', {
      p_api: api,
      p_endpoint: endpoint,
      p_business_id: options?.businessId || null,
      p_session_id: options?.sessionId || null,
      p_response_status: options?.status || 'success'
    });
  } catch (error) {
    // Don't throw - logging failures shouldn't break the app
    console.error('Failed to log API usage:', error);
  }
}

/**
 * Check if an API is available (not over quota)
 */
export async function isApiAvailable(api: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_api_available', {
      p_api: api
    });

    if (error) {
      console.error('Error checking API availability:', error);
      return true; // Fail open - don't block on check failures
    }

    return data ?? true;
  } catch (error) {
    console.error('Error checking API availability:', error);
    return true;
  }
}

/**
 * Get current month usage statistics
 */
export async function getApiUsageStats(api: string): Promise<ApiUsageStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_current_month_api_usage', {
      p_api: api
    });

    if (error || !data || data.length === 0) {
      console.error('Error getting API usage stats:', error);
      return null;
    }

    const stats = data[0];
    
    return {
      totalRequests: stats.total_requests,
      autocompleteRequests: stats.autocomplete_requests,
      detailsRequests: stats.details_requests,
      uniqueUsers: stats.unique_users,
      estimatedCost: parseFloat(stats.estimated_cost) || 0,
      percentageUsed: parseFloat(stats.percentage_used) || 0,
      monthlyLimit: stats.monthly_limit,
      isAvailable: stats.percentage_used < 95
    };
  } catch (error) {
    console.error('Error getting API usage stats:', error);
    return null;
  }
}

/**
 * Get usage by day for charts
 */
export async function getUsageByDay(
  api: string,
  days: number = 30
): Promise<Array<{ date: string; count: number }>> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('api_usage_logs')
      .select('created_at')
      .eq('api', api)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group by day
    const byDay: Record<string, number> = {};
    data?.forEach(row => {
      const date = row.created_at.split('T')[0];
      byDay[date] = (byDay[date] || 0) + 1;
    });

    return Object.entries(byDay).map(([date, count]) => ({ date, count }));
  } catch (error) {
    console.error('Error getting usage by day:', error);
    return [];
  }
}
```

---

## Admin Dashboard Widget

**File:** `src/components/admin/ApiUsageWidget.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { getApiUsageStats, ApiUsageStats } from '@/services/apiUsageService';
import { cn } from '@/lib/utils';

interface ApiUsageWidgetProps {
  api?: string;
}

export function ApiUsageWidget({ api = 'google_places' }: ApiUsageWidgetProps) {
  const [stats, setStats] = useState<ApiUsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      const data = await getApiUsageStats(api);
      setStats(data);
      setLoading(false);
    }
    fetchStats();
  }, [api]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
        <div className="h-8 bg-gray-200 rounded w-1/3" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <p className="text-gray-500">Unable to load API usage</p>
      </div>
    );
  }

  const getStatusColor = (percentage: number) => {
    if (percentage >= 95) return 'text-red-600 bg-red-100';
    if (percentage >= 80) return 'text-amber-600 bg-amber-100';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-600" />
          Google Places API
        </h3>
        <span className={cn(
          "px-2 py-1 rounded-full text-xs font-medium",
          getStatusColor(stats.percentageUsed)
        )}>
          {stats.percentageUsed.toFixed(1)}% used
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{stats.totalRequests.toLocaleString()} requests</span>
          <span>{stats.monthlyLimit.toLocaleString()} limit</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-500",
              stats.percentageUsed >= 95 ? "bg-red-500" :
              stats.percentageUsed >= 80 ? "bg-amber-500" :
              stats.percentageUsed >= 50 ? "bg-yellow-500" :
              "bg-green-500"
            )}
            style={{ width: `${Math.min(stats.percentageUsed, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-500">Autocomplete</p>
          <p className="text-lg font-semibold text-gray-900">
            {stats.autocompleteRequests.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-500">Details</p>
          <p className="text-lg font-semibold text-gray-900">
            {stats.detailsRequests.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-500">Unique Users</p>
          <p className="text-lg font-semibold text-gray-900">
            {stats.uniqueUsers.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <DollarSign className="w-3 h-3" /> Est. Cost
          </p>
          <p className="text-lg font-semibold text-gray-900">
            ${stats.estimatedCost.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Warning */}
      {stats.percentageUsed >= 80 && (
        <div className={cn(
          "mt-4 p-3 rounded-lg flex items-start gap-2",
          stats.percentageUsed >= 95 ? "bg-red-50" : "bg-amber-50"
        )}>
          <AlertTriangle className={cn(
            "w-5 h-5 flex-shrink-0",
            stats.percentageUsed >= 95 ? "text-red-500" : "text-amber-500"
          )} />
          <div>
            <p className={cn(
              "font-medium",
              stats.percentageUsed >= 95 ? "text-red-800" : "text-amber-800"
            )}>
              {stats.percentageUsed >= 95 
                ? "Critical: Autocomplete disabled" 
                : "Warning: Approaching limit"}
            </p>
            <p className={cn(
              "text-sm",
              stats.percentageUsed >= 95 ? "text-red-600" : "text-amber-600"
            )}>
              {stats.percentageUsed >= 95
                ? "Manual entry only until next month"
                : `${(100 - stats.percentageUsed).toFixed(1)}% remaining`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApiUsageWidget;
```

---

## Acceptance Criteria

### Logging
- [ ] Every autocomplete call logged with endpoint "autocomplete"
- [ ] Every details call logged with endpoint "details"
- [ ] Logs include user_id when available
- [ ] Session ID tracked for billing optimization check

### Quota Check
- [ ] `is_api_available()` returns false at 95%
- [ ] Check is fast (<50ms)
- [ ] Fails open (returns true on error)

### Dashboard
- [ ] Current usage percentage displayed
- [ ] Progress bar with color indicators
- [ ] Breakdown by endpoint type
- [ ] Estimated cost calculated
- [ ] Warning/critical alerts shown

### Alerts
- [ ] Email at 50% (daily digest)
- [ ] Email at 80% (immediate)
- [ ] Email at 95% (critical)

---

## Definition of Done

- [ ] Database migration applied
- [ ] `apiUsageService.ts` implemented
- [ ] `logApiUsage` called in businessSearchService
- [ ] Admin widget implemented
- [ ] Graceful degradation working
- [ ] All acceptance criteria met

---

**Story Status:** 📋 Ready for Implementation  
**Estimated Hours:** 8 hours
