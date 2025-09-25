-- Direct execution to add test coupons
-- Just the INSERT statement without migration wrapper

INSERT INTO business_coupons (
    business_id,
    title,
    description,
    type,
    discount_type,
    discount_value,
    terms_conditions,
    valid_from,
    valid_until,
    target_audience,
    is_public,
    coupon_code,
    status,
    created_by
)
VALUES 
    -- Pizza coupon
    (
        'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf',
        '25% Off Pizza Orders',
        'Get 25% discount on all pizza orders over $20 at Test Business 01',
        'percentage',
        'percentage',
        25,
        'Valid for dine-in and takeaway orders. Cannot be combined with other offers. Minimum order value $20.',
        NOW(),
        NOW() + INTERVAL '30 days',
        'all_users',
        true,
        'PIZZA25OFF' || FLOOR(RANDOM() * 1000)::TEXT,
        'active',
        'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2'
    ),
    -- Coffee coupon  
    (
        'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf',
        '$5 Off Coffee & Beverages',
        'Save $5 on any coffee or beverage order over $15 at Test Business 01',
        'fixed_amount',
        'fixed_amount',
        5,
        'Valid for all coffee and beverage items. Minimum order $15. One use per customer.',
        NOW(),
        NOW() + INTERVAL '20 days',
        'all_users',
        true,
        'COFFEE5OFF' || FLOOR(RANDOM() * 1000)::TEXT,
        'active',
        'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2'
    ),
    -- Burger special
    (
        'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf',
        'Burger Special - 30% Off',
        'Get 30% off on all burger varieties at Test Business 01',
        'percentage',
        'percentage',
        30,
        'Valid for all burger items. Cannot be combined with meal deals. Dine-in only.',
        NOW(),
        NOW() + INTERVAL '10 days',
        'all_users',
        true,
        'BURGER30OFF' || FLOOR(RANDOM() * 1000)::TEXT,
        'active',
        'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2'
    )
ON CONFLICT (coupon_code) DO NOTHING;

-- Verify insertion
SELECT 
  'SUCCESS: Test coupons created!' as result,
  COUNT(*) as count
FROM business_coupons 
WHERE business_id = 'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf'
  AND created_at > NOW() - INTERVAL '1 minute';

-- Show the created coupons
SELECT 
  title,
  discount_value,
  coupon_code,
  status,
  is_public
FROM business_coupons 
WHERE business_id = 'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf'
  AND created_at > NOW() - INTERVAL '1 minute'
ORDER BY title;