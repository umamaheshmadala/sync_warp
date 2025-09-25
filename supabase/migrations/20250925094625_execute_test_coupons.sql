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
    ),
    -- Food combo deal
    (
        'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf',
        'Buy 2 Get 1 Free Food Items',
        'Amazing BOGO deal on selected food items at Test Business 01',
        'buy_x_get_y',
        'buy_x_get_y',
        100,
        'Buy any 2 food items and get 1 free. Free item will be of equal or lesser value. Valid on selected items only.',
        NOW(),
        NOW() + INTERVAL '15 days',
        'all_users',
        true,
        'BOGO2FOR1' || FLOOR(RANDOM() * 1000)::TEXT,
        'active',
        'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2'
    ),
    -- Free dessert
    (
        'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf',
        'Free Dessert with Meal',
        'Complimentary dessert with any meal over $30 at Test Business 01',
        'free_item',
        'free_item',
        0,
        'Free dessert with main course purchase over $30. Choose from selected dessert menu. Dine-in only.',
        NOW(),
        NOW() + INTERVAL '25 days',
        'returning_users',
        true,
        'FREEDESSERT' || FLOOR(RANDOM() * 1000)::TEXT,
        'active',
        'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2'
    )
ON CONFLICT (coupon_code) DO NOTHING;