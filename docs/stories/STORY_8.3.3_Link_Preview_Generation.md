# 🔗 STORY 8.3.3: Link Preview Generation

**Parent Epic:** [EPIC 8.3 - Media Attachments & Rich Content Sharing](../epics/EPIC_8.3_Media_Rich_Content.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 2 days  
**Priority:** P1 - High  
**Status:** 📋 Ready for Implementation

---

## 🎯 **Story Goal**

Implement **link preview generation** to automatically detect URLs in messages and display rich preview cards with Open Graph metadata (title, description, image). Special handling for SynC coupon/deal URLs to show enhanced previews using existing data.

---

## 📖 **User Stories**

### As a user, I want to:
1. See rich preview cards when I share a link in a message
2. See preview cards automatically generated as I type
3. Have SynC coupon/deal links show enhanced previews with discount info
4. Be able to remove a link preview before sending
5. See link previews load quickly (< 1s)

### Acceptance Criteria:
- ✅ Auto-detects URLs in message content
- ✅ Generates preview within 1 second
- ✅ Shows title, description, and image from Open Graph tags
- ✅ Special handling for SynC coupon/deal URLs
- ✅ Preview is optional (can be removed)
- ✅ Handles broken links gracefully

---

## 🧩 **Implementation Tasks**

### **Phase 1: Link Preview Service** (0.75 days)

#### Task 1.1: Create Link Preview Service
```typescript
// src/services/linkPreviewService.ts
import { supabase } from '../lib/supabase'

interface LinkPreview {
  url: string
  title: string
  description: string
  image?: string
  favicon?: string
  type: 'generic' | 'sync-coupon' | 'sync-deal'
  metadata?: Record<string, any>
}

class LinkPreviewService {
  private readonly URL_REGEX = /(https?:\/\/[^\s]+)/g
  private readonly SYNC_COUPON_REGEX = /https?:\/\/sync\.app\/coupons\/([a-zA-Z0-9-]+)/
  private readonly SYNC_DEAL_REGEX = /https?:\/\/sync\.app\/offers\/([a-zA-Z0-9-]+)/

  /**
   * Extract URLs from message content
   */
  extractUrls(text: string): string[] {
    const matches = text.match(this.URL_REGEX)
    return matches ? Array.from(new Set(matches)) : []
  }

  /**
   * Detect if URL is a SynC coupon/deal
   */
  private detectSyncUrl(url: string): { type: 'sync-coupon' | 'sync-deal' | null; id: string | null } {
    let match = url.match(this.SYNC_COUPON_REGEX)
    if (match) return { type: 'sync-coupon', id: match[1] }

    match = url.match(this.SYNC_DEAL_REGEX)
    if (match) return { type: 'sync-deal', id: match[1] }

    return { type: null, id: null }
  }

  /**
   * Fetch SynC coupon preview data
   */
  private async fetchSyncCouponPreview(couponId: string): Promise<LinkPreview | null> {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('id, title, description, discount_value, discount_type, brand:brands(name, logo_url)')
        .eq('id', couponId)
        .single()

      if (error || !data) return null

      return {
        url: `https://sync.app/coupons/${couponId}`,
        title: data.title,
        description: data.description || `${data.discount_value}${data.discount_type === 'percentage' ? '%' : ''} off`,
        image: data.brand?.logo_url,
        type: 'sync-coupon',
        metadata: {
          discountValue: data.discount_value,
          discountType: data.discount_type,
          brandName: data.brand?.name
        }
      }
    } catch (error) {
      console.error('Failed to fetch coupon preview:', error)
      return null
    }
  }

  /**
   * Fetch SynC deal preview data
   */
  private async fetchSyncDealPreview(dealId: string): Promise<LinkPreview | null> {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('id, title, description, image_url, price, original_price, brand:brands(name, logo_url)')
        .eq('id', dealId)
        .single()

      if (error || !data) return null

      const savings = data.original_price && data.price 
        ? data.original_price - data.price 
        : 0

      return {
        url: `https://sync.app/offers/${dealId}`,
        title: data.title,
        description: data.description || `Save $${savings.toFixed(2)}`,
        image: data.image_url || data.brand?.logo_url,
        type: 'sync-deal',
        metadata: {
          price: data.price,
          originalPrice: data.original_price,
          savings,
          brandName: data.brand?.name
        }
      }
    } catch (error) {
      console.error('Failed to fetch deal preview:', error)
      return null
    }
  }

  /**
   * Fetch Open Graph metadata for generic URL
   * Note: This requires a backend proxy to avoid CORS issues
   */
  private async fetchOpenGraphPreview(url: string): Promise<LinkPreview | null> {
    try {
      // Call backend API to fetch Open Graph data
      const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      if (!response.ok) throw new Error('Failed to fetch preview')

      const data = await response.json()

      return {
        url,
        title: data.title || new URL(url).hostname,
        description: data.description || '',
        image: data.image,
        favicon: data.favicon,
        type: 'generic'
      }
    } catch (error) {
      console.error('Failed to fetch Open Graph preview:', error)
      
      // Fallback: use hostname as title
      try {
        const hostname = new URL(url).hostname
        return {
          url,
          title: hostname,
          description: '',
          type: 'generic'
        }
      } catch {
        return null
      }
    }
  }

  /**
   * Generate link preview
   */
  async generatePreview(url: string): Promise<LinkPreview | null> {
    // Check if it's a SynC URL
    const syncDetection = this.detectSyncUrl(url)

    if (syncDetection.type === 'sync-coupon' && syncDetection.id) {
      return this.fetchSyncCouponPreview(syncDetection.id)
    }

    if (syncDetection.type === 'sync-deal' && syncDetection.id) {
      return this.fetchSyncDealPreview(syncDetection.id)
    }

    // Generic URL - fetch Open Graph data
    return this.fetchOpenGraphPreview(url)
  }

  /**
   * Generate previews for all URLs in text
   */
  async generatePreviews(text: string): Promise<LinkPreview[]> {
    const urls = this.extractUrls(text)
    
    // Limit to first 3 URLs to avoid performance issues
    const urlsToPreview = urls.slice(0, 3)

    const previews = await Promise.allSettled(
      urlsToPreview.map(url => this.generatePreview(url))
    )

    return previews
      .filter((result): result is PromiseFulfilledResult<LinkPreview | null> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value as LinkPreview)
  }
}

export const linkPreviewService = new LinkPreviewService()
```

**🛢 Supabase MCP Testing:**
```bash
# Test fetching coupon data
warp mcp run supabase "execute_sql 
  SELECT id, title, description, discount_value, discount_type, brand_id 
  FROM coupons 
  WHERE id = 'test-coupon-id';
"

# Test fetching deal data
warp mcp run supabase "execute_sql 
  SELECT id, title, description, price, original_price, image_url, brand_id 
  FROM offers 
  WHERE id = 'test-deal-id';
"

# Check brands table for logo URLs
warp mcp run supabase "execute_sql 
  SELECT id, name, logo_url 
  FROM brands 
  LIMIT 10;
"
```

**🧠 Context7 MCP Analysis:**
```bash
# Analyze URL detection logic
warp mcp run context7 "review extractUrls method for edge cases with malformed URLs"

# Check Open Graph fetching security
warp mcp run context7 "analyze fetchOpenGraphPreview for security vulnerabilities"

# Optimize performance
warp mcp run context7 "suggest optimizations for generatePreviews with multiple URLs"
```

---

### **Phase 2: Link Preview Hook** (0.5 days)

#### Task 2.1: Create useLinkPreview Hook
```typescript
// src/hooks/useLinkPreview.ts
import { useState, useCallback, useEffect } from 'react'
import { linkPreviewService, LinkPreview } from '../services/linkPreviewService'
import { useDebounce } from './useDebounce'

export function useLinkPreview(text: string) {
  const [previews, setPreviews] = useState<LinkPreview[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [removedPreviews, setRemovedPreviews] = useState<Set<string>>(new Set())

  // Debounce text input to avoid excessive API calls
  const debouncedText = useDebounce(text, 500)

  useEffect(() => {
    let cancelled = false

    const generatePreviews = async () => {
      const urls = linkPreviewService.extractUrls(debouncedText)
      if (urls.length === 0) {
        setPreviews([])
        return
      }

      setIsLoading(true)

      try {
        const newPreviews = await linkPreviewService.generatePreviews(debouncedText)
        
        if (!cancelled) {
          // Filter out removed previews
          const filteredPreviews = newPreviews.filter(
            preview => !removedPreviews.has(preview.url)
          )
          setPreviews(filteredPreviews)
        }
      } catch (error) {
        console.error('Failed to generate previews:', error)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    generatePreviews()

    return () => {
      cancelled = true
    }
  }, [debouncedText, removedPreviews])

  const removePreview = useCallback((url: string) => {
    setRemovedPreviews(prev => new Set(prev).add(url))
    setPreviews(prev => prev.filter(p => p.url !== url))
  }, [])

  const reset = useCallback(() => {
    setPreviews([])
    setRemovedPreviews(new Set())
    setIsLoading(false)
  }, [])

  return {
    previews,
    isLoading,
    removePreview,
    reset
  }
}
```

---

### **Phase 3: Link Preview Components** (0.75 days)

#### Task 3.1: Create LinkPreviewCard Component
```typescript
// src/components/messaging/LinkPreviewCard.tsx
import React from 'react'
import { X, Gift, Tag, ExternalLink } from 'lucide-react'
import { LinkPreview } from '../../services/linkPreviewService'

interface Props {
  preview: LinkPreview
  onRemove?: () => void
  showRemoveButton?: boolean
}

export function LinkPreviewCard({ preview, onRemove, showRemoveButton = true }: Props) {
  const renderSyncCouponPreview = () => (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 flex gap-3">
      <div className="flex-shrink-0">
        <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
          <Gift className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 text-sm line-clamp-1">
              {preview.title}
            </h4>
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
              {preview.description}
            </p>
            {preview.metadata?.brandName && (
              <p className="text-xs text-blue-600 mt-1">
                {preview.metadata.brandName}
              </p>
            )}
          </div>
          {showRemoveButton && onRemove && (
            <button
              onClick={onRemove}
              className="flex-shrink-0 p-1 hover:bg-blue-100 rounded"
              aria-label="Remove preview"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  )

  const renderSyncDealPreview = () => (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 flex gap-3">
      <div className="flex-shrink-0">
        {preview.image ? (
          <img 
            src={preview.image} 
            alt=""
            className="w-12 h-12 rounded-lg object-cover"
          />
        ) : (
          <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
            <Tag className="w-6 h-6 text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 text-sm line-clamp-1">
              {preview.title}
            </h4>
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
              {preview.description}
            </p>
            {preview.metadata?.savings && (
              <p className="text-xs font-medium text-green-600 mt-1">
                Save ${preview.metadata.savings.toFixed(2)}
              </p>
            )}
          </div>
          {showRemoveButton && onRemove && (
            <button
              onClick={onRemove}
              className="flex-shrink-0 p-1 hover:bg-green-100 rounded"
              aria-label="Remove preview"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  )

  const renderGenericPreview = () => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
      {preview.image && (
        <img 
          src={preview.image} 
          alt=""
          className="w-full h-32 object-cover"
        />
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 text-sm line-clamp-1 flex items-center gap-1">
              {preview.favicon && (
                <img src={preview.favicon} alt="" className="w-4 h-4" />
              )}
              {preview.title}
            </h4>
            {preview.description && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {preview.description}
              </p>
            )}
            <a 
              href={preview.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline mt-1 inline-flex items-center gap-1"
            >
              {new URL(preview.url).hostname}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          {showRemoveButton && onRemove && (
            <button
              onClick={onRemove}
              className="flex-shrink-0 p-1 hover:bg-gray-200 rounded"
              aria-label="Remove preview"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  )

  switch (preview.type) {
    case 'sync-coupon':
      return renderSyncCouponPreview()
    case 'sync-deal':
      return renderSyncDealPreview()
    case 'generic':
    default:
      return renderGenericPreview()
  }
}
```

#### Task 3.2: Integrate into MessageComposer
```typescript
// src/components/messaging/MessageComposer.tsx (update)
import { useLinkPreview } from '../../hooks/useLinkPreview'
import { LinkPreviewCard } from './LinkPreviewCard'

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const [message, setMessage] = useState('')
  const { previews, removePreview } = useLinkPreview(message)

  // ... existing code ...

  return (
    <div className="p-4 border-t">
      {/* Link Previews */}
      {previews.length > 0 && (
        <div className="mb-3 space-y-2">
          {previews.map(preview => (
            <LinkPreviewCard 
              key={preview.url}
              preview={preview}
              onRemove={() => removePreview(preview.url)}
            />
          ))}
        </div>
      )}

      {/* Message Input */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        className="w-full resize-none"
      />
    </div>
  )
}
```

---

## 🧪 **Testing Checklist**

### Unit Tests
- [ ] Test URL extraction from various text formats
- [ ] Test SynC coupon URL detection
- [ ] Test SynC deal URL detection
- [ ] Test generic URL handling
- [ ] Test preview removal
- [ ] Test multiple URLs (max 3)
- [ ] Test malformed URLs

### Integration Tests with Supabase MCP
```bash
# Test coupon preview fetching
warp mcp run supabase "execute_sql 
  SELECT * FROM coupons 
  WHERE id = 'test-coupon-id';
"

# Test deal preview fetching
warp mcp run supabase "execute_sql 
  SELECT * FROM offers 
  WHERE id = 'test-deal-id';
"

# Track link shares in messages
warp mcp run supabase "execute_sql 
  SELECT * FROM messages 
  WHERE content LIKE '%https://sync.app/%' 
  ORDER BY created_at DESC LIMIT 10;
"
```

### E2E Tests with Puppeteer MCP
```bash
# Test link preview generation
warp mcp run puppeteer "type URL in message input, verify preview card appears within 1s"

# Test SynC coupon preview
warp mcp run puppeteer "paste sync.app/coupons/test-id, verify enhanced coupon card appears"

# Test preview removal
warp mcp run puppeteer "generate preview, click remove button, verify preview disappears"
```

---

## 📊 **Success Metrics**

| Metric | Target | Verification Method |
|--------|--------|-------------------|
| **Preview Generation Time** | < 1s | Chrome DevTools Network timing |
| **URL Detection Accuracy** | > 95% | Unit tests |
| **SynC URL Recognition** | 100% | Regex pattern tests |
| **Preview Removal** | Instant | UI interaction testing |
| **Fallback Handling** | 100% | Error simulation tests |

---

## 🔗 **Dependencies**

### Required Before Starting:
- ✅ Epic 8.1: `coupons` and `offers` tables must exist
- ✅ Epic 8.1: `brands` table with logo_url column
- ✅ Epic 8.2: MessageComposer component exists
- ✅ Backend API endpoint `/api/link-preview` for Open Graph scraping

### Verify Dependencies:
```bash
# Check coupons table
warp mcp run supabase "execute_sql SELECT * FROM coupons LIMIT 1;"

# Check offers table
warp mcp run supabase "execute_sql SELECT * FROM offers LIMIT 1;"

# Check brands table
warp mcp run supabase "execute_sql SELECT id, name, logo_url FROM brands LIMIT 5;"
```

---

## 📦 **Deliverables**

1. ✅ `src/services/linkPreviewService.ts` - Link preview service
2. ✅ `src/hooks/useLinkPreview.ts` - Link preview hook
3. ✅ `src/components/messaging/LinkPreviewCard.tsx` - Preview card component
4. ✅ MessageComposer integration with link previews
5. ✅ Backend API endpoint for Open Graph scraping (documented)
6. ✅ Unit tests for URL detection and preview generation
7. ✅ Supabase MCP test commands

---

## 🔄 **Next Story**

➡️ [STORY 8.3.4: Coupon/Deal Sharing Integration](./STORY_8.3.4_Coupon_Deal_Sharing.md)

---

## 📝 **MCP Command Quick Reference**

### Supabase MCP
```bash
# Fetch coupon for preview
warp mcp run supabase "execute_sql SELECT * FROM coupons WHERE id = 'coupon-id';"

# Fetch deal for preview
warp mcp run supabase "execute_sql SELECT * FROM offers WHERE id = 'deal-id';"

# Track shared links
warp mcp run supabase "execute_sql SELECT * FROM messages WHERE content LIKE '%https://%' LIMIT 20;"
```

### Context7 MCP
```bash
# Analyze URL detection
warp mcp run context7 "review extractUrls regex for edge cases"

# Security review
warp mcp run context7 "check linkPreviewService for XSS vulnerabilities"
```

### Puppeteer MCP
```bash
# Test link preview flow
warp mcp run puppeteer "type URL, wait for preview, verify card appears"
```

---

**Story Status:** 📋 **Ready for Implementation**  
**Estimated Completion:** 2 days  
**Risk Level:** Medium (external API dependency, CORS handling)
