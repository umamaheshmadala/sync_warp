ALTER TABLE products ADD COLUMN IF NOT EXISTS last_step TEXT DEFAULT 'media';
COMMENT ON COLUMN products.last_step IS 'The last step the user was on in the creation wizard (media, edit, details)';
