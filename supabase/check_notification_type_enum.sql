-- Check what enum type is used for notification_type
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE t.typname IN (
    SELECT udt_name 
    FROM information_schema.columns 
    WHERE table_name = 'notifications' 
    AND column_name = 'notification_type'
)
ORDER BY e.enumsortorder;
