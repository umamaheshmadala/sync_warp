-- FIX: Update RLS policy for product_comments to allow business owners to delete comments
-- Reason: The previous policy referenced 'owner_id' on the businesses table, but the correct column is 'user_id'.

-- Disable RLS temporarily to avoid locking issues (optional, but good practice during policy swaps)
ALTER TABLE product_comments DISABLE ROW LEVEL SECURITY;

-- 1. Drop the incorrect policy
DROP POLICY IF EXISTS "Delete comments" ON product_comments;

-- 2. Create the correct policy using 'user_id'
CREATE POLICY "Delete comments"
ON product_comments FOR DELETE
USING (
  -- User can delete their own comment
  auth.uid() = user_id 
  OR 
  -- Business owner can delete any comment on their products
  auth.uid() IN (
    SELECT user_id FROM businesses 
    WHERE id = (SELECT business_id FROM products WHERE id = product_comments.product_id)
  )
);

-- Re-enable RLS
ALTER TABLE product_comments ENABLE ROW LEVEL SECURITY;
