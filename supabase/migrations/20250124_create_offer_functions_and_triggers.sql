-- Migration: Offer Functions & Triggers for Story 4.12
-- Date: 2025-01-24
-- Description: Create analytics functions and lifecycle triggers for offers

-- ==========================================
-- Function: Increment offer view count
-- ==========================================
CREATE OR REPLACE FUNCTION increment_offer_view_count(
  p_offer_id UUID,
  p_user_id UUID DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Update offer table
  UPDATE offers SET view_count = view_count + 1 WHERE id = p_offer_id;
  
  -- Update analytics table
  INSERT INTO offer_analytics (offer_id, business_id, total_views)
  VALUES (
    p_offer_id,
    (SELECT business_id FROM offers WHERE id = p_offer_id),
    1
  )
  ON CONFLICT (offer_id) DO UPDATE SET
    total_views = offer_analytics.total_views + 1,
    unique_viewers = CASE 
      WHEN p_user_id IS NOT NULL THEN offer_analytics.unique_viewers + 1
      ELSE offer_analytics.unique_viewers
    END,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Function: Increment offer share count
-- ==========================================
CREATE OR REPLACE FUNCTION increment_offer_share_count(
  p_offer_id UUID,
  p_channel VARCHAR
) RETURNS void AS $$
BEGIN
  -- Update offer table
  UPDATE offers SET share_count = share_count + 1 WHERE id = p_offer_id;
  
  -- Update analytics with channel breakdown
  UPDATE offer_analytics 
  SET 
    total_shares = total_shares + 1,
    share_channels = jsonb_set(
      share_channels,
      ARRAY[p_channel],
      to_jsonb(COALESCE((share_channels->>p_channel)::int, 0) + 1)
    ),
    updated_at = now()
  WHERE offer_id = p_offer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Function: Increment offer click count
-- ==========================================
CREATE OR REPLACE FUNCTION increment_offer_click_count(
  p_offer_id UUID,
  p_source VARCHAR DEFAULT 'direct'
) RETURNS void AS $$
BEGIN
  -- Update offer table
  UPDATE offers SET click_count = click_count + 1 WHERE id = p_offer_id;
  
  -- Update analytics with source breakdown
  UPDATE offer_analytics 
  SET 
    total_clicks = total_clicks + 1,
    click_sources = jsonb_set(
      click_sources,
      ARRAY[p_source],
      to_jsonb(COALESCE((click_sources->>p_source)::int, 0) + 1)
    ),
    updated_at = now()
  WHERE offer_id = p_offer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Trigger: Auto-update updated_at timestamp on offers
-- ==========================================
CREATE OR REPLACE FUNCTION update_offer_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_offer_timestamp ON offers;
CREATE TRIGGER trigger_update_offer_timestamp
BEFORE UPDATE ON offers
FOR EACH ROW
EXECUTE FUNCTION update_offer_updated_at();

-- ==========================================
-- Trigger: Log lifecycle events on offer insert/update
-- ==========================================
CREATE OR REPLACE FUNCTION log_offer_lifecycle_event()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO offer_lifecycle_events (offer_id, business_id, user_id, event_type, event_metadata)
    VALUES (NEW.id, NEW.business_id, NEW.created_by, 'created', jsonb_build_object('status', NEW.status));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'active' THEN
        INSERT INTO offer_lifecycle_events (offer_id, business_id, user_id, event_type, event_metadata)
        VALUES (NEW.id, NEW.business_id, auth.uid(), 'activated', jsonb_build_object('from_status', OLD.status));
      ELSIF NEW.status = 'paused' THEN
        INSERT INTO offer_lifecycle_events (offer_id, business_id, user_id, event_type, event_metadata)
        VALUES (NEW.id, NEW.business_id, auth.uid(), 'deactivated', jsonb_build_object('from_status', OLD.status));
      ELSIF NEW.status = 'expired' THEN
        INSERT INTO offer_lifecycle_events (offer_id, business_id, user_id, event_type, event_metadata)
        VALUES (NEW.id, NEW.business_id, NULL, 'expired', jsonb_build_object('expired_at', now()));
      END IF;
    END IF;
    
    IF OLD.valid_until IS DISTINCT FROM NEW.valid_until AND NEW.valid_until > OLD.valid_until THEN
      INSERT INTO offer_lifecycle_events (offer_id, business_id, user_id, event_type, event_metadata)
      VALUES (NEW.id, NEW.business_id, auth.uid(), 'extended', jsonb_build_object(
        'old_date', OLD.valid_until,
        'new_date', NEW.valid_until
      ));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_offer_lifecycle ON offers;
CREATE TRIGGER trigger_log_offer_lifecycle
AFTER INSERT OR UPDATE ON offers
FOR EACH ROW
EXECUTE FUNCTION log_offer_lifecycle_event();

-- ==========================================
-- Trigger: Notify followers of new offer on activation
-- ==========================================
CREATE OR REPLACE FUNCTION notify_followers_new_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.status = 'active' OR (TG_OP = 'UPDATE' AND COALESCE(OLD.status, '') != 'active' AND NEW.status = 'active') THEN
    INSERT INTO follower_notifications (
      business_id, user_id, notification_type, title, message, action_url, metadata
    )
    SELECT 
      bf.business_id, bf.user_id, 'new_offer',
      'New Offer Available!',
      b.business_name || ' has a new offer: ' || NEW.title,
      '/business/' || bf.business_id || '?offer=' || NEW.offer_code,
      jsonb_build_object(
        'offer_id', NEW.id,
        'offer_title', NEW.title,
        'valid_until', NEW.valid_until
      )
    FROM business_followers bf
    JOIN businesses b ON b.id = bf.business_id
    WHERE bf.business_id = NEW.business_id
      AND bf.is_active = true
      AND COALESCE((bf.notification_preferences->>'new_offers')::boolean, true) = true
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_notify_followers_new_offer ON offers;
CREATE TRIGGER trigger_notify_followers_new_offer
AFTER INSERT OR UPDATE ON offers
FOR EACH ROW
EXECUTE FUNCTION notify_followers_new_offer();
