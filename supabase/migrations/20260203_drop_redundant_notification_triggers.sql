-- Drop redundant triggers that were causing duplicate notifications and ignoring preferences
DROP TRIGGER IF EXISTS trigger_notify_followers_new_offer_insert ON offers;
DROP TRIGGER IF EXISTS trigger_notify_followers_new_offer_update ON offers;
DROP TRIGGER IF EXISTS trigger_notify_followers_new_product ON business_products;
DROP TRIGGER IF EXISTS trigger_notify_followers_new_coupon ON business_coupons;

-- Drop the associated functions if they are no longer needed
DROP FUNCTION IF EXISTS notify_followers_new_offer();
DROP FUNCTION IF EXISTS notify_followers_new_product();
DROP FUNCTION IF EXISTS notify_followers_new_coupon();
