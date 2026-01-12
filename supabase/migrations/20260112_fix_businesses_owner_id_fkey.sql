-- Migration: Fix businesses owner foreign key
-- Description: Explicitly adds the foreign key constraint 'fk_businesses_user_id' to link businesses to profiles.
-- This is required for PostgREST resource embedding using the hint !fk_businesses_user_id.

DO $$ 
BEGIN
    -- Drop the constraint if it exists to ensure clean state
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_businesses_user_id') THEN
        ALTER TABLE businesses DROP CONSTRAINT fk_businesses_user_id;
    END IF;

    -- Add the constraint
    ALTER TABLE businesses 
    ADD CONSTRAINT fk_businesses_user_id 
    FOREIGN KEY (user_id) 
    REFERENCES profiles(id) 
    ON DELETE CASCADE;
END $$;
