-- Create product_comments table
CREATE TABLE IF NOT EXISTS product_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 300),
  is_edited BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE, -- For moderation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_comments_product ON product_comments(product_id);
CREATE INDEX IF NOT EXISTS idx_product_comments_user ON product_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_product_comments_created ON product_comments(product_id, created_at DESC);

-- Denormalized count on products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- Trigger Function to update comment_count
CREATE OR REPLACE FUNCTION update_product_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE products SET comment_count = comment_count + 1 WHERE id = NEW.product_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE products SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.product_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
DROP TRIGGER IF EXISTS product_comments_count_trigger ON product_comments;
CREATE TRIGGER product_comments_count_trigger
AFTER INSERT OR DELETE ON product_comments
FOR EACH ROW EXECUTE FUNCTION update_product_comment_count();

-- Enable RLS
ALTER TABLE product_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- 1. Read visible comments (Everyone)
DROP POLICY IF EXISTS "Read visible comments" ON product_comments;
CREATE POLICY "Read visible comments"
ON product_comments FOR SELECT
USING (is_hidden = FALSE);

-- 2. Insert own comments (Authenticated)
DROP POLICY IF EXISTS "Insert own comments" ON product_comments;
CREATE POLICY "Insert own comments"
ON product_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. Update own comments (Authenticated)
DROP POLICY IF EXISTS "Update own comments" ON product_comments;
CREATE POLICY "Update own comments"
ON product_comments FOR UPDATE
USING (auth.uid() = user_id);

-- 4. Delete comments (Owner or Business Owner)
DROP POLICY IF EXISTS "Delete comments" ON product_comments;
CREATE POLICY "Delete comments"
ON product_comments FOR DELETE
USING (
  auth.uid() = user_id 
  OR auth.uid() IN (
    SELECT owner_id FROM businesses 
    WHERE id = (SELECT business_id FROM products WHERE id = product_id)
  )
);
