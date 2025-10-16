# Rate Limiting Implementation Guide

## Overview

The SynC application now implements comprehensive rate limiting to prevent API abuse, ensure fair usage, and maintain system stability. This document describes the architecture, usage, and configuration of the rate limiting system.

## Architecture

### Database Layer

Rate limiting is implemented at the database level using PostgreSQL functions and tables:

1. **`rate_limit_logs` table**: Tracks request counts per user/IP and endpoint within time windows
2. **`rate_limit_config` table**: Stores configurable rate limit rules per endpoint pattern
3. **Database functions**:
   - `check_rate_limit()`: Checks if a request is allowed
   - `record_rate_limit_request()`: Records a request for tracking
   - `cleanup_expired_rate_limits()`: Cleans up old logs

### Service Layer

**`rateLimitService.ts`** provides the TypeScript interface to the database functions:

```typescript
import { rateLimitService, RateLimitError } from '@/services/rateLimitService';

// Check and enforce rate limit
try {
  await rateLimitService.enforceRateLimit('coupons/create', userId);
  // Proceed with operation
} catch (error) {
  if (error instanceof RateLimitError) {
    // Handle rate limit exceeded
  }
}
```

### React Integration

**`useRateLimit` hook** for component integration:

```typescript
import { useRateLimit } from '@/hooks/useRateLimit';

const { enforceRateLimit, isRateLimited, remainingRequests } = useRateLimit({
  endpoint: 'coupons/create',
  autoCheck: true
});
```

**`RateLimitBanner` component** for user feedback:

```tsx
import { RateLimitBanner } from '@/components/common/RateLimitBanner';

<RateLimitBanner endpoint="coupons/create" />
```

## Default Rate Limits

### Authentication Endpoints (Stricter)
- **Login attempts**: 5 per 15 minutes
- **Registration**: 3 per hour
- **Password reset**: 3 per hour

### Business Operations (Moderate)
- **Business creation**: 5 per hour
- **Business updates**: 20 per hour
- **Business deletion**: 5 per hour

### Coupon Operations (Moderate)
- **Coupon creation**: 10 per hour
- **Coupon updates**: 30 per hour
- **Coupon redemption**: 50 per hour

### Search and Browse (Generous)
- **General search**: 100 per minute
- **Advanced search**: 60 per minute
- **Trending coupons**: 200 per minute
- **Business categories**: 200 per minute

### QR Code Operations (Moderate)
- **QR code generation**: 20 per minute
- **QR code scanning**: 100 per minute

### Check-in Operations (Moderate)
- **Check-in creation**: 30 per hour
- **Check-in verification**: 100 per hour

### Analytics (Generous)
- **Business analytics**: 100 per minute
- **Coupon analytics**: 100 per minute

### Default Catch-all
- **All other endpoints**: 60 per minute

## Usage Examples

### 1. Basic Usage in a Service Function

```typescript
import { rateLimitService } from '@/services/rateLimitService';
import { supabase } from '@/lib/supabase';

async function createCoupon(data: CouponData, userId: string) {
  // Enforce rate limit before proceeding
  await rateLimitService.enforceRateLimit('coupons/create', userId);
  
  // Proceed with coupon creation
  const { data: coupon, error } = await supabase
    .from('coupons')
    .insert(data)
    .select()
    .single();
  
  return coupon;
}
```

### 2. React Component Integration

```tsx
import React from 'react';
import { useRateLimit } from '@/hooks/useRateLimit';
import { RateLimitBanner } from '@/components/common/RateLimitBanner';
import { RateLimitError } from '@/services/rateLimitService';
import { toast } from 'react-hot-toast';

function CouponCreationForm() {
  const { enforceRateLimit, isRateLimited, remainingRequests } = useRateLimit({
    endpoint: 'coupons/create',
    autoCheck: true
  });
  
  const handleSubmit = async (formData) => {
    try {
      // Check rate limit first
      await enforceRateLimit();
      
      // Proceed with form submission
      await createCoupon(formData);
      toast.success('Coupon created successfully!');
    } catch (error) {
      if (error instanceof RateLimitError) {
        const minutes = Math.ceil(error.retryAfter / 60);
        toast.error(`Rate limit exceeded. Try again in ${minutes} minutes.`);
      } else {
        toast.error('Failed to create coupon');
      }
    }
  };
  
  return (
    <div>
      <RateLimitBanner endpoint="coupons/create" />
      
      <form onSubmit={handleSubmit}>
        {/* Form fields */}
        
        <button 
          type="submit" 
          disabled={isRateLimited}
        >
          Create Coupon
          {remainingRequests !== null && ` (${remainingRequests} left)`}
        </button>
      </form>
    </div>
  );
}
```

### 3. API Route Protection

```typescript
// For Next.js API routes or similar
import { rateLimitService } from '@/services/rateLimitService';

export async function POST(request: Request) {
  const userId = await getUserId(request);
  const ipAddress = rateLimitService.getIpAddress(request.headers);
  
  try {
    // Check rate limit
    await rateLimitService.enforceRateLimit(
      'api/coupons',
      userId,
      ipAddress
    );
    
    // Proceed with request handling
    // ...
    
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return Response.json(
        { error: error.message },
        { 
          status: 429,
          headers: rateLimitService.formatRateLimitHeaders(error)
        }
      );
    }
    throw error;
  }
}
```

### 4. Displaying Rate Limit Status

```tsx
import { useRateLimitStatus } from '@/hooks/useRateLimit';

function RateLimitIndicator({ endpoint }) {
  const {
    statusMessage,
    resetTimeFormatted,
    shouldShowWarning,
    shouldShowError
  } = useRateLimitStatus(endpoint);
  
  if (!statusMessage) return null;
  
  return (
    <div className={shouldShowError ? 'text-red-600' : 'text-yellow-600'}>
      <p>{statusMessage}</p>
      {resetTimeFormatted && <p>Resets at {resetTimeFormatted}</p>}
    </div>
  );
}
```

## Configuration

### Modifying Rate Limits

Rate limits can be updated in the database:

```sql
-- Update an existing rate limit
UPDATE public.rate_limit_config
SET requests_per_window = 20,
    window_minutes = 60
WHERE endpoint_pattern = 'coupons/create';

-- Add a new rate limit
INSERT INTO public.rate_limit_config (endpoint_pattern, requests_per_window, window_minutes, description)
VALUES ('my-new-endpoint', 50, 1, 'My custom endpoint - 50 per minute');

-- Disable a rate limit
UPDATE public.rate_limit_config
SET is_active = false
WHERE endpoint_pattern = 'coupons/create';
```

### Adding Rate Limiting to New Endpoints

1. **Add configuration in database migration** (if needed):

```sql
INSERT INTO public.rate_limit_config (endpoint_pattern, requests_per_window, window_minutes, description)
VALUES ('new-feature/action', 30, 60, 'New feature action - 30 per hour');
```

2. **Integrate in your code**:

```typescript
import { rateLimitService } from '@/services/rateLimitService';

async function myNewFeature(userId: string) {
  await rateLimitService.enforceRateLimit('new-feature/action', userId);
  // Proceed with operation
}
```

3. **Add UI feedback** (optional):

```tsx
<RateLimitBanner endpoint="new-feature/action" />
```

## Maintenance

### Cleanup

Rate limit logs are automatically cleaned up by the `cleanup_expired_rate_limits()` function. Logs older than 24 hours are removed.

**Manual cleanup**:

```sql
SELECT public.cleanup_expired_rate_limits();
```

**Scheduled cleanup** (if pg_cron is enabled):

```sql
SELECT cron.schedule('cleanup-rate-limits', '0 */6 * * *', 'SELECT public.cleanup_expired_rate_limits();');
```

### Monitoring

Check current rate limit status:

```sql
-- View active rate limits
SELECT * FROM public.rate_limit_config WHERE is_active = true ORDER BY endpoint_pattern;

-- View recent rate limit activity
SELECT 
  endpoint,
  COUNT(*) as total_requests,
  COUNT(DISTINCT user_id) as unique_users,
  MAX(request_count) as max_requests_per_window
FROM public.rate_limit_logs
WHERE window_end > NOW() - INTERVAL '1 hour'
GROUP BY endpoint
ORDER BY total_requests DESC;

-- Find users hitting rate limits
SELECT 
  user_id,
  endpoint,
  request_count,
  window_end
FROM public.rate_limit_logs
WHERE request_count >= (
  SELECT requests_per_window 
  FROM public.rate_limit_config 
  WHERE endpoint_pattern = rate_limit_logs.endpoint
)
AND window_end > NOW()
ORDER BY window_end DESC;
```

## Testing

### Testing Rate Limits

```typescript
import { rateLimitService } from '@/services/rateLimitService';

// Test hitting rate limit
async function testRateLimit() {
  const endpoint = 'test/endpoint';
  const userId = 'test-user-id';
  
  for (let i = 0; i < 15; i++) {
    try {
      await rateLimitService.enforceRateLimit(endpoint, userId);
      console.log(`Request ${i + 1}: Success`);
    } catch (error) {
      if (error instanceof RateLimitError) {
        console.log(`Request ${i + 1}: Rate limited!`, {
          retryAfter: error.retryAfter,
          limit: error.limit
        });
      }
    }
  }
}
```

## Troubleshooting

### Rate Limit Not Working

1. **Check database functions are created**:

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%rate_limit%';
```

2. **Verify configuration exists**:

```sql
SELECT * FROM public.rate_limit_config WHERE endpoint_pattern = 'your-endpoint';
```

3. **Check logs for errors**:
   - Browser console for client-side errors
   - Supabase logs for database errors

### User Incorrectly Rate Limited

1. **Check current status**:

```sql
SELECT * FROM public.rate_limit_logs 
WHERE user_id = 'user-id-here' 
AND endpoint = 'endpoint-here'
AND window_end > NOW();
```

2. **Clear specific rate limit**:

```sql
DELETE FROM public.rate_limit_logs 
WHERE user_id = 'user-id-here' 
AND endpoint = 'endpoint-here';
```

### Rate Limits Too Strict/Lenient

Adjust the configuration:

```sql
-- Make stricter
UPDATE public.rate_limit_config
SET requests_per_window = 5  -- Reduce from 10
WHERE endpoint_pattern = 'endpoint-pattern';

-- Make more lenient  
UPDATE public.rate_limit_config
SET requests_per_window = 20  -- Increase from 10
WHERE endpoint_pattern = 'endpoint-pattern';
```

## Best Practices

1. **Always handle RateLimitError**: Provide user-friendly messages
2. **Show rate limit status**: Use `RateLimitBanner` or indicators
3. **Test rate limits**: Ensure they work before deploying
4. **Monitor usage**: Check logs regularly for abuse patterns
5. **Adjust as needed**: Rate limits should evolve with usage patterns
6. **Document custom endpoints**: Keep this guide updated

## Security Considerations

1. **IP-based limiting**: For unauthenticated requests
2. **User-based limiting**: For authenticated requests
3. **Endpoint patterns**: Use specific patterns when possible
4. **Fail-safe**: Allows requests on rate limit check failures (logged)
5. **Headers**: Standard rate limit headers for API responses

## Future Enhancements

- [ ] Redis-based caching for faster lookups
- [ ] Dynamic rate limiting based on user tier/subscription
- [ ] Geographic rate limiting
- [ ] Rate limit bypass for admin users
- [ ] Advanced analytics dashboard
- [ ] Automatic rate limit adjustment based on load

---

## Related Files

- **Migration**: `supabase/migrations/20250130_add_rate_limiting.sql`
- **Service**: `src/services/rateLimitService.ts`
- **Hook**: `src/hooks/useRateLimit.ts`
- **Component**: `src/components/common/RateLimitBanner.tsx`
- **Example**: `src/components/business/CouponCreator.tsx`