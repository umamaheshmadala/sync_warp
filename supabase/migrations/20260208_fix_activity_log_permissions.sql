-- File: supabase/migrations/20260208_fix_activity_log_permissions.sql

-- 1. Ensure table exists (in case it was created manually or missing from migrations)
CREATE TABLE IF NOT EXISTS business_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    actor_id UUID REFERENCES auth.users(id),
    actor_type TEXT NOT NULL CHECK (actor_type IN ('owner', 'admin', 'system')),
    field_changes JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_business_activity_log_business ON business_activity_log(business_id);
CREATE INDEX IF NOT EXISTS idx_business_activity_log_created ON business_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_activity_log_action ON business_activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_business_activity_log_actor ON business_activity_log(actor_id);

-- 3. Enable RLS
ALTER TABLE business_activity_log ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Owners can view their own business logs" ON business_activity_log;
DROP POLICY IF EXISTS "Admins can view all logs" ON business_activity_log;
DROP POLICY IF EXISTS "Owners can insert logs for their business" ON business_activity_log;
DROP POLICY IF EXISTS "Admins can insert logs" ON business_activity_log;

-- 5. Re-create policies

-- Policy: Owners can VIEW their own business logs
CREATE POLICY "Owners can view their own business logs" ON business_activity_log
FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM businesses WHERE id = business_activity_log.business_id AND user_id = auth.uid())
);

-- Policy: Owners can INSERT logs for their business (needed for service layer logging)
CREATE POLICY "Owners can insert logs for their business" ON business_activity_log
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM businesses WHERE id = business_activity_log.business_id AND user_id = auth.uid())
);

-- Policy: Admins can VIEW all logs
CREATE POLICY "Admins can view all logs" ON business_activity_log
FOR SELECT TO authenticated
USING (public.is_admin());

-- Policy: Admins can INSERT logs
CREATE POLICY "Admins can insert logs" ON business_activity_log
FOR INSERT TO authenticated
WITH CHECK (public.is_admin());
