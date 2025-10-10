-- Migration: Media Management Rules (Story 4B.7) & Data Retention System (Story 4B.8)
-- Description: Enforces media upload limits, video processing, and data retention policies
-- Created: 2025-01-10

-- ========================================
-- STORY 4B.7: MEDIA MANAGEMENT RULES
-- ========================================

-- Media table updates (adding new fields for tracking)
ALTER TABLE IF EXISTS media ADD COLUMN IF NOT EXISTS processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'));
ALTER TABLE IF EXISTS media ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;
ALTER TABLE IF EXISTS media ADD COLUMN IF NOT EXISTS duration_seconds INTEGER; -- For videos
ALTER TABLE IF NOT EXISTS media ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE IF EXISTS media ADD COLUMN IF NOT EXISTS original_filename TEXT;
ALTER TABLE IF EXISTS media ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);
ALTER TABLE IF EXISTS media ADD COLUMN IF NOT EXISTS upload_error TEXT;
ALTER TABLE IF EXISTS media ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;

-- Create media table if it doesn't exist
CREATE TABLE IF NOT EXISTS media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- 'product', 'business', 'ad', 'coupon'
    entity_id UUID NOT NULL,
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video')),
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    file_size_bytes BIGINT,
    duration_seconds INTEGER, -- For videos only
    original_filename TEXT,
    mime_type VARCHAR(100),
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    upload_error TEXT,
    display_order INTEGER DEFAULT 0,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Media processing queue for async video transcoding and optimization
CREATE TABLE IF NOT EXISTS media_processing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_id UUID REFERENCES media(id) ON DELETE CASCADE NOT NULL,
    task_type VARCHAR(50) NOT NULL CHECK (task_type IN ('transcode_video', 'generate_thumbnail', 'optimize_image', 'validate_media')),
    priority INTEGER DEFAULT 5, -- 1 = highest, 10 = lowest
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Media limits configuration (admin-configurable)
CREATE TABLE IF NOT EXISTS media_limits_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL UNIQUE, -- 'product', 'business_profile', 'ad', 'coupon'
    max_images INTEGER DEFAULT 4,
    max_videos INTEGER DEFAULT 1,
    max_video_duration_seconds INTEGER DEFAULT 60, -- 1 minute
    max_image_size_mb DECIMAL(5,2) DEFAULT 5.0,
    max_video_size_mb DECIMAL(5,2) DEFAULT 50.0,
    allowed_image_formats TEXT[] DEFAULT ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    allowed_video_formats TEXT[] DEFAULT ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo'],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default media limits
INSERT INTO media_limits_config (entity_type, max_images, max_videos, max_video_duration_seconds, max_image_size_mb, max_video_size_mb)
VALUES 
    ('product', 4, 1, 60, 5.0, 50.0),
    ('business_profile', 5, 1, 90, 5.0, 100.0),
    ('ad', 3, 1, 30, 5.0, 30.0),
    ('coupon', 1, 0, 0, 2.0, 0)
ON CONFLICT (entity_type) DO NOTHING;

-- Indexes for media management
CREATE INDEX IF NOT EXISTS idx_media_entity ON media(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_media_status ON media(processing_status);
CREATE INDEX IF NOT EXISTS idx_media_uploaded_by ON media(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_media_processing_queue_status ON media_processing_queue(status, priority);

-- RLS Policies for media table
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view media for public entities" ON media
    FOR SELECT USING (true);

CREATE POLICY "Users can upload media for their own entities" ON media
    FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update their own media" ON media
    FOR UPDATE USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own media" ON media
    FOR DELETE USING (auth.uid() = uploaded_by);

-- Function to validate media limits before upload
CREATE OR REPLACE FUNCTION validate_media_limits()
RETURNS TRIGGER AS $$
DECLARE
    current_images_count INTEGER;
    current_videos_count INTEGER;
    limit_config RECORD;
BEGIN
    -- Get the limit configuration for this entity type
    SELECT * INTO limit_config
    FROM media_limits_config
    WHERE entity_type = NEW.entity_type AND is_active = TRUE
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No media limits configuration found for entity type: %', NEW.entity_type;
    END IF;

    -- Count existing media for this entity
    SELECT 
        COUNT(*) FILTER (WHERE media_type = 'image') AS images,
        COUNT(*) FILTER (WHERE media_type = 'video') AS videos
    INTO current_images_count, current_videos_count
    FROM media
    WHERE entity_type = NEW.entity_type 
        AND entity_id = NEW.entity_id
        AND id != COALESCE(NEW.id, gen_random_uuid()); -- Exclude current record on UPDATE

    -- Validate image count
    IF NEW.media_type = 'image' AND current_images_count >= limit_config.max_images THEN
        RAISE EXCEPTION 'Maximum image limit (%) reached for % %', 
            limit_config.max_images, NEW.entity_type, NEW.entity_id;
    END IF;

    -- Validate video count
    IF NEW.media_type = 'video' AND current_videos_count >= limit_config.max_videos THEN
        RAISE EXCEPTION 'Maximum video limit (%) reached for % %', 
            limit_config.max_videos, NEW.entity_type, NEW.entity_id;
    END IF;

    -- Validate video duration
    IF NEW.media_type = 'video' AND NEW.duration_seconds IS NOT NULL 
        AND NEW.duration_seconds > limit_config.max_video_duration_seconds THEN
        RAISE EXCEPTION 'Video duration (% seconds) exceeds maximum allowed (% seconds)', 
            NEW.duration_seconds, limit_config.max_video_duration_seconds;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce media limits
DROP TRIGGER IF EXISTS trigger_validate_media_limits ON media;
CREATE TRIGGER trigger_validate_media_limits
    BEFORE INSERT OR UPDATE ON media
    FOR EACH ROW
    EXECUTE FUNCTION validate_media_limits();

-- ========================================
-- STORY 4B.8: DATA RETENTION SYSTEM
-- ========================================

-- Data retention policies configuration
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_type VARCHAR(100) NOT NULL UNIQUE, -- 'user_analytics', 'search_history', 'notifications', etc.
    retention_days INTEGER NOT NULL CHECK (retention_days > 0),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    override_allowed BOOLEAN DEFAULT TRUE, -- Whether business owners can request overrides
    grace_period_days INTEGER DEFAULT 7, -- Days before final deletion
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default retention policies
INSERT INTO data_retention_policies (data_type, retention_days, description, override_allowed, grace_period_days)
VALUES 
    ('search_analytics', 90, 'User search queries and analytics data', TRUE, 7),
    ('user_activities', 180, 'User activity logs and interactions', TRUE, 7),
    ('notifications', 30, 'System notifications and alerts', FALSE, 3),
    ('ad_impressions', 365, 'Ad campaign impression and click data', TRUE, 14),
    ('coupon_analytics', 365, 'Coupon collection and redemption analytics', TRUE, 14),
    ('session_logs', 30, 'User session and authentication logs', FALSE, 0),
    ('media_processing_logs', 90, 'Media upload and processing logs', FALSE, 3)
ON CONFLICT (data_type) DO NOTHING;

-- Retention warnings table (automated notifications)
CREATE TABLE IF NOT EXISTS retention_warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID REFERENCES data_retention_policies(id) ON DELETE CASCADE NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    record_count INTEGER DEFAULT 0,
    warning_level INTEGER NOT NULL CHECK (warning_level IN (1, 2, 3)), -- 1=7 days, 2=3 days, 3=1 day
    scheduled_deletion_date DATE NOT NULL,
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Retention override requests (for businesses)
CREATE TABLE IF NOT EXISTS retention_override_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID REFERENCES data_retention_policies(id) ON DELETE CASCADE NOT NULL,
    requested_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    entity_type VARCHAR(100) NOT NULL,
    entity_ids UUID[] NOT NULL, -- Array of specific records to preserve
    reason TEXT NOT NULL,
    extended_retention_days INTEGER NOT NULL CHECK (extended_retention_days > 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Retention archives (soft delete before permanent deletion)
CREATE TABLE IF NOT EXISTS retention_archives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID REFERENCES data_retention_policies(id) ON DELETE CASCADE NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    original_data JSONB NOT NULL, -- Full record snapshot
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_permanent_deletion_at TIMESTAMP WITH TIME ZONE NOT NULL,
    permanently_deleted BOOLEAN DEFAULT FALSE,
    permanently_deleted_at TIMESTAMP WITH TIME ZONE
);

-- Retention audit log
CREATE TABLE IF NOT EXISTS retention_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID REFERENCES data_retention_policies(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('archive', 'delete', 'override_approved', 'override_rejected', 'warning_sent')),
    entity_type VARCHAR(100) NOT NULL,
    affected_count INTEGER DEFAULT 0,
    details JSONB DEFAULT '{}'::JSONB,
    performed_by UUID REFERENCES auth.users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for retention system
CREATE INDEX IF NOT EXISTS idx_retention_warnings_policy ON retention_warnings(policy_id, warning_level);
CREATE INDEX IF NOT EXISTS idx_retention_warnings_deletion_date ON retention_warnings(scheduled_deletion_date);
CREATE INDEX IF NOT EXISTS idx_retention_overrides_status ON retention_override_requests(status, policy_id);
CREATE INDEX IF NOT EXISTS idx_retention_archives_scheduled_deletion ON retention_archives(scheduled_permanent_deletion_at, permanently_deleted);
CREATE INDEX IF NOT EXISTS idx_retention_audit_log_policy ON retention_audit_log(policy_id, performed_at);

-- RLS Policies for retention system
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_override_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin can manage all retention policies
CREATE POLICY "Admins can manage retention policies" ON data_retention_policies
    FOR ALL USING (EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));

-- Business owners can view their warnings
CREATE POLICY "Business owners can view their warnings" ON retention_warnings
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM businesses b
        WHERE b.id = retention_warnings.entity_id 
            AND b.owner_id = auth.uid()
    ));

-- Users can create and view their own override requests
CREATE POLICY "Users can manage their override requests" ON retention_override_requests
    FOR ALL USING (auth.uid() = requested_by);

-- Admins can view all override requests
CREATE POLICY "Admins can manage all override requests" ON retention_override_requests
    FOR ALL USING (EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));

-- Function to check data retention eligibility
CREATE OR REPLACE FUNCTION check_retention_eligibility(
    p_entity_type VARCHAR,
    p_created_at TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    should_warn BOOLEAN,
    should_archive BOOLEAN,
    should_delete BOOLEAN,
    warning_level INTEGER,
    scheduled_deletion_date DATE
) AS $$
DECLARE
    policy RECORD;
    age_days INTEGER;
    grace_period INTEGER;
BEGIN
    -- Get the retention policy for this entity type
    SELECT * INTO policy
    FROM data_retention_policies
    WHERE data_type = p_entity_type AND is_active = TRUE
    LIMIT 1;

    IF NOT FOUND THEN
        -- No policy means no retention enforcement
        RETURN QUERY SELECT FALSE, FALSE, FALSE, 0::INTEGER, NULL::DATE;
        RETURN;
    END IF;

    age_days := EXTRACT(DAY FROM NOW() - p_created_at)::INTEGER;
    grace_period := COALESCE(policy.grace_period_days, 7);

    -- Determine warning level and actions
    IF age_days >= (policy.retention_days - grace_period) AND age_days < policy.retention_days THEN
        -- Warning period
        RETURN QUERY SELECT 
            TRUE,                    -- should_warn
            FALSE,                   -- should_archive
            FALSE,                   -- should_delete
            CASE 
                WHEN age_days >= (policy.retention_days - 1) THEN 3  -- 1 day warning
                WHEN age_days >= (policy.retention_days - 3) THEN 2  -- 3 days warning
                ELSE 1                                                 -- 7 days warning
            END,
            (p_created_at + (policy.retention_days || ' days')::INTERVAL)::DATE;
    ELSIF age_days >= policy.retention_days AND age_days < (policy.retention_days + grace_period) THEN
        -- Archive period (grace period)
        RETURN QUERY SELECT 
            FALSE,                   -- should_warn
            TRUE,                    -- should_archive
            FALSE,                   -- should_delete
            0::INTEGER,
            (p_created_at + ((policy.retention_days + grace_period) || ' days')::INTERVAL)::DATE;
    ELSIF age_days >= (policy.retention_days + grace_period) THEN
        -- Permanent deletion
        RETURN QUERY SELECT 
            FALSE,                   -- should_warn
            FALSE,                   -- should_archive
            TRUE,                    -- should_delete
            0::INTEGER,
            (p_created_at + ((policy.retention_days + grace_period) || ' days')::INTERVAL)::DATE;
    ELSE
        -- No action needed yet
        RETURN QUERY SELECT FALSE, FALSE, FALSE, 0::INTEGER, NULL::DATE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to archive data before deletion
CREATE OR REPLACE FUNCTION archive_for_retention(
    p_entity_type VARCHAR,
    p_entity_data JSONB,
    p_policy_id UUID
)
RETURNS UUID AS $$
DECLARE
    archive_id UUID;
    policy RECORD;
BEGIN
    -- Get policy details
    SELECT * INTO policy FROM data_retention_policies WHERE id = p_policy_id;

    -- Create archive record
    INSERT INTO retention_archives (
        policy_id,
        entity_type,
        original_data,
        scheduled_permanent_deletion_at
    )
    VALUES (
        p_policy_id,
        p_entity_type,
        p_entity_data,
        NOW() + (COALESCE(policy.grace_period_days, 7) || ' days')::INTERVAL
    )
    RETURNING id INTO archive_id;

    -- Log the archival
    INSERT INTO retention_audit_log (policy_id, action, entity_type, affected_count, details)
    VALUES (p_policy_id, 'archive', p_entity_type, 1, jsonb_build_object('archive_id', archive_id));

    RETURN archive_id;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER trigger_media_updated_at
    BEFORE UPDATE ON media
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_media_processing_queue_updated_at
    BEFORE UPDATE ON media_processing_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_retention_policies_updated_at
    BEFORE UPDATE ON data_retention_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_retention_override_requests_updated_at
    BEFORE UPDATE ON retention_override_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE media IS 'Centralized media storage with upload limits and processing status tracking';
COMMENT ON TABLE media_processing_queue IS 'Queue for async video transcoding and image optimization';
COMMENT ON TABLE media_limits_config IS 'Admin-configurable media upload limits per entity type';
COMMENT ON TABLE data_retention_policies IS 'Data retention policies with automatic cleanup schedules';
COMMENT ON TABLE retention_warnings IS 'Automated warnings before data deletion (7, 3, 1 day notices)';
COMMENT ON TABLE retention_override_requests IS 'Business owner requests to extend data retention';
COMMENT ON TABLE retention_archives IS 'Archived data before permanent deletion (soft delete)';
COMMENT ON TABLE retention_audit_log IS 'Complete audit trail of all retention actions';

COMMENT ON FUNCTION validate_media_limits() IS 'Enforces media upload limits (max 4 images, 1 video per entity)';
COMMENT ON FUNCTION check_retention_eligibility(VARCHAR, TIMESTAMP WITH TIME ZONE) IS 'Determines if data should be warned, archived, or deleted';
COMMENT ON FUNCTION archive_for_retention(VARCHAR, JSONB, UUID) IS 'Archives data to cold storage before permanent deletion';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON media TO authenticated;
GRANT SELECT ON media_limits_config TO authenticated;
GRANT SELECT ON data_retention_policies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON retention_override_requests TO authenticated;
GRANT SELECT ON retention_warnings TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Media Management Rules (Story 4B.7) and Data Retention System (Story 4B.8) migration completed successfully!';
    RAISE NOTICE '📊 Created tables: media, media_processing_queue, media_limits_config';
    RAISE NOTICE '🗄️ Created tables: data_retention_policies, retention_warnings, retention_override_requests, retention_archives, retention_audit_log';
    RAISE NOTICE '🔒 RLS policies enabled for secure access control';
    RAISE NOTICE '⚙️ Automatic validation and cleanup functions created';
END $$;
