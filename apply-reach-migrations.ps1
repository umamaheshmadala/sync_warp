# =============================================================================
# Apply Reach Estimation Migrations to Supabase
# =============================================================================

Write-Host "🚀 Supabase Migration Deployment Script" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

# Check if supabase CLI is installed
$supabaseCli = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseCli) {
    Write-Host "❌ Supabase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Get project ID from user
$projectId = Read-Host "Enter your Supabase Project ID (found in dashboard URL)"

if ([string]::IsNullOrWhiteSpace($projectId)) {
    Write-Host "❌ Project ID is required!" -ForegroundColor Red
    exit 1
}

Write-Host "`n📊 Starting migration deployment...`n" -ForegroundColor Green

# Migration 1: Create user_profiles table
Write-Host "1️⃣  Creating user_profiles table..." -ForegroundColor Yellow
$migration1 = Get-Content ".\supabase\migrations\20250113_user_profiles_targeting.sql" -Raw
try {
    $result1 = supabase db execute --project-ref $projectId --query $migration1 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ user_profiles table created successfully!" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Error: $result1" -ForegroundColor Red
        Write-Host "   Continuing with next migration..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Error: $_" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# Migration 2: Create reach calculation function
Write-Host "`n2. Creating calculate_campaign_reach() function..." -ForegroundColor Yellow
$migration2 = Get-Content ".\supabase\migrations\20250113_calculate_reach_function.sql" -Raw
try {
    $result2 = supabase db execute --project-ref $projectId --query $migration2 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Function created successfully!" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Error: $result2" -ForegroundColor Red
        Write-Host "   Continuing with next migration..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Error: $_" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# Migration 3: Seed data
Write-Host "`n3️⃣  Seeding 10,000 sample users..." -ForegroundColor Yellow
Write-Host "   ⏳ This may take 30-60 seconds..." -ForegroundColor Gray
$migration3 = Get-Content ".\supabase\migrations\20250113_seed_user_profiles.sql" -Raw
try {
    $result3 = supabase db execute --project-ref $projectId --query $migration3 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Data seeded successfully!" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Error: $result3" -ForegroundColor Red
    }
} catch {
    Write-Host "   ⚠️  Error: $_" -ForegroundColor Red
}

# Verify data
Write-Host "`n4️⃣  Verifying data..." -ForegroundColor Yellow
try {
    $countQuery = "SELECT COUNT(*) as total FROM user_profiles;"
    $count = supabase db execute --project-ref $projectId --query $countQuery 2>&1
    Write-Host "   User count: $count" -ForegroundColor Cyan
    
    if ($count -match "10000|10,000") {
        Write-Host "   ✅ Data verification passed!" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Expected 10,000 users, got: $count" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Could not verify data: $_" -ForegroundColor Yellow
}

# Test reach calculation
Write-Host "`n5️⃣  Testing reach calculation..." -ForegroundColor Yellow
try {
    $testQuery = "SELECT total_reach FROM calculate_campaign_reach('{""demographics"": {""gender"": [""male""]}}'::jsonb, false);"
    $testResult = supabase db execute --project-ref $projectId --query $testQuery 2>&1
    Write-Host "   📊 Male user reach: $testResult" -ForegroundColor Cyan
    
    if ($testResult -match "\d{4,}") {
        Write-Host "   ✅ Reach calculation working!" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️  Could not test calculation: $_" -ForegroundColor Yellow
}

Write-Host "`n=========================================`n" -ForegroundColor Cyan
Write-Host "🎉 Migration deployment complete!`n" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Refresh your browser to see slider fixes" -ForegroundColor White
Write-Host "2. Test demographic filters (gender, age, income)" -ForegroundColor White
Write-Host "3. Test location filters (move marker, change radius)" -ForegroundColor White
Write-Host "4. Test behavior filters (interests, driver only)" -ForegroundColor White
Write-Host "5. Check ReachSummaryCard shows accurate breakdown" -ForegroundColor White
