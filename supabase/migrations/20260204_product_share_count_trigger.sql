-- Story 12.7: Share Count Trigger
-- Increments products.share_count when a new share_event is created for a product

CREATE OR REPLACE FUNCTION increment_product_share_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for entity_type = 'product'
  IF NEW.entity_type = 'product' THEN
    UPDATE products
    SET share_count = COALESCE(share_count, 0) + 1
    WHERE id = NEW.entity_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to prevent duplication
DROP TRIGGER IF EXISTS trigger_increment_product_share_count ON share_events;

CREATE TRIGGER trigger_increment_product_share_count
AFTER INSERT ON share_events
FOR EACH ROW
EXECUTE FUNCTION increment_product_share_count();
