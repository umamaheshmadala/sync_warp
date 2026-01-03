-- Automated Notification Triggers for Followers
-- This script creates database triggers to automatically notify followers when:
-- 1. New coupons are created
-- 2. New products are added
-- 3. Business posts updates

-- Function to notify followers about new coupons
CREATE OR REPLACE FUNCTION notify_followers_new_coupon()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for active/published coupons
  IF NEW.status = 'active' OR (TG_OP = 'UPDATE' AND OLD.status != 'active' AND NEW.status = 'active') THEN
    -- Insert notifications for all active followers who want coupon notifications
    INSERT INTO follower_notifications (
      business_id,
      user_id,
      notification_type,
      title,
      message,
      action_url,
      metadata
    )
    SELECT 
      bf.business_id,
      bf.user_id,
      'new_coupon',
      'New Coupon Available!',
      'Check out the latest coupon from ' || b.business_name,
      '/business/' || bf.business_id || '/coupons/' || NEW.id,
      jsonb_build_object(
        'coupon_id', NEW.id,
        'coupon_title', NEW.title,
        'discount_value', NEW.discount_value,
        'discount_type', NEW.discount_type
      )
    FROM business_followers bf
    JOIN businesses b ON b.id = bf.business_id
    WHERE bf.business_id = NEW.business_id
      AND bf.is_active = true
      AND (bf.notification_preferences->>'new_coupons')::boolean = true
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for coupon creation/activation
DROP TRIGGER IF EXISTS trigger_notify_followers_new_coupon ON business_coupons;
CREATE TRIGGER trigger_notify_followers_new_coupon
AFTER INSERT OR UPDATE ON business_coupons
FOR EACH ROW
EXECUTE FUNCTION notify_followers_new_coupon();

-- Function to notify followers about new products
CREATE OR REPLACE FUNCTION notify_followers_new_product()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for available/featured products
  IF NEW.is_available = true AND NEW.is_featured = true THEN
    -- Insert notifications for all active followers who want product notifications
    INSERT INTO follower_notifications (
      business_id,
      user_id,
      notification_type,
      title,
      message,
      action_url,
      metadata
    )
    SELECT 
      bf.business_id,
      bf.user_id,
      'new_product',
      'New Product Available!',
      b.business_name || ' just added: ' || NEW.name,
      '/business/' || bf.business_id || '/product/' || NEW.id,
      jsonb_build_object(
        'product_id', NEW.id,
        'product_name', NEW.name,
        'price', NEW.price,
        'category', NEW.category
      )
    FROM business_followers bf
    JOIN businesses b ON b.id = bf.business_id
    WHERE bf.business_id = NEW.business_id
      AND bf.is_active = true
      AND (bf.notification_preferences->>'new_products')::boolean = true
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for product creation
DROP TRIGGER IF EXISTS trigger_notify_followers_new_product ON business_products;
CREATE TRIGGER trigger_notify_followers_new_product
AFTER INSERT OR UPDATE ON business_products
FOR EACH ROW
EXECUTE FUNCTION notify_followers_new_product();

-- Function to send follower update notifications
CREATE OR REPLACE FUNCTION notify_followers_update()
RETURNS TRIGGER AS $$
DECLARE
  target_filter TEXT;
BEGIN
  -- Only trigger when status changes to 'sent'
  IF NEW.status = 'sent' AND (OLD.status IS NULL OR OLD.status != 'sent') THEN
    target_filter := COALESCE(NEW.target_followers, 'all');
    
    -- Insert notifications based on targeting
    IF target_filter = 'all' THEN
      -- Notify all active followers who want announcements
      INSERT INTO follower_notifications (
        business_id,
        user_id,
        notification_type,
        title,
        message,
        action_url,
        metadata,
        update_id
      )
      SELECT 
        bf.business_id,
        bf.user_id,
        'announcement',
        NEW.title,
        NEW.content,
        CASE 
          WHEN NEW.link_url IS NOT NULL THEN NEW.link_url
          ELSE '/business/' || bf.business_id
        END,
        NEW.metadata,
        NEW.id
      FROM business_followers bf
      WHERE bf.business_id = NEW.business_id
        AND bf.is_active = true
        AND (bf.notification_preferences->>'announcements')::boolean = true;
        
    ELSIF target_filter = 'high_engagement' THEN
      -- Notify only high-engagement followers
      INSERT INTO follower_notifications (
        business_id,
        user_id,
        notification_type,
        title,
        message,
        action_url,
        metadata,
        update_id
      )
      SELECT 
        bf.business_id,
        bf.user_id,
        'announcement',
        NEW.title,
        NEW.content,
        CASE 
          WHEN NEW.link_url IS NOT NULL THEN NEW.link_url
          ELSE '/business/' || bf.business_id
        END,
        NEW.metadata,
        NEW.id
      FROM business_followers bf
      WHERE bf.business_id = NEW.business_id
        AND bf.is_active = true
        AND (bf.notification_preferences->>'announcements')::boolean = true
        AND bf.followed_at < NOW() - INTERVAL '30 days'; -- Loyal followers
    END IF;
    
    -- Update follower_update with notification count
    UPDATE follower_updates
    SET notifications_sent = (
      SELECT COUNT(*)
      FROM follower_notifications
      WHERE update_id = NEW.id
    )
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for follower updates
DROP TRIGGER IF EXISTS trigger_notify_followers_update ON follower_updates;
CREATE TRIGGER trigger_notify_followers_update
AFTER INSERT OR UPDATE ON follower_updates
FOR EACH ROW
EXECUTE FUNCTION notify_followers_update();

-- Function to update last_notified_at timestamp
CREATE OR REPLACE FUNCTION update_follower_last_notified()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the last_notified_at timestamp for the follower
  UPDATE business_followers
  SET last_notified_at = NOW()
  WHERE business_id = NEW.business_id
    AND user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to track when followers were last notified
DROP TRIGGER IF EXISTS trigger_update_follower_last_notified ON follower_notifications;
CREATE TRIGGER trigger_update_follower_last_notified
AFTER INSERT ON follower_notifications
FOR EACH ROW
EXECUTE FUNCTION update_follower_last_notified();

-- Verification query
SELECT 
  'Notification triggers created successfully!' as message,
  COUNT(*) FILTER (WHERE proname = 'notify_followers_new_coupon') as coupon_trigger,
  COUNT(*) FILTER (WHERE proname = 'notify_followers_new_product') as product_trigger,
  COUNT(*) FILTER (WHERE proname = 'notify_followers_update') as update_trigger,
  COUNT(*) FILTER (WHERE proname = 'update_follower_last_notified') as tracking_trigger
FROM pg_proc
WHERE proname IN (
  'notify_followers_new_coupon',
  'notify_followers_new_product',
  'notify_followers_update',
  'update_follower_last_notified'
);
