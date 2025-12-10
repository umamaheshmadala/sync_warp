# 🛡️ STORY 8.7.5: Spam Configuration Infrastructure

**Parent Epic:** [EPIC 8.7 - Moderation & Safety](../epics/EPIC_8.7_Moderation_Safety.md)
**Priority:** P1 - High
**Estimated Effort:** 0.5 Day
**Dependencies:** None (Prerequisite for 8.7.3)

---

## 🎯 **Goal**
Create database-driven spam detection configuration to allow runtime updates of spam keywords and trusted domains without requiring app redeployment.

---

## 📋 **Acceptance Criteria**

### 1. Database Schema
- [ ] `spam_keywords` table created with columns: `keyword`, `severity`, `is_active`
- [ ] `trusted_domains` table created for whitelisted URL domains
- [ ] Seed data populated with initial keywords and domains

### 2. Service Layer
- [ ] `SpamConfigService` implemented with caching
- [ ] Config fetched on app initialization
- [ ] Auto-refresh every 5 minutes or manual refresh

### 3. Admin Interface (Optional)
- [ ] Simple UI to add/remove keywords (defer to v2 if time-constrained)

---

## 🧩 **Implementation Details**

### 1. Database Schema

```sql
-- Spam Keywords Table
CREATE TABLE spam_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT UNIQUE NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_spam_keywords_active ON spam_keywords(is_active) WHERE is_active = true;

-- Trusted Domains Table
CREATE TABLE trusted_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT UNIQUE NOT NULL,
  category TEXT, -- 'video', 'music', 'code', 'general'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Initial Data
INSERT INTO spam_keywords (keyword, severity) VALUES
  ('free money', 'high'),
  ('click here now', 'high'),
  ('limited time offer', 'medium'),
  ('winner', 'medium'),
  ('congratulations you won', 'high'),
  ('claim your prize', 'high'),
  ('urgent action required', 'medium'),
  ('verify your account', 'high'),
  ('suspended account', 'high');

INSERT INTO trusted_domains (domain, category) VALUES
  ('youtube.com', 'video'),
  ('youtu.be', 'video'),
  ('spotify.com', 'music'),
  ('github.com', 'code'),
  ('stackoverflow.com', 'code'),
  ('google.com', 'general'),
  ('wikipedia.org', 'general');
```

### 2. Config Service (`src/services/spamConfigService.ts`)

```typescript
import { supabase } from '../lib/supabase';

interface SpamKeyword {
  keyword: string;
  severity: 'low' | 'medium' | 'high';
}

interface TrustedDomain {
  domain: string;
  category: string;
}

class SpamConfigService {
  private keywords: SpamKeyword[] = [];
  private trustedDomains: string[] = [];
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch spam keywords from database
   */
  async fetchKeywords(): Promise<SpamKeyword[]> {
    const now = Date.now();
    
    // Return cached if still valid
    if (this.keywords.length > 0 && now - this.lastFetch < this.CACHE_DURATION) {
      return this.keywords;
    }

    const { data, error } = await supabase
      .from('spam_keywords')
      .select('keyword, severity')
      .eq('is_active', true);

    if (error) {
      console.error('Failed to fetch spam keywords:', error);
      return this.keywords; // Return cached on error
    }

    this.keywords = data || [];
    this.lastFetch = now;
    
    return this.keywords;
  }

  /**
   * Fetch trusted domains
   */
  async fetchTrustedDomains(): Promise<string[]> {
    const now = Date.now();
    
    if (this.trustedDomains.length > 0 && now - this.lastFetch < this.CACHE_DURATION) {
      return this.trustedDomains;
    }

    const { data, error } = await supabase
      .from('trusted_domains')
      .select('domain')
      .eq('is_active', true);

    if (error) {
      console.error('Failed to fetch trusted domains:', error);
      return this.trustedDomains;
    }

    this.trustedDomains = data?.map(d => d.domain) || [];
    
    return this.trustedDomains;
  }

  /**
   * Initialize config on app startup
   */
  async initialize(): Promise<void> {
    await Promise.all([
      this.fetchKeywords(),
      this.fetchTrustedDomains()
    ]);
    
    console.log('✅ Spam config initialized:', {
      keywords: this.keywords.length,
      trustedDomains: this.trustedDomains.length
    });
  }

  /**
   * Force refresh config
   */
  async refresh(): Promise<void> {
    this.lastFetch = 0; // Invalidate cache
    await this.initialize();
  }
}

export const spamConfigService = new SpamConfigService();
```

### 3. App Initialization (`src/App.tsx`)

```typescript
// Add to App.tsx useEffect
useEffect(() => {
  // Initialize spam config on app load
  spamConfigService.initialize();
}, []);
```

---

## 🤖 **MCP Integration Strategy**

### Supabase MCP
- **Create Tables**: `warp mcp run supabase "apply_migration spam_config_tables"`
- **Verify Data**: `warp mcp run supabase "execute_sql SELECT COUNT(*) FROM spam_keywords"`

---

## 🧪 **Testing Plan**

### Manual Verification
1. **Database**: Verify tables exist and contain seed data
2. **Service**: Check console logs show config initialized
3. **Cache**: Verify second call returns cached data (no DB query)

### Unit Tests
```typescript
describe('SpamConfigService', () => {
  it('should fetch and cache keywords', async () => {
    const keywords = await spamConfigService.fetchKeywords();
    expect(keywords.length).toBeGreaterThan(0);
  });
  
  it('should return cached data on subsequent calls', async () => {
    const first = await spamConfigService.fetchKeywords();
    const second = await spamConfigService.fetchKeywords();
    expect(first).toBe(second); // Same reference = cached
  });
});
```

---

## ✅ **Definition of Done**
- [ ] Database tables created and populated
- [ ] `SpamConfigService` implemented with caching
- [ ] Config initializes on app startup
- [ ] Unit tests passing
