-- Check the exact function signature
SELECT 
    routine_name,
    parameter_name,
    data_type,
    parameter_mode,
    ordinal_position
FROM information_schema.parameters 
WHERE routine_name = 'nearby_businesses'
ORDER BY ordinal_position;