-- Create coupon drafts system
-- This allows users to save coupon drafts manually and manage them

-- Create coupon_drafts table
CREATE TABLE IF NOT EXISTS coupon_drafts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    business_id uuid NOT NULL,
    
    -- Draft metadata
    draft_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Coupon form data (stored as JSONB for flexibility)
    form_data jsonb NOT NULL DEFAULT '{}',
    
    -- Progress tracking
    step_completed integer DEFAULT 1 CHECK (step_completed >= 1 AND step_completed <= 6),
    
    CONSTRAINT fk_coupon_drafts_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_coupon_drafts_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_coupon_drafts_user_id ON coupon_drafts(user_id);
CREATE INDEX idx_coupon_drafts_business_id ON coupon_drafts(business_id);
CREATE INDEX idx_coupon_drafts_updated_at ON coupon_drafts(updated_at DESC);

-- Enable RLS
ALTER TABLE coupon_drafts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own coupon drafts"
    ON coupon_drafts FOR ALL
    USING (auth.uid() = user_id);

-- Create function to save a coupon draft
CREATE OR REPLACE FUNCTION save_coupon_draft(
    p_business_id uuid,
    p_draft_name text,
    p_form_data jsonb,
    p_step_completed integer DEFAULT 1
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_draft_id uuid;
BEGIN
    -- Validate inputs
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    IF p_business_id IS NULL THEN
        RAISE EXCEPTION 'Business ID is required';
    END IF;
    
    IF p_draft_name IS NULL OR trim(p_draft_name) = '' THEN
        RAISE EXCEPTION 'Draft name is required';
    END IF;
    
    -- Insert or update draft
    INSERT INTO coupon_drafts (
        user_id,
        business_id,
        draft_name,
        form_data,
        step_completed,
        updated_at
    ) VALUES (
        v_user_id,
        p_business_id,
        trim(p_draft_name),
        p_form_data,
        p_step_completed,
        now()
    )
    ON CONFLICT (user_id, business_id, draft_name) 
    DO UPDATE SET 
        form_data = EXCLUDED.form_data,
        step_completed = EXCLUDED.step_completed,
        updated_at = now()
    RETURNING id INTO v_draft_id;
    
    RETURN v_draft_id;
END;
$$;

-- Create function to load coupon drafts for a user
CREATE OR REPLACE FUNCTION get_coupon_drafts(
    p_business_id uuid DEFAULT NULL,
    p_limit integer DEFAULT 50
)
RETURNS TABLE (
    id uuid,
    business_id uuid,
    business_name text,
    draft_name text,
    form_data jsonb,
    step_completed integer,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    RETURN QUERY
    SELECT 
        cd.id,
        cd.business_id,
        b.business_name,
        cd.draft_name,
        cd.form_data,
        cd.step_completed,
        cd.created_at,
        cd.updated_at
    FROM coupon_drafts cd
    JOIN businesses b ON cd.business_id = b.id
    WHERE cd.user_id = v_user_id
    AND (p_business_id IS NULL OR cd.business_id = p_business_id)
    ORDER BY cd.updated_at DESC
    LIMIT p_limit;
END;
$$;

-- Create function to delete a coupon draft
CREATE OR REPLACE FUNCTION delete_coupon_draft(p_draft_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_deleted_count integer;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    DELETE FROM coupon_drafts 
    WHERE id = p_draft_id AND user_id = v_user_id;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count > 0;
END;
$$;

-- Add unique constraint to prevent duplicate draft names per user per business
ALTER TABLE coupon_drafts ADD CONSTRAINT unique_draft_per_user_business 
    UNIQUE (user_id, business_id, draft_name);

-- Success message
SELECT 'Coupon drafts system created successfully!' as status;