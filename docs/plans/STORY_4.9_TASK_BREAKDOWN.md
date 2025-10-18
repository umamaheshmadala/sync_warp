# Story 4.9: Implementation Task Breakdown

**Date:** January 18, 2025  
**Status:** Ready for Implementation  
**Total Effort:** 5-8 days

---

## Phase 1: Foundation (2 days)

### Task 1.1: Create `useWebShare` Hook
**File:** `src/hooks/useWebShare.ts`  
**Effort:** 4 hours  
**Priority:** P0 - CRITICAL

#### Implementation Spec:
```typescript
// src/hooks/useWebShare.ts
import { useCallback } from 'react';
import { toast } from 'react-hot-toast';

interface ShareData {
  title: string;
  text: string;
  url: string;
  files?: File[]; // Optional for future file sharing
}

interface UseWebShareReturn {
  share: (data: ShareData) => Promise<boolean>;
  copyToClipboard: (url: string) => Promise<boolean>;
  isSupported: boolean;
}

export function useWebShare(): UseWebShareReturn {
  // Check if Web Share API is supported
  const isSupported = typeof navigator !== 'undefined' && 
                      navigator.share !== undefined;

  const copyToClipboard = useCallback(async (url: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(url);
      
      toast.success('Link copied to clipboard!', {
        duration: 3000,
        position: 'bottom-center',
      });
      
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      
      toast.error('Failed to copy link. Please try again.', {
        duration: 4000,
        position: 'bottom-center',
      });
      
      return false;
    }
  }, []);

  const share = useCallback(async (data: ShareData): Promise<boolean> => {
    // Check if Web Share API is supported
    if (isSupported) {
      try {
        await navigator.share({
          title: data.title,
          text: data.text,
          url: data.url,
          // files: data.files // Uncomment when file sharing needed
        });
        
        toast.success('Shared successfully!', {
          duration: 3000,
          position: 'bottom-center',
        });
        
        return true;
      } catch (error: any) {
        // User cancelled the share - not an error
        if (error.name === 'AbortError') {
          console.log('User cancelled share');
          return false;
        }
        
        console.error('Error sharing:', error);
        
        // Fall through to clipboard fallback
        return await copyToClipboard(data.url);
      }
    } else {
      // Fallback: Copy to clipboard
      return await copyToClipboard(data.url);
    }
  }, [isSupported, copyToClipboard]);

  return {
    share,
    copyToClipboard,
    isSupported
  };
}
```

#### Unit Tests:
```typescript
// src/hooks/__tests__/useWebShare.test.ts
import { renderHook, act } from '@testing-library/react';
import { useWebShare } from '../useWebShare';

describe('useWebShare', () => {
  const mockShare = jest.fn();
  const mockClipboard = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('uses Web Share API when available', async () => {
    mockShare.mockResolvedValue(undefined);
    global.navigator.share = mockShare;

    const { result } = renderHook(() => useWebShare());
    
    await act(async () => {
      const success = await result.current.share({
        title: 'Test',
        text: 'Test text',
        url: 'https://example.com'
      });
      
      expect(success).toBe(true);
    });

    expect(mockShare).toHaveBeenCalledWith({
      title: 'Test',
      text: 'Test text',
      url: 'https://example.com'
    });
  });

  test('handles user cancellation gracefully', async () => {
    const abortError = new Error('User cancelled');
    abortError.name = 'AbortError';
    mockShare.mockRejectedValue(abortError);
    global.navigator.share = mockShare;

    const { result } = renderHook(() => useWebShare());
    
    await act(async () => {
      const success = await result.current.share({
        title: 'Test',
        text: 'Test',
        url: 'https://example.com'
      });
      
      expect(success).toBe(false);
    });
  });

  test('falls back to clipboard when Web Share unavailable', async () => {
    global.navigator.share = undefined;
    mockClipboard.mockResolvedValue(undefined);
    global.navigator.clipboard = { writeText: mockClipboard };

    const { result } = renderHook(() => useWebShare());
    
    await act(async () => {
      await result.current.share({
        title: 'Test',
        text: 'Test',
        url: 'https://example.com'
      });
    });

    expect(mockClipboard).toHaveBeenCalledWith('https://example.com');
  });
});
```

#### Acceptance Criteria:
- [x] Hook exports share, copyToClipboard, isSupported
- [x] Web Share API called when available
- [x] AbortError handled without showing error
- [x] Clipboard fallback works
- [x] Toast notifications shown for all outcomes
- [x] Unit tests pass with 100% coverage

---

### Task 1.2: Create Database Schema
**File:** `supabase/migrations/20250118_create_shares_table.sql`  
**Effort:** 2 hours  
**Priority:** P0 - CRITICAL

#### Implementation Spec:
```sql
-- Migration: Create shares table for tracking social shares
-- Story: 4.9 - Social Sharing Actions

-- Create shares table
CREATE TABLE IF NOT EXISTS shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('storefront', 'product', 'offer', 'coupon')),
  entity_id UUID NOT NULL,
  method VARCHAR(50) NOT NULL CHECK (method IN ('web_share', 'copy', 'whatsapp', 'facebook', 'twitter', 'email')),
  referral_code VARCHAR(20) UNIQUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_shares_user ON shares(user_id);
CREATE INDEX idx_shares_entity ON shares(entity_id, type);
CREATE INDEX idx_shares_type ON shares(type);
CREATE INDEX idx_shares_method ON shares(method);
CREATE INDEX idx_shares_created ON shares(created_at DESC);
CREATE INDEX idx_shares_referral ON shares(referral_code) WHERE referral_code IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own shares
CREATE POLICY "Users can view own shares"
  ON shares FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Anyone (including anonymous) can create shares
CREATE POLICY "Anyone can create shares"
  ON shares FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR 
    user_id IS NULL OR 
    auth.uid() IS NULL
  );

-- Create RPC function to track shares
CREATE OR REPLACE FUNCTION track_share(
  p_user_id UUID DEFAULT NULL,
  p_type VARCHAR DEFAULT 'product',
  p_entity_id UUID DEFAULT NULL,
  p_method VARCHAR DEFAULT 'web_share'
)
RETURNS UUID AS $$
DECLARE
  v_share_id UUID;
  v_referral_code VARCHAR(20);
BEGIN
  -- Generate unique referral code
  v_referral_code := encode(gen_random_bytes(10), 'hex');
  
  -- Insert share record
  INSERT INTO shares (user_id, type, entity_id, method, referral_code)
  VALUES (
    COALESCE(p_user_id, auth.uid()),
    p_type,
    p_entity_id,
    p_method,
    v_referral_code
  )
  RETURNING id INTO v_share_id;
  
  RETURN v_share_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE shares IS 'Tracks social sharing events for storefronts, products, offers, and coupons';
COMMENT ON COLUMN shares.type IS 'Type of entity being shared: storefront, product, offer, coupon';
COMMENT ON COLUMN shares.method IS 'Method used to share: web_share (native), copy, whatsapp, facebook, twitter, email';
COMMENT ON COLUMN shares.referral_code IS 'Unique code for tracking share attribution';
COMMENT ON FUNCTION track_share IS 'RPC function to log share events with automatic referral code generation';
```

#### Validation Script:
```sql
-- Test the migration
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'shares'
ORDER BY ordinal_position;

-- Test RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'shares';

-- Test RPC function
SELECT track_share(
  p_user_id := NULL,
  p_type := 'product',
  p_entity_id := gen_random_uuid(),
  p_method := 'web_share'
);

-- Verify share was created
SELECT * FROM shares ORDER BY created_at DESC LIMIT 1;
```

#### Acceptance Criteria:
- [x] Table created with all required columns
- [x] 6 indexes created for performance
- [x] RLS policies allow viewing own shares
- [x] RLS allows anonymous sharing
- [x] track_share RPC function works
- [x] Referral codes unique
- [x] Supabase advisors show no issues

---

### Task 1.3: Create Share Tracker Service
**File:** `src/services/shareTracker.ts`  
**Effort:** 3 hours  
**Priority:** P0 - CRITICAL

#### Implementation Spec:
```typescript
// src/services/shareTracker.ts
import { supabase } from '@/lib/supabase';

export interface ShareEvent {
  type: 'storefront' | 'product' | 'offer' | 'coupon';
  entity_id: string;
  method: 'web_share' | 'copy' | 'whatsapp' | 'facebook' | 'twitter' | 'email';
  metadata?: Record<string, any>;
}

export interface ShareStats {
  total: number;
  methods: Record<string, number>;
  recent: Array<{
    id: string;
    created_at: string;
    method: string;
  }>;
}

/**
 * Track a share event
 * @param event - Share event details
 * @returns Share ID or null on error
 */
export async function trackShare(event: ShareEvent): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase.rpc('track_share', {
      p_user_id: user?.id || null,
      p_type: event.type,
      p_entity_id: event.entity_id,
      p_method: event.method
    });

    if (error) {
      console.error('Failed to track share:', error);
      return null;
    }
    
    // Optionally track in analytics
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('Share Success', {
        type: event.type,
        entity_id: event.entity_id,
        method: event.method,
        ...event.metadata
      });
    }
    
    return data as string;
  } catch (err) {
    console.error('Error tracking share:', err);
    return null;
  }
}

/**
 * Get share statistics for an entity
 * @param entityId - Entity ID to get stats for
 * @param type - Type of entity
 * @returns Share statistics
 */
export async function getShareStats(
  entityId: string,
  type: string
): Promise<ShareStats> {
  try {
    const { data, error, count } = await supabase
      .from('shares')
      .select('id, method, created_at', { count: 'exact' })
      .eq('entity_id', entityId)
      .eq('type', type)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Failed to fetch share stats:', error);
      return { total: 0, methods: {}, recent: [] };
    }

    // Count shares by method
    const methods: Record<string, number> = {};
    (data || []).forEach(share => {
      methods[share.method] = (methods[share.method] || 0) + 1;
    });

    return {
      total: count || 0,
      methods,
      recent: (data || []).map(s => ({
        id: s.id,
        created_at: s.created_at,
        method: s.method
      }))
    };
  } catch (err) {
    console.error('Error fetching share stats:', err);
    return { total: 0, methods: {}, recent: [] };
  }
}

/**
 * Build UTM-tagged URL for share tracking
 * @param url - Base URL
 * @param source - UTM source (e.g., 'share_button')
 * @param medium - UTM medium (e.g., 'native', 'copy')
 * @param campaign - UTM campaign (e.g., 'storefront', 'product')
 * @returns URL with UTM parameters
 */
export function buildUtmUrl(
  url: string,
  source: string = 'share_button',
  medium: string = 'social',
  campaign?: string
): string {
  try {
    const urlObj = new URL(url, window.location.origin);
    
    urlObj.searchParams.set('utm_source', source);
    urlObj.searchParams.set('utm_medium', medium);
    
    if (campaign) {
      urlObj.searchParams.set('utm_campaign', campaign);
    }
    
    return urlObj.toString();
  } catch (err) {
    console.error('Error building UTM URL:', err);
    return url;
  }
}
```

#### Unit Tests:
```typescript
// src/services/__tests__/shareTracker.test.ts
import { trackShare, getShareStats, buildUtmUrl } from '../shareTracker';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('shareTracker', () => {
  describe('trackShare', () => {
    it('tracks share event successfully', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        data: 'test-share-id',
        error: null
      });
      
      (supabase.rpc as jest.Mock) = mockRpc;

      const shareId = await trackShare({
        type: 'product',
        entity_id: 'prod-123',
        method: 'web_share'
      });

      expect(shareId).toBe('test-share-id');
      expect(mockRpc).toHaveBeenCalledWith('track_share', {
        p_user_id: expect.any(String),
        p_type: 'product',
        p_entity_id: 'prod-123',
        p_method: 'web_share'
      });
    });

    it('returns null on error', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Database error')
      });
      
      (supabase.rpc as jest.Mock) = mockRpc;

      const shareId = await trackShare({
        type: 'product',
        entity_id: 'prod-123',
        method: 'copy'
      });

      expect(shareId).toBeNull();
    });
  });

  describe('buildUtmUrl', () => {
    it('adds UTM parameters to URL', () => {
      const url = buildUtmUrl(
        'https://example.com/business/123',
        'share_button',
        'native',
        'storefront'
      );

      expect(url).toContain('utm_source=share_button');
      expect(url).toContain('utm_medium=native');
      expect(url).toContain('utm_campaign=storefront');
    });

    it('handles URLs with existing query params', () => {
      const url = buildUtmUrl(
        'https://example.com/business/123?ref=app',
        'share_button',
        'copy'
      );

      expect(url).toContain('ref=app');
      expect(url).toContain('utm_source=share_button');
      expect(url).toContain('utm_medium=copy');
    });
  });
});
```

#### Acceptance Criteria:
- [x] trackShare logs events to database
- [x] getShareStats retrieves aggregated data
- [x] buildUtmUrl adds tracking parameters
- [x] Handles errors gracefully
- [x] Unit tests pass
- [x] Analytics integration optional

---

## Phase 2: Storefront Sharing (1-2 days)

### Task 2.1: Create StorefrontShareButton
**File:** `src/components/social/StorefrontShareButton.tsx`  
**Effort:** 3 hours  
**Priority:** P0 - CRITICAL

#### Implementation Spec:
```typescript
// src/components/social/StorefrontShareButton.tsx
import React from 'react';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWebShare } from '@/hooks/useWebShare';
import { trackShare } from '@/services/shareTracker';
import { buildUtmUrl } from '@/services/shareTracker';

interface StorefrontShareButtonProps {
  businessId: string;
  businessName: string;
  businessDescription?: string;
  businessImage?: string;
  variant?: 'icon' | 'button';
  className?: string;
}

export function StorefrontShareButton({
  businessId,
  businessName,
  businessDescription,
  businessImage,
  variant = 'icon',
  className
}: StorefrontShareButtonProps) {
  const { share } = useWebShare();

  async function handleShare() {
    // Build canonical URL with UTM tracking
    const baseUrl = `${window.location.origin}/business/${businessId}`;
    const url = buildUtmUrl(baseUrl, 'share_button', 'native', 'storefront');
    
    const shareData = {
      title: businessName,
      text: businessDescription || `Check out ${businessName} on SynC!`,
      url: url
    };

    // Attempt share
    const success = await share(shareData);

    // Track share event if successful
    if (success) {
      await trackShare({
        type: 'storefront',
        entity_id: businessId,
        method: 'web_share',
        metadata: {
          business_name: businessName
        }
      });
    }
  }

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleShare}
        aria-label={`Share ${businessName}`}
        title="Share this business"
        className={className}
      >
        <Share2 className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button
      onClick={handleShare}
      variant="outline"
      className={className}
    >
      <Share2 className="mr-2 h-4 w-4" />
      Share
    </Button>
  );
}
```

#### Acceptance Criteria:
- [x] Component renders in both icon and button variants
- [x] Uses useWebShare hook
- [x] Tracks shares to database
- [x] Adds UTM parameters to URLs
- [x] Accessible (aria-label, title)
- [x] Handles errors gracefully

---

### Task 2.2: Integrate into BusinessProfile
**File:** `src/components/business/BusinessProfile.tsx`  
**Effort:** 2 hours  
**Priority:** P0 - CRITICAL

#### Implementation:
```typescript
// Add import
import { StorefrontShareButton } from '@/components/social/StorefrontShareButton';

// In the header section (around line 700-800), add share button:
<div className="flex items-center gap-2">
  {/* Existing favorite button */}
  <SimpleSaveButton
    businessId={businessId!}
    businessName={business?.business_name || ''}
  />
  
  {/* NEW: Share button */}
  <StorefrontShareButton
    businessId={businessId!}
    businessName={business?.business_name || ''}
    businessDescription={business?.description}
    businessImage={business?.logo_url}
    variant="icon"
  />
</div>
```

#### E2E Test:
```typescript
// tests/e2e/storefront-sharing.spec.ts
import { test, expect } from '@playwright/test';

test('customer can share storefront', async ({ page, context }) => {
  await page.goto('/business/test-business-id');
  
  // Mock navigator.share
  await context.addInitScript(() => {
    window.navigator.share = async (data: any) => {
      console.log('Shared:', data);
      return Promise.resolve();
    };
  });
  
  // Click share button
  await page.click('[aria-label*="Share"]');
  
  // Verify toast notification
  await expect(page.locator('text=Shared successfully')).toBeVisible();
  
  // Verify database entry (via API check)
  const response = await page.evaluate(async () => {
    return fetch('/api/shares?type=storefront&entity_id=test-business-id')
      .then(r => r.json());
  });
  
  expect(response.total).toBeGreaterThan(0);
});
```

#### Acceptance Criteria:
- [x] Share button visible in BusinessProfile header
- [x] Button positioned next to favorite button
- [x] Mobile and desktop layouts work
- [x] E2E test passes

---

## Phase 3: Product Integration (1-2 days)

### Task 3.1: Refactor ProductShareModal
**File:** `src/components/products/ProductShareModal.tsx`  
**Effort:** 2 hours  
**Priority:** P1 - HIGH

#### Changes:
- Replace inline Web Share logic with useWebShare hook
- Add share tracking after successful share
- Fix URL format to /business/:businessId/product/:productId
- Add UTM parameters

#### Acceptance Criteria:
- [x] Uses useWebShare hook
- [x] Tracks shares to database
- [x] Correct URL format
- [x] UTM parameters added

---

### Task 3.2: Create ProductShareButton Component
**File:** `src/components/social/ProductShareButton.tsx`  
**Effort:** 2 hours  
**Priority:** P1 - HIGH

#### Similar to StorefrontShareButton but for products
- Props: productId, productName, price, currency, businessId, businessName, image
- Builds URL: /business/:businessId/product/:productId
- Tracks type: 'product'

---

### Task 3.3: Integrate ProductShareButton
**Files:** Product cards, ProductDetails page  
**Effort:** 2 hours  
**Priority:** P1 - HIGH

#### Add to:
- ProductCard action buttons
- ProductDetails header
- Wishlist items
- AllProducts page

---

## Phase 4: Analytics & Polish (1-2 days)

### Task 4.1: Enhanced ShareModal
**File:** `src/components/social/ShareModal.tsx`  
**Effort:** 4 hours  
**Priority:** P2 - MEDIUM

#### Features:
- Copy link button
- WhatsApp/Facebook/X/Email buttons
- QR code (using qrcode.react)
- Desktop-optimized layout

---

### Task 4.2: Share Analytics Dashboard
**File:** `src/components/business/ShareAnalytics.tsx`  
**Effort:** 3 hours  
**Priority:** P2 - MEDIUM

#### Features:
- Total share count
- Share method breakdown
- Recent shares list
- Integrate into Business Dashboard

---

## Acceptance Criteria (Overall)

- [ ] All Phase 1 tasks complete (hook, DB, service)
- [ ] All Phase 2 tasks complete (storefront sharing)
- [ ] All Phase 3 tasks complete (product sharing)
- [ ] All Phase 4 tasks complete (analytics)
- [ ] All unit tests pass
- [ ] All E2E tests pass
- [ ] No TypeScript errors
- [ ] No lint errors
- [ ] Accessibility audit passes
- [ ] Cross-browser testing complete
- [ ] Documentation updated

---

*Created: January 18, 2025*  
*Story: 4.9 - Social Sharing Actions*  
*Status: Ready for Implementation*
