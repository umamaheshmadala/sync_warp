# EPIC 12: Instagram-Style Product Listing

**Status**: 📋 Planning  
**Created**: 2026-02-03  
**Owner**: Product Team  
**Q&A Reference**: [PRODUCT_LISTING_REDESIGN_QA.md](../planning/PRODUCT_LISTING_REDESIGN_QA.md)

---

## Executive Summary

Redesign the product listing experience to match Instagram's intuitive, image-first approach. This includes a completely new product modal layout, multi-image carousel with 4:5 aspect ratio, social features (likes, comments, shares, favorites), and a tag-based status system replacing price/category fields.

---

## Goals & Objectives

| Goal | Metric |
|------|--------|
| Increase product engagement | 3x increase in product views |
| Simplify product creation | Reduce listing time by 50% |
| Mobile-first experience | 80% of listings from mobile |
| Social proof | Enable likes, comments, shares on products |

---

## Key Design Decisions

### Image & Layout
| Decision | Value |
|----------|-------|
| Aspect Ratio | **4:5 (1080×1350px)** - Instagram standard |
| Letterbox Background | **Dark gray (#1a1a1a)** for landscape fallback |
| Max Images | **5 per product** |
| Carousel Navigation | **Dots + swipe + hover arrows** |

### Removed Fields
| Field | Replacement |
|-------|-------------|
| Price | Contact business for pricing |
| Category | Search indexes product names; category belongs to business |
| Featured Toggle | **"Featured" tag** |

### Social Features
| Feature | Details |
|---------|---------|
| Likes | Public count; show friends who liked (via friendship system) |
| Comments | Flat (no replies); 300 char limit; 10 per page; appeal/report system |
| Share | Reuse existing share sheet (WhatsApp, Copy Link, etc.) |
| Favorites | Use existing favorites system (`FavoritesPage.tsx`) |

### Tags System
| Tag | Emoji | Color | Behavior |
|-----|-------|-------|----------|
| Available | 🟢 | Green | Default for products without tags |
| Featured | ⭐ | Gold | Promotes to Overview tab |
| Hot | 🔥 | Orange | Manual assignment |
| New Arrival | 🆕 | Blue | Auto-assigned; expires after 14 days |
| Pre-Order | 📦 | Purple | Manual assignment |
| Back Order | ⏳ | Yellow | Manual assignment |
| Low Stock | ⚠️ | Amber | Manual assignment |
| Sale | 🏷️ | Red | Manual assignment |
| Sold Out | ❌ | Gray | Grayed out but visible |

**Rules**:
- Max 3 tags per product
- Mutually exclusive: Available / Sold Out / Back Order
- Tags visible **only in modal** (not on grid cards)
- UI: Pill buttons for selection

### Product Lifecycle
| State | Description |
|-------|-------------|
| Draft | Saved but not published; auto-save on mobile |
| Published | Visible on storefront |
| Archived | Hidden but not deleted (soft delete) |

### Notifications
| Event | Recipient | Toggle |
|-------|-----------|--------|
| New like | Business owner | Per-product toggle |
| New comment | Business owner | Per-product toggle |
| Reply to comment | Original commenter | Global setting |

---

## User Experience

### Web Product Modal Layout
```
┌─────────────────────────────────────────────────────────┐
│  [X]                                             Close  │
├───────────────────────────┬─────────────────────────────┤
│                           │  Business Name + Avatar     │
│                           │  ─────────────────────────  │
│     IMAGE CAROUSEL        │  Product Name               │
│        (65% width)        │  ─────────────────────────  │
│                           │  Description (300 chars)    │
│     ● ● ○ ○ ○            │  [Read more...]             │
│                           │  ─────────────────────────  │
│                           │  ❤️ 24  💬 5  🔗 Share      │
│                           │  ─────────────────────────  │
│                           │  COMMENTS SECTION           │
│                           │  (scrollable)               │
│                           │  [Add a comment...]         │
├───────────────────────────┴─────────────────────────────┤
│  Tags (owner view): 🆕 New  ⭐ Featured                 │
│  🔔 Notifications: [ON/OFF toggle]                      │
└─────────────────────────────────────────────────────────┘
```

### Mobile Product Modal Layout
```
┌─────────────────────────┐
│  ← Back      ⋯ Options  │
├─────────────────────────┤
│  Business Name + Avatar │
├─────────────────────────┤
│                         │
│    IMAGE CAROUSEL       │
│      (Full width)       │
│                         │
│       ● ● ○ ○ ○        │
├─────────────────────────┤
│  ❤️ 24  💬 5  🔗 ⭐     │
├─────────────────────────┤
│  Product Name           │
│  Description...         │
│  [Read more]            │
├─────────────────────────┤
│  COMMENTS (scroll)      │
│  ────────────────────   │
│  [Add a comment...]     │
├─────────────────────────┤
│  [Tags + Toggle - owner]│
└─────────────────────────┘
```

### Product Card Grid (Storefront)
```
┌──────────┐  ┌──────────┐  ┌──────────┐
│          │  │          │  │          │
│  IMAGE   │  │  IMAGE   │  │  IMAGE   │
│  (4:5)   │  │  (4:5)   │  │  (4:5)   │
│          │  │          │  │          │
├──────────┤  ├──────────┤  ├──────────┤
│ Prod Name│  │ Prod Name│  │ Prod Name│
└──────────┘  └──────────┘  └──────────┘

- Featured products first, then newest
- No like/comment/share counts on cards (Instagram style)
- Tags NOT shown on cards
```

### Mobile Two-Step Creation Flow
```
STEP 1: Images                    STEP 2: Details
┌─────────────────────┐           ┌─────────────────────┐
│  ← Cancel    Next → │           │  ← Back    Publish  │
├─────────────────────┤           ├─────────────────────┤
│                     │           │  Product Name       │
│  [Selected Images]  │           │  ───────────────    │
│  ┌───┐ ┌───┐ ┌───┐ │           │  Description        │
│  │ 1 │ │ 2 │ │ 3 │ │           │  ───────────────    │
│  └───┘ └───┘ └───┘ │           │  Tags: [pill btns]  │
│   (drag to reorder) │           │  ───────────────    │
├─────────────────────┤           │  Notification: ☑️   │
│  [+] Add more (max 5)│          │                     │
├─────────────────────┤           │  [Save as Draft]    │
│  [Crop] [Rotate]    │           └─────────────────────┘
└─────────────────────┘
```

---

## Technical Specifications

### Image Upload
| Spec | Value |
|------|-------|
| Max file size | 10 MB per image |
| Formats | JPEG, PNG, HEIC, WebP |
| Compression | Client-side to ~1MB before upload |
| Progress | Show percentage/progress bar |
| Failure | Show error with retry button |

### Cropping Tool
| Feature | Value |
|---------|-------|
| Zoom | Pinch to zoom |
| Rotation | 90° only |
| Aspect ratio | Locked to 4:5 |
| Grid overlay | Rule of thirds |

### Comments
| Spec | Value |
|------|-------|
| Char limit | 300 |
| Pagination | 10 initially, "Load more" |
| Structure | Flat (no threading) |
| Edit | Allowed with "Edited" indicator |
| Delete | Owner can delete own; Business can delete any |
| Report | Use existing appeal system |

### Accessibility
| Feature | Value |
|---------|-------|
| Alt text | Product name as default; custom optional |
| Keyboard nav | Arrow keys for carousel |
| ESC key | Closes modal |

---

## Database Schema Changes

### New Tables

```sql
-- Product comments
CREATE TABLE product_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL CHECK (char_length(content) <= 300),
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product likes
CREATE TABLE product_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

-- Product shares tracking
CREATE TABLE product_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id), -- NULL for anonymous shares
  platform TEXT, -- 'whatsapp', 'copy_link', etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment appeals (extends content_appeals pattern)
-- Reuse existing content_appeals table with type = 'product_comment'
```

### Modified Tables

```sql
-- products table changes
ALTER TABLE products
  ADD COLUMN images JSONB DEFAULT '[]', -- Array of image objects [{url, order, alt_text}]
  ADD COLUMN tags TEXT[] DEFAULT '{}', -- Array of tag names
  ADD COLUMN status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  ADD COLUMN notifications_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN like_count INTEGER DEFAULT 0,
  ADD COLUMN comment_count INTEGER DEFAULT 0,
  ADD COLUMN share_count INTEGER DEFAULT 0,
  ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW(); -- For "New Arrival" expiry

-- Hide but keep existing fields
-- price and category remain in DB but hidden from UI
```

---

## Stories Breakdown

| Story | Title | Priority | Estimate |
|-------|-------|----------|----------|
| 12.1 | Product Image Upload & Cropping | P0 | 8 pts | ✅ Done |
| 12.2 | Product Modal Redesign (Web) | P0 | 8 pts |
| 12.3 | Product Modal Redesign (Mobile) | P0 | 8 pts | 🧪 User Testing |
| 12.4 | Mobile Two-Step Creation Flow | P0 | 8 pts | ✅ Done |
| 12.5 | Likes System | P0 | 5 pts |
| 12.6 | Comments System | P0 | 8 pts |
| 12.7 | Share & Tracking | P1 | 3 pts |
| 12.8 | Favorites Integration | P1 | 3 pts |
| 12.9 | Tags System | P0 | 5 pts |
| 12.10 | Description & Read More | P1 | 2 pts |
| 12.11 | Per-Product Notification Toggle | P1 | 3 pts |
| 12.12 | Product Card Grid Update | P0 | 3 pts | ✅ Done |
| 12.13 | Database Migration | P0 | 5 pts | ✅ Done |
| 12.14 | Analytics Integration | P2 | 3 pts |

**Total Estimate**: ~72 points

---

## Implementation Order (Execution Sequence)

Story IDs remain stable for referencing. This section defines the recommended **technical execution order** based on dependencies.

| Order | Story | Title | Phase | Dependencies |
|-------|-------|-------|-------|--------------|
| 1 | 12.1 | Image Upload & Cropping | Foundation | None |
| 2 | 12.13 | Database Migration | Foundation | None |
| 3 | 12.4 | Mobile Creation Flow | Creation | 12.1, 12.13 |
| 4 | 12.12 | Product Card Grid Update | Display | 12.4 |
| 5 | 12.3 | Product Modal (Mobile) | Display | 12.4 |
| 6 | 12.2 | Product Modal (Web) | Display | 12.4 |
| 7 | 12.5 | Likes System | Social | 12.2, 12.3, 12.13 |
| 8 | 12.6 | Comments System | Social | 12.2, 12.3, 12.13 |
| 9 | 12.8 | Favorites Integration | Utility | 12.2, 12.3 |
| 10 | 12.7 | Share & Tracking | Utility | 12.2, 12.3, 12.13 |
| 11 | 12.9 | Tags System | Management | 12.4, 12.13 |
| 12 | 12.10 | Description & Read More | Polish | 12.2, 12.3 |
| 13 | 12.11 | Notification Toggle | Control | 12.5, 12.6 |
| 14 | 12.14 | Analytics Integration | Reporting | All prior |

---

## Migration Strategy

### Existing Products
| Item | Action |
|------|--------|
| Landscape images | Grandfather in; no re-crop required |
| Price field | Hide from UI; keep in DB |
| Category field | Hide from UI; keep in DB |
| Products without tags | Display as "Available" |
| Featured toggle = true | Convert to "Featured" tag |

### Rollback Plan
- Feature flags for each story
- Gradual rollout (10% → 50% → 100%)
- Database migrations are additive (no destructive changes)

---

## Dependencies

| Dependency | Status |
|------------|--------|
| Friendship system | ✅ Exists |
| Favorites system | ✅ Exists |
| Share sheet component | ✅ Exists |
| Content appeals system | ✅ Exists |
| Analytics tab | ✅ Exists |

---

## Out of Scope (Phase 2)

- Global product explore feed
- Manual product reordering
- Resume interrupted uploads
- @mentions in descriptions
- #hashtags
- Nested comment replies
- Product collections/folders in favorites

---

## Acceptance Criteria (EPIC Level)

- [ ] Products display in 4:5 aspect ratio with up to 5 images
- [ ] Image cropping with zoom, rotate, and grid overlay
- [ ] Mobile uses native image picker with cropping
- [ ] Product modal shows image carousel, social counts, comments
- [ ] Users can like, comment, share, and favorite products
- [ ] Comments support edit, delete, and appeal/report
- [ ] Tags system replaces featured toggle; max 3 per product
- [ ] "New Arrival" tag auto-expires after 14 days
- [ ] Business owners can toggle notifications per product
- [ ] Price and category fields hidden from UI
- [ ] Existing products with landscape images continue to work
- [ ] Mobile two-step flow: images first, then metadata
- [ ] Draft mode with auto-save on mobile
- [ ] Product grid shows image + name only (no counts)
- [ ] Featured products appear on Overview tab
