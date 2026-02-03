# Story 12.13: Database Migration

**EPIC**: [EPIC 12 - Instagram-Style Products](../epics/EPIC_12_Instagram_Style_Products.md)  
**Status**: ✅ Done  
**Priority**: P0  
**Estimate**: 5 points  

---

## User Story

**As a** developer  
**I want to** set up the database schema for the new product features  
**So that** all stories have the required data structures  

---

## Scope

### In Scope
- New tables: `product_comments`, `product_likes`, `product_shares`
- Modified columns on `products` table
- RLS policies for all tables
- Indexes for performance
- Triggers for denormalized counts
- Scheduled job for "New Arrival" expiry
- Migration for existing products (featured toggle → tag)

### Out of Scope
- API layer implementation
- Frontend changes

---

## Migration Files

### Migration 001: Products Table Changes

```sql
-- Migration: 20260203_001_products_table_changes.sql

-- Add new columns to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS new_arrival_expires_at TIMESTAMPTZ;

-- Add check constraint for status
ALTER TABLE products
  ADD CONSTRAINT products_status_check 
  CHECK (status IN ('draft', 'published', 'archived'));

-- Migrate existing image_url to images array
UPDATE products
SET images = jsonb_build_array(
  jsonb_build_object(
    'url', image_url,
    'order', 0,
    'alt_text', name
  )
)
WHERE image_url IS NOT NULL AND images = '[]';

-- Migrate featured toggle to tag
UPDATE products
SET tags = array_append(tags, 'featured')
WHERE is_featured = TRUE AND NOT ('featured' = ANY(tags));

-- Index for featured products query
CREATE INDEX IF NOT EXISTS idx_products_featured 
ON products USING GIN (tags);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_products_status 
ON products (business_id, status);
```

### Migration 002: Product Likes Table

```sql
-- Migration: 20260203_002_product_likes.sql

CREATE TABLE IF NOT EXISTS product_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_likes_product 
ON product_likes(product_id);

CREATE INDEX IF NOT EXISTS idx_product_likes_user 
ON product_likes(user_id);

-- RLS Policies
ALTER TABLE product_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes"
ON product_likes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can like"
ON product_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own"
ON product_likes FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for like count
CREATE OR REPLACE FUNCTION update_product_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE products SET like_count = like_count + 1 WHERE id = NEW.product_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE products SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.product_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER product_likes_count_trigger
AFTER INSERT OR DELETE ON product_likes
FOR EACH ROW EXECUTE FUNCTION update_product_like_count();
```

### Migration 003: Product Comments Table

```sql
-- Migration: 20260203_003_product_comments.sql

CREATE TABLE IF NOT EXISTS product_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 300 AND char_length(content) > 0),
  is_edited BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_comments_product 
ON product_comments(product_id);

CREATE INDEX IF NOT EXISTS idx_product_comments_user 
ON product_comments(user_id);

CREATE INDEX IF NOT EXISTS idx_product_comments_created 
ON product_comments(product_id, created_at DESC);

-- RLS Policies
ALTER TABLE product_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View non-hidden comments"
ON product_comments FOR SELECT
USING (is_hidden = FALSE);

CREATE POLICY "Authenticated users can comment"
ON product_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update own comments"
ON product_comments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Delete policy: own comments OR business owner
CREATE POLICY "Delete own or business owner can delete"
ON product_comments FOR DELETE
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM products p
    JOIN businesses b ON p.business_id = b.id
    WHERE p.id = product_comments.product_id
    AND b.owner_id = auth.uid()
  )
);

-- Trigger for comment count
CREATE OR REPLACE FUNCTION update_product_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE products SET comment_count = comment_count + 1 WHERE id = NEW.product_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE products SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.product_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER product_comments_count_trigger
AFTER INSERT OR DELETE ON product_comments
FOR EACH ROW EXECUTE FUNCTION update_product_comment_count();
```

### Migration 004: Product Shares Table

```sql
-- Migration: 20260203_004_product_shares.sql

CREATE TABLE IF NOT EXISTS product_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL for anonymous
  platform TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_product_shares_product 
ON product_shares(product_id);

-- RLS Policies
ALTER TABLE product_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shares"
ON product_shares FOR SELECT
USING (true);

CREATE POLICY "Anyone can record share"
ON product_shares FOR INSERT
WITH CHECK (true);

-- Trigger for share count
CREATE OR REPLACE FUNCTION update_product_share_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products SET share_count = share_count + 1 WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER product_shares_count_trigger
AFTER INSERT ON product_shares
FOR EACH ROW EXECUTE FUNCTION update_product_share_count();
```

### Migration 005: New Arrival Expiry Job

```sql
-- Migration: 20260203_005_new_arrival_expiry.sql

-- Function to expire new arrival tags
CREATE OR REPLACE FUNCTION expire_new_arrival_tags()
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE products
  SET 
    tags = array_remove(tags, 'new_arrival'),
    new_arrival_expires_at = NULL
  WHERE 
    'new_arrival' = ANY(tags)
    AND new_arrival_expires_at IS NOT NULL
    AND new_arrival_expires_at < NOW();
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron (run daily at midnight UTC)
-- Note: pg_cron must be enabled in Supabase dashboard
SELECT cron.schedule(
  'expire-new-arrivals',
  '0 0 * * *',
  'SELECT expire_new_arrival_tags()'
);
```

### Migration 006: RPC Functions

```sql
-- Migration: 20260203_006_rpc_functions.sql

-- Get friends who liked a product
CREATE OR REPLACE FUNCTION get_friends_who_liked_product(
  p_product_id UUID,
  p_user_id UUID,
  p_limit INTEGER DEFAULT 2
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.id,
    pr.full_name,
    pr.avatar_url
  FROM product_likes pl
  JOIN profiles pr ON pl.user_id = pr.id
  JOIN friendships f ON (
    (f.user_id = p_user_id AND f.friend_id = pl.user_id)
    OR (f.friend_id = p_user_id AND f.user_id = pl.user_id)
  )
  WHERE pl.product_id = p_product_id
    AND f.status = 'active'
    AND pl.user_id != p_user_id
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Rollback Scripts

### Rollback 001: Products Table

```sql
ALTER TABLE products
  DROP COLUMN IF EXISTS images,
  DROP COLUMN IF EXISTS tags,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS notifications_enabled,
  DROP COLUMN IF EXISTS like_count,
  DROP COLUMN IF EXISTS comment_count,
  DROP COLUMN IF EXISTS share_count,
  DROP COLUMN IF EXISTS new_arrival_expires_at;

DROP INDEX IF EXISTS idx_products_featured;
DROP INDEX IF EXISTS idx_products_status;
```

### Rollback Likes/Comments/Shares

```sql
DROP TABLE IF EXISTS product_shares;
DROP TABLE IF EXISTS product_comments;
DROP TABLE IF EXISTS product_likes;
```

---

## Acceptance Criteria

- [ ] All migrations run successfully
- [ ] No data loss on existing products
- [ ] Existing `image_url` migrated to `images` array
- [ ] Existing `is_featured` migrated to `featured` tag
- [ ] RLS policies tested for each role
- [ ] Triggers update counts correctly
- [ ] pg_cron job scheduled
- [ ] Rollback scripts tested

---

## Testing Checklist

- [ ] Fresh database: migrations run clean
- [ ] Existing database: migrations handle existing data
- [ ] Insert like → like_count increments
- [ ] Delete like → like_count decrements
- [ ] Insert comment → comment_count increments
- [ ] RLS: User can only delete own comments
- [ ] RLS: Business owner can delete any comment on their product
- [ ] RPC: get_friends_who_liked_product returns correct friends
- [ ] Cron: New Arrival expiry works after 14 days

---

## Dependencies

- [ ] pg_cron extension enabled in Supabase
- [ ] Existing `products`, `profiles`, `businesses`, `friendships` tables
