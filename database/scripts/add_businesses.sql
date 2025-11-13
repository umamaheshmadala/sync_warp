-- Simple insert of sample businesses
INSERT INTO public.businesses (
    business_name, business_type, address, 
    latitude, longitude, phone, website, status
) VALUES 
('Cafe Coffee Day - Vijayawada', 'Restaurant', 'MG Road, Vijayawada', 
 16.4715657, 80.6150415, '+91-8866123456', 'https://www.cafecoffeeday.com', 'active'),

('McDonald''s Vijayawada', 'Restaurant', 'Besant Road, Vijayawada', 
 16.4705657, 80.6140415, '+91-8866654321', 'https://www.mcdonalds.co.in', 'active'),

('More Supermarket', 'Retail', 'Labbipet, Vijayawada', 
 16.4720657, 80.6156415, '+91-8866789012', 'https://www.more.co.in', 'active'),

('Apollo Pharmacy', 'Healthcare', 'Governorpet, Vijayawada', 
 16.4700657, 80.6136415, '+91-8866345678', 'https://www.apollopharmacy.in', 'active'),

('PVP Square Mall', 'Shopping', 'PVP Square, Vijayawada', 
 16.4730657, 80.6170415, '+91-8866901234', 'https://www.pvpsquare.com', 'active');

-- Test the function
SELECT 
    business_name,
    ROUND(distance::numeric, 0) || 'm away' as distance,
    business_type
FROM public.nearby_businesses(16.4710657, 80.6146415, 2.0, 5)
ORDER BY distance;