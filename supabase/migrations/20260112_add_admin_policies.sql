-- Enable RLS on cleanup_logs if not already enabled
ALTER TABLE cleanup_logs ENABLE ROW LEVEL SECURITY;

-- Policy for Admins to view all logs
DROP POLICY IF EXISTS "Admins can view all logs" ON cleanup_logs;
CREATE POLICY "Admins can view all logs" 
ON cleanup_logs 
FOR SELECT 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Policy for Admins to view all messages (for stats)
DROP POLICY IF EXISTS "Admins can view all messages" ON messages;
CREATE POLICY "Admins can view all messages" 
ON messages 
FOR SELECT 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
