-- File: supabase/migrations/20260208153000_pending_edits_infrastructure.sql

CREATE TABLE IF NOT EXISTS business_pending_edits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    pending_business_name TEXT,
    pending_address TEXT,
    pending_city TEXT,
    pending_state TEXT,
    pending_postal_code TEXT,
    pending_categories TEXT[],
    submitted_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_business_pending_edit UNIQUE (business_id)
);

CREATE INDEX IF NOT EXISTS idx_pending_edits_business ON business_pending_edits(business_id);
CREATE INDEX IF NOT EXISTS idx_pending_edits_created ON business_pending_edits(created_at);

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS has_pending_edits BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_businesses_pending_edits ON businesses(has_pending_edits) WHERE has_pending_edits = TRUE;

-- RLS
ALTER TABLE business_pending_edits ENABLE ROW LEVEL SECURITY;

-- Policy: Owners can manage their own pending edits
CREATE POLICY "Owners can manage own pending edits" ON business_pending_edits
FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM businesses WHERE id = business_pending_edits.business_id AND user_id = auth.uid())
)
WITH CHECK (
    EXISTS (SELECT 1 FROM businesses WHERE id = business_pending_edits.business_id AND user_id = auth.uid())
);

-- Policy: Admins can manage all pending edits
-- Assuming public.is_admin() function exists as per standard project pattern
CREATE POLICY "Admins can manage all pending edits" ON business_pending_edits
FOR ALL TO authenticated
USING (public.is_admin());
