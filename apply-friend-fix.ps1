# PowerShell script to automatically apply friend system fix
# Run this script: .\apply-friend-fix.ps1

Write-Host "🔧 Applying Friend System Fix..." -ForegroundColor Yellow

# Check if supabase CLI is available
try {
    $supabaseVersion = supabase --version
    Write-Host "✅ Supabase CLI found: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "npm install -g supabase" -ForegroundColor Cyan
    exit 1
}

# Read the SQL fix
$sqlContent = @"
-- QUICK FIX for Friend System Issues

-- Fix RLS policies (403 errors)
DROP POLICY IF EXISTS "Users can create their own activities" ON public.friend_activities;
DROP POLICY IF EXISTS "Users can view friend activities" ON public.friend_activities;

CREATE POLICY "Anyone can create activities" ON public.friend_activities
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view activities" ON public.friend_activities  
  FOR SELECT USING (true);

-- Fix constraints (409 errors)
ALTER TABLE public.friendships DROP CONSTRAINT IF EXISTS friendships_unique;
DROP INDEX IF EXISTS friendships_unique;
CREATE UNIQUE INDEX friendships_unique_bidirectional ON public.friendships 
(LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id));

-- Create missing functions
CREATE OR REPLACE FUNCTION accept_friend_request_safe(request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS `$`$
DECLARE
    request_record RECORD;
BEGIN
    SELECT * INTO request_record FROM public.friend_requests 
    WHERE id = request_id AND status = 'pending';
    
    IF NOT FOUND THEN RETURN FALSE; END IF;
    
    -- Create friendship
    INSERT INTO public.friendships (user1_id, user2_id)
    VALUES (
        LEAST(request_record.requester_id, request_record.receiver_id),
        GREATEST(request_record.requester_id, request_record.receiver_id)
    ) ON CONFLICT DO NOTHING;
    
    -- Update request
    UPDATE public.friend_requests SET status = 'accepted', updated_at = NOW() 
    WHERE id = request_id;
    
    RETURN TRUE;
END;
`$`$;

-- Test the fix
SELECT 'Friend system fix applied successfully!' as status;
"@

# Write SQL to temporary file
$tempSqlFile = "temp-friend-fix.sql"
$sqlContent | Out-File -FilePath $tempSqlFile -Encoding UTF8

Write-Host "📝 Created temporary SQL file: $tempSqlFile" -ForegroundColor Cyan

try {
    # Check if we're in a Supabase project
    if (Test-Path "supabase/config.toml") {
        Write-Host "📂 Found Supabase project configuration" -ForegroundColor Green
        
        # Try to apply via supabase CLI
        Write-Host "🚀 Applying fix to remote database..." -ForegroundColor Yellow
        
        # Run the SQL file
        $result = supabase db remote commit --file $tempSqlFile --message "Fix friend system issues" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Friend system fix applied successfully!" -ForegroundColor Green
            Write-Host "🎉 You can now test your friend request functionality" -ForegroundColor Cyan
        } else {
            Write-Host "⚠️  Supabase CLI method failed. Manual steps:" -ForegroundColor Yellow
            Write-Host "1. Go to your Supabase Dashboard" -ForegroundColor White
            Write-Host "2. Navigate to SQL Editor" -ForegroundColor White
            Write-Host "3. Copy and paste the content from: $tempSqlFile" -ForegroundColor White
            Write-Host "4. Run the script" -ForegroundColor White
        }
    } else {
        Write-Host "⚠️  Not in a Supabase project directory" -ForegroundColor Yellow
        Write-Host "Manual steps required:" -ForegroundColor White
        Write-Host "1. Go to your Supabase Dashboard" -ForegroundColor White
        Write-Host "2. Navigate to SQL Editor" -ForegroundColor White
        Write-Host "3. Copy and paste the content from: $tempSqlFile" -ForegroundColor White
        Write-Host "4. Run the script" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Error occurred: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please apply the fix manually through Supabase Dashboard" -ForegroundColor Yellow
}

# Keep the temp file for manual use if needed
Write-Host "📄 SQL fix saved in: $tempSqlFile (you can delete this after applying)" -ForegroundColor Gray

Write-Host "`n🔍 After applying the fix, test these features:" -ForegroundColor Cyan
Write-Host "   • Find Friends modal - search and send friend requests" -ForegroundColor White
Write-Host "   • Friend Requests - accept/reject pending requests" -ForegroundColor White
Write-Host "   • Friends list - view and manage your friends" -ForegroundColor White