-- Migration: Report System (Story 8.7.2)
-- Description: Adds tables and types for message reporting and moderation.

-- 1. Create Report Reason Enum
DO $$ BEGIN
    CREATE TYPE report_reason AS ENUM (
        'spam',
        'harassment',
        'hate_speech',
        'self_harm',
        'sexual_content',
        'violence',
        'scam',
        'impersonation',
        'copyright',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Message Reports Table
CREATE TABLE IF NOT EXISTS message_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason report_reason NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')) DEFAULT 'pending',
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    reporter_reputation NUMERIC(3,2) DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(message_id, reporter_id)
);

-- 3. Add Indexes
CREATE INDEX IF NOT EXISTS idx_message_reports_status ON message_reports(status);
CREATE INDEX IF NOT EXISTS idx_message_reports_message_id ON message_reports(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reports_reporter ON message_reports(reporter_id);

-- 4. Enable RLS
ALTER TABLE message_reports ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Users can insert their own reports
CREATE POLICY "Users can insert their own reports" ON message_reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports" ON message_reports
    FOR SELECT USING (auth.uid() = reporter_id);

-- 6. Add Flagging Columns to Messages Table (if they don't exist)
DO $$ BEGIN
    ALTER TABLE messages ADD COLUMN is_flagged BOOLEAN DEFAULT false;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE messages ADD COLUMN flag_reason TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
