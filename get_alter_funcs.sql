SELECT 
    'ALTER FUNCTION public.' || quote_ident(p.proname) || '(' || pg_get_function_identity_arguments(p.oid) || ') SET search_path = '''';' as alter_statement
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
WHERE n.nspname = 'public' 
  AND d.objid IS NULL -- Exclude functions belonging to extensions
  AND (p.proconfig IS NULL OR NOT ('search_path=' = ANY(p.proconfig)));
