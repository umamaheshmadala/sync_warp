-- Migration: Allow admins to manage all businesses
-- Description: Grants admin users full access (SELECT, UPDATE, DELETE) to the businesses table to perform activations.

-- Policy: Admins can view all businesses (including pending/suspended)
CREATE POLICY "Admins can view all businesses"
ON businesses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Admins can update all businesses
CREATE POLICY "Admins can update all businesses"
ON businesses
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Admins can delete businesses
CREATE POLICY "Admins can delete businesses"
ON businesses
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);
