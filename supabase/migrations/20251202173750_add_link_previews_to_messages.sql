-- Add link_previews column to messages table for WhatsApp-style link previews
-- Story 8.3.3: Link Preview Generation

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS link_previews JSONB DEFAULT NULL;

COMMENT ON COLUMN messages.link_previews IS 'Array of link preview objects with Open Graph metadata';

-- Example structure:
-- link_previews: [{
--   "url": "https://example.com",
--   "title": "Example Title",
--   "description": "Example description",
--   "image": "https://example.com/image.jpg",
--   "favicon": "https://example.com/favicon.ico",
--   "type": "generic" | "sync-coupon" | "sync-deal"
-- }]
