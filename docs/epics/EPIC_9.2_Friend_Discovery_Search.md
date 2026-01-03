# 🔍 EPIC 9.2: Friend Discovery & Search

**Epic Owner:** Frontend Engineering / Backend Engineering  
**Stakeholders:** Product, UX/UI, Backend Engineering, QA  
**Dependencies:** Epic 9.1 (Friends Foundation)  
**Timeline:** Week 3-4 (2 weeks)  
**Status:** 📋 Planning

---

## 🎯 **Epic Goal**

Build a **powerful friend discovery and search system** that helps SynC users find and connect with friends through:
- Fast, intuitive global friend search with fuzzy matching
- "People You May Know" (PYMK) recommendation engine
- Contact sync integration (iOS Contacts, Android Contacts)
- Advanced search filters (location, mutual friends, interests)
- Search history and recent searches
- Friend suggestions in deal sharing flows

This epic makes it **easy for users to discover and connect with friends**, driving network growth and engagement.

---

## 📱 **Platform Support**

**Target Platforms:**
- ✅ **Web Browsers** - Fast search with keyboard shortcuts
- ✅ **iOS Native App** - Contacts integration, native search UI
- ✅ **Android Native App** - Contacts integration, Material Design search

**Mobile-Specific Features:**
- **Contact Sync**: Read phone contacts and match with SynC users
- **Permissions Flow**: Request contacts permission with clear explanation
- **Background Sync**: Periodic contact sync in background
- **Privacy**: Hashed phone numbers for matching (never stored in plain text)

---

## 🎯 **MCP Integration Strategy**

Following `rule:yCm2e9oHOnrU5qbhrGa2IE`:

### **Primary MCP Servers Used:**

1. **🛢 Supabase MCP** (Heavy usage)
   - Deploy search edge functions
   - Test PYMK recommendation queries
   - Optimize full-text search indexes
   - Contact matching algorithms

2. **🧠 Context7 MCP** (Medium usage)
   - Analyze existing search implementations
   - Find integration points for contact sync
   - Review recommendation algorithm logic

3. **🤖 Puppeteer MCP** (E2E testing)
   - Test search flows
   - Verify PYMK card interactions
   - Test contact sync permission flows

---

## ✅ **Success Criteria**

| Objective | KPI / Target |
|-----------|--------------|
| **Search Response Time** | < 50ms for fuzzy matching |
| **PYMK Generation** | < 100ms for recommendations |
| **Search Accuracy** | > 95% relevant results in top 5 |
| **Contact Match Rate** | > 70% of synced contacts matched |
| **User Engagement** | > 50% users find friends via PYMK |
| **Search Adoption** | > 80% users use search feature |

---

## 📊 **High-Level Architecture**

```
┌─────────────────────────────────────────────────────────┐
│              FRIEND DISCOVERY & SEARCH LAYER             │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │         GLOBAL SEARCH                            │   │
│  │  • Full-text search on profiles                  │   │
│  │  • Fuzzy matching (typo tolerance)               │   │
│  │  • Ranking by mutual friends + location          │   │
│  │  • Search history                                │   │
│  └──────────────────────────────────────────────────┘   │
│                        ↓                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │    PEOPLE YOU MAY KNOW (PYMK) ENGINE             │   │
│  │  • Mutual friends algorithm                      │   │
│  │  • Location proximity scoring                    │   │
│  │  • Contact sync matching                         │   │
│  │  • Shared interests (deals, groups)              │   │
│  │  • ML-based ranking (future)                     │   │
│  └──────────────────────────────────────────────────┘   │
│                        ↓                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │         CONTACT SYNC (Mobile)                    │   │
│  │  • iOS Contacts API integration                  │   │
│  │  • Android Contacts API integration              │   │
│  │  • Phone number hashing (SHA-256)                │   │
│  │  • Privacy-preserving matching                   │   │
│  │  • Background sync scheduler                     │   │
│  └──────────────────────────────────────────────────┘   │
│                        ↓                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │         SEARCH FILTERS & ADVANCED                │   │
│  │  • Location filter (city, radius)                │   │
│  │  • Mutual friends filter                         │   │
│  │  • Shared interests filter                       │   │
│  │  • Recent activity filter                        │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 🗂️ **Stories in This Epic**

### **STORY 9.2.1: Global Friend Search with Fuzzy Matching** ⏱️ 3 days
**Priority:** 🔴 Critical  
**MCP Usage:** 🛢 Supabase MCP (Heavy), 🧠 Context7 MCP

**Description:**  
Implement fast, accurate global friend search with fuzzy matching, ranking, and privacy filters.

**Acceptance Criteria:**
- [ ] Full-text search index on `profiles.full_name` using PostgreSQL `tsvector`
- [ ] Fuzzy matching with Levenshtein distance (typo tolerance)
- [ ] Search ranking by:
  - Mutual friends count (weighted 40%)
  - Location proximity (weighted 30%)
  - Name similarity (weighted 30%)
- [ ] Respect privacy settings (searchable users only)
- [ ] Exclude blocked users from results
- [ ] Response time < 50ms for 100k+ users
- [ ] Pagination (20 results per page)
- [ ] Search history (last 10 searches)

**Technical Spec:**
```sql
-- Full-text search index
CREATE INDEX idx_profiles_fulltext 
  ON profiles USING gin(to_tsvector('english', full_name));

-- Search function with ranking
CREATE OR REPLACE FUNCTION search_users(
  search_query TEXT,
  current_user_id UUID,
  limit_count INT DEFAULT 20
)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  mutual_friends_count INT,
  distance_km FLOAT,
  rank FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    COUNT(mf.id) as mutual_friends_count,
    ST_Distance(p.location, current_location) / 1000 as distance_km,
    -- Ranking algorithm
    (
      COUNT(mf.id) * 0.4 + -- Mutual friends (40%)
      (1 / (ST_Distance(p.location, current_location) / 1000 + 1)) * 0.3 + -- Location (30%)
      similarity(p.full_name, search_query) * 0.3 -- Name match (30%)
    ) as rank
  FROM profiles p
  LEFT JOIN friendships mf ON mf.friend_id = p.id 
    AND mf.user_id IN (
      SELECT friend_id FROM friendships WHERE user_id = current_user_id
    )
  WHERE 
    p.id != current_user_id
    AND p.id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = current_user_id)
    AND p.privacy_settings->>'searchable' = 'true'
    AND to_tsvector('english', p.full_name) @@ plainto_tsquery('english', search_query)
  GROUP BY p.id
  ORDER BY rank DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
```

**MCP Commands:**
```bash
# Deploy search function
warp mcp run supabase "deploy_edge_function search_users"

# Test search performance
warp mcp run supabase "execute_sql SELECT * FROM search_users('john', auth.uid(), 20)"

# Analyze query plan
warp mcp run supabase "execute_sql EXPLAIN ANALYZE SELECT * FROM search_users(...)"
```

---

### **STORY 9.2.2: "People You May Know" (PYMK) Recommendation Engine** ⏱️ 4 days
**Priority:** 🔴 Critical  
**MCP Usage:** 🛢 Supabase MCP (Heavy)

**Description:**  
Build intelligent friend recommendation engine based on mutual friends, location, contacts, and shared interests.

**Acceptance Criteria:**
- [ ] PYMK algorithm considers:
  - Mutual friends (weighted 50%)
  - Contact sync matches (weighted 25%)
  - Location proximity (weighted 15%)
  - Shared deal interests (weighted 10%)
- [ ] Exclude existing friends and pending requests
- [ ] Exclude users who rejected your previous request
- [ ] Generate 20 recommendations, refresh daily
- [ ] Response time < 100ms
- [ ] Track impression and conversion metrics

**Technical Spec:**
```sql
CREATE OR REPLACE FUNCTION get_people_you_may_know(
  current_user_id UUID,
  limit_count INT DEFAULT 20
)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  mutual_friends_count INT,
  reason TEXT, -- "5 mutual friends", "From contacts", etc.
  score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH mutual_friends_score AS (
    -- Score based on mutual friends
    SELECT 
      f2.friend_id as candidate_id,
      COUNT(*) as mutual_count,
      COUNT(*) * 0.5 as score
    FROM friendships f1
    JOIN friendships f2 ON f1.friend_id = f2.user_id
    WHERE f1.user_id = current_user_id 
      AND f1.status = 'active'
      AND f2.status = 'active'
      AND f2.friend_id != current_user_id
      AND f2.friend_id NOT IN (
        SELECT friend_id FROM friendships WHERE user_id = current_user_id
      )
    GROUP BY f2.friend_id
  ),
  contact_sync_score AS (
    -- Score based on contact sync
    SELECT 
      user_id as candidate_id,
      0.25 as score
    FROM contact_matches
    WHERE matched_by_user_id = current_user_id
  ),
  location_score AS (
    -- Score based on location proximity
    SELECT 
      p.id as candidate_id,
      (1 / (ST_Distance(p.location, current_location) / 1000 + 1)) * 0.15 as score
    FROM profiles p
    WHERE p.id != current_user_id
  )
  SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    COALESCE(mf.mutual_count, 0) as mutual_friends_count,
    CASE 
      WHEN mf.mutual_count > 0 THEN mf.mutual_count || ' mutual friends'
      WHEN cs.candidate_id IS NOT NULL THEN 'From your contacts'
      WHEN ls.score > 0.1 THEN 'Lives nearby'
      ELSE 'Suggested for you'
    END as reason,
    COALESCE(mf.score, 0) + COALESCE(cs.score, 0) + COALESCE(ls.score, 0) as total_score
  FROM profiles p
  LEFT JOIN mutual_friends_score mf ON mf.candidate_id = p.id
  LEFT JOIN contact_sync_score cs ON cs.candidate_id = p.id
  LEFT JOIN location_score ls ON ls.candidate_id = p.id
  WHERE p.id NOT IN (
    SELECT friend_id FROM friendships WHERE user_id = current_user_id
    UNION
    SELECT receiver_id FROM friend_requests WHERE sender_id = current_user_id AND status = 'rejected'
  )
  ORDER BY total_score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
```

**MCP Commands:**
```bash
warp mcp run supabase "execute_sql SELECT * FROM get_people_you_may_know(auth.uid(), 20)"
```

---

### **STORY 9.2.3: Contact Sync Integration (iOS/Android)** ⏱️ 5 days
**Priority:** 🔴 Critical  
**MCP Usage:** 🛢 Supabase MCP, 🧠 Context7 MCP

**Description:**  
Integrate with iOS Contacts and Android Contacts APIs to find friends from user's phone contacts.

**Acceptance Criteria:**
- [ ] Request contacts permission with clear explanation
- [ ] Read phone contacts using Capacitor Contacts plugin
- [ ] Hash phone numbers with SHA-256 before upload
- [ ] Match hashed numbers against database
- [ ] Display matched contacts in "From Contacts" section
- [ ] Background sync every 24 hours (when app is active)
- [ ] Privacy: never store plain phone numbers
- [ ] Handle permission denied gracefully

**Technical Spec:**
```typescript
// src/services/contactSyncService.ts
import { Contacts } from '@capacitor-community/contacts';
import { supabase } from '@/integrations/supabase/client';
import crypto from 'crypto';

interface ContactMatch {
  userId: string;
  fullName: string;
  phoneNumber: string; // Hashed
}

async function requestContactsPermission(): Promise<boolean> {
  const permission = await Contacts.requestPermissions();
  return permission.contacts === 'granted';
}

async function syncContacts(): Promise<ContactMatch[]> {
  // 1. Request permission
  const hasPermission = await requestContactsPermission();
  if (!hasPermission) {
    throw new Error('Contacts permission denied');
  }

  // 2. Read contacts
  const { contacts } = await Contacts.getContacts({
    projection: {
      name: true,
      phones: true,
    },
  });

  // 3. Hash phone numbers
  const hashedPhones = contacts
    .flatMap(c => c.phones?.map(p => p.number) || [])
    .map(phone => hashPhoneNumber(phone));

  // 4. Match with database
  const { data: matches } = await supabase.rpc('match_contacts', {
    hashed_phones: hashedPhones,
  });

  return matches || [];
}

function hashPhoneNumber(phone: string): string {
  // Normalize: remove spaces, dashes, etc.
  const normalized = phone.replace(/\D/g, '');
  // Hash with SHA-256
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

// Database function for matching
```

```sql
-- Contact matching table
CREATE TABLE contact_hashes (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, phone_hash)
);

CREATE INDEX idx_contact_hashes_phone ON contact_hashes(phone_hash);

-- Match function
CREATE OR REPLACE FUNCTION match_contacts(hashed_phones TEXT[])
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.full_name, p.avatar_url
  FROM profiles p
  JOIN contact_hashes ch ON ch.user_id = p.id
  WHERE ch.phone_hash = ANY(hashed_phones)
    AND p.id != auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**MCP Commands:**
```bash
# Analyze contact sync implementation
warp mcp run context7 "analyze src/services/contactSyncService.ts"

# Test contact matching
warp mcp run supabase "execute_sql SELECT * FROM match_contacts(ARRAY['hash1', 'hash2'])"
```

---

### **STORY 9.2.4: Search Filters & Advanced Search** ⏱️ 2 days
**Priority:** 🟡 Medium  
**MCP Usage:** 🛢 Supabase MCP

**Description:**  
Add advanced search filters: location radius, mutual friends, shared interests.

**Acceptance Criteria:**
- [ ] Location filter: city or radius (5km, 10km, 25km, 50km)
- [ ] Mutual friends filter: "Has mutual friends" toggle
- [ ] Shared interests filter: based on deal categories
- [ ] Combine filters with AND logic
- [ ] Save filter preferences
- [ ] Fast query performance (< 100ms with filters)

**Technical Spec:**
```typescript
interface SearchFilters {
  query: string;
  location?: {
    city?: string;
    radius?: number; // km
    lat?: number;
    lng?: number;
  };
  hasMutualFriends?: boolean;
  sharedInterests?: string[]; // deal category IDs
}

async function searchWithFilters(filters: SearchFilters) {
  const { data } = await supabase.rpc('search_users_with_filters', {
    search_query: filters.query,
    location_lat: filters.location?.lat,
    location_lng: filters.location?.lng,
    location_radius_km: filters.location?.radius,
    require_mutual_friends: filters.hasMutualFriends || false,
    shared_interests: filters.sharedInterests || [],
  });
  return data;
}
```

---

### **STORY 9.2.5: Search Performance Optimization** ⏱️ 2 days
**Priority:** 🔴 Critical  
**MCP Usage:** 🛢 Supabase MCP

**Description:**  
Optimize search queries for < 50ms response time with 100k+ users.

**Acceptance Criteria:**
- [ ] Database indexes on all search columns
- [ ] Query plan analysis (EXPLAIN ANALYZE)
- [ ] Caching for popular searches (Redis/Upstash)
- [ ] Pagination with cursor-based approach
- [ ] Load testing with 100k+ profiles
- [ ] p95 response time < 50ms

**MCP Commands:**
```bash
# Analyze query performance
warp mcp run supabase "execute_sql EXPLAIN ANALYZE SELECT * FROM search_users('john', ...)"

# Load test
warp mcp run puppeteer "test search performance under load"
```

---

### **STORY 9.2.6: Friend Suggestions in Deal Sharing** ⏱️ 1 day
**Priority:** 🟡 Medium  
**MCP Usage:** 🧠 Context7 MCP

**Description:**  
Integrate friend search and suggestions into deal sharing flow.

**Acceptance Criteria:**
- [ ] "Share with friends" button in deal detail page
- [ ] Friend picker shows PYMK suggestions at top
- [ ] Search friends within picker modal
- [ ] Select multiple friends to share with
- [ ] Send deal as message or notification

**MCP Commands:**
```bash
# Find integration points
warp mcp run context7 "find usage of ShareDeal component"
```

---

## 📦 **Deliverables**

### **Database Migrations:**
1. `20250118_search_indexes.sql` - Full-text search indexes
2. `20250118_contact_sync_tables.sql` - Contact hashing tables
3. `20250118_search_functions.sql` - Search and PYMK functions

### **Services:**
1. `src/services/searchService.ts` - Global search service
2. `src/services/contactSyncService.ts` - Contact sync service
3. `src/services/recommendationService.ts` - PYMK service

### **Hooks:**
1. `src/hooks/useSearch.ts` - Search hook
2. `src/hooks/usePYMK.ts` - PYMK hook
3. `src/hooks/useContactSync.ts` - Contact sync hook

### **Documentation:**
1. `docs/api/search_api.md` - Search API reference
2. `docs/features/contact_sync_privacy.md` - Privacy documentation

---

## 📈 **Metrics & Monitoring**

### **Performance Metrics:**
- Search query time (p50, p95, p99)
- PYMK generation time
- Contact sync time
- Cache hit rate

### **Business Metrics:**
- Search usage rate (% of users)
- Friend discovery rate (friends found via PYMK)
- Contact sync opt-in rate
- Search → friend request conversion rate

---

**Next Epic:** [EPIC 9.3: Friends UI Components](./EPIC_9.3_Friends_UI_Components.md)
