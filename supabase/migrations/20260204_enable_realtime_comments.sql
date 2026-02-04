-- Enable Realtime for product_comments table
-- This is often required for new tables if the publication is not set to 'all tables'
-- or if specific tables need to be added.

-- Try to add the table to the default 'supabase_realtime' publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'product_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE product_comments;
  END IF;
END
$$;
