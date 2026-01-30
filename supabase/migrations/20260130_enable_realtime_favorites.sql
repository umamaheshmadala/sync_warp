-- Migration: Enable Realtime for user_favorites
-- Created: 2026-01-30
-- Description: Adds user_favorites to supabase_realtime publication to allow frontend listeners

BEGIN;

  -- Add to publication if it exists
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE user_favorites;
    END IF;
  END
  $$;

COMMIT;
