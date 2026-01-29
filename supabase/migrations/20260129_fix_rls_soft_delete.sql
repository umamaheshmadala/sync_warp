-- Fix RLS policies to allow soft delete (UPDATE deleted_at)
-- The previous policy 'FOR ALL' prevented setting deleted_at because of the implicit WITH CHECK

DROP POLICY IF EXISTS "Business owners can manage own offers" ON offers;

-- 1. SELECT: Hide deleted offers
CREATE POLICY "Business owners can view own offers" ON offers
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid() OR user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- 2. INSERT: Ensure new offers are not deleted
CREATE POLICY "Business owners can insert own offers" ON offers
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid() OR user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- 3. UPDATE: Allow updating active offers, even if setting deleted_at (Soft Delete)
-- USING condition (deleted_at IS NULL) ensures we can only target currently visible offers
-- WITH CHECK condition REMOVES the deleted_at constraint so we can set it to non-null
CREATE POLICY "Business owners can update own offers" ON offers
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid() OR user_id = auth.uid()
    )
    AND deleted_at IS NULL
  ) WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid() OR user_id = auth.uid()
    )
  );

-- 4. DELETE: Hard delete allowed for visible offers (though code prefers soft delete)
CREATE POLICY "Business owners can delete own offers" ON offers
  FOR DELETE USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid() OR user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );
