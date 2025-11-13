# Apply RLS fix migration to Supabase
Write-Host "🔧 Applying RLS policy fix for business_reviews..." -ForegroundColor Cyan

# Read the migration file
$migrationContent = Get-Content ".\supabase\migrations\20250101000001_fix_review_rls_policy.sql" -Raw

# You'll need to run this SQL in your Supabase dashboard
Write-Host ""
Write-Host "📋 Copy and paste the following SQL into your Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host "=" * 80 -ForegroundColor Gray
Write-Host ""
Write-Host $migrationContent -ForegroundColor White
Write-Host ""
Write-Host "=" * 80 -ForegroundColor Gray
Write-Host ""
Write-Host "Steps:" -ForegroundColor Green
Write-Host "1. Go to your Supabase Dashboard" -ForegroundColor White
Write-Host "2. Click on 'SQL Editor' in the left sidebar" -ForegroundColor White
Write-Host "3. Click 'New Query'" -ForegroundColor White
Write-Host "4. Paste the SQL above" -ForegroundColor White
Write-Host "5. Click 'Run'" -ForegroundColor White
Write-Host ""
Write-Host "Alternative: Use Supabase CLI if installed:" -ForegroundColor Yellow
Write-Host "supabase db push" -ForegroundColor Cyan
