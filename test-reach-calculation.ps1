# Test Reach Calculation Script
# This script runs comprehensive tests on the database function

Write-Host "🧪 Starting Reach Calculation Tests..." -ForegroundColor Cyan
Write-Host ""

# Check if supabase CLI is available
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Supabase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Check if we're in a Supabase project
if (-not (Test-Path ".\.supabase")) {
    Write-Host "❌ Not in a Supabase project directory" -ForegroundColor Red
    Write-Host "   Run: supabase init" -ForegroundColor Yellow
    exit 1
}

Write-Host "📊 Running SQL test suite..." -ForegroundColor Green
Write-Host "This will test:"
Write-Host "  1. User profiles data" -ForegroundColor Gray
Write-Host "  2. Demographics filters" -ForegroundColor Gray
Write-Host "  3. Location filters" -ForegroundColor Gray
Write-Host "  4. Behavior filters" -ForegroundColor Gray
Write-Host "  5. Combined filters" -ForegroundColor Gray
Write-Host ""

# Run the test SQL file
$testFile = ".\supabase\test_reach_calculation.sql"

if (Test-Path $testFile) {
    Write-Host "▶️  Executing test queries..." -ForegroundColor Cyan
    
    # Execute via psql if available, otherwise suggest running in Supabase dashboard
    if (Get-Command psql -ErrorAction SilentlyContinue) {
        # Get connection string from supabase
        $dbUrl = supabase status --output=json 2>$null | ConvertFrom-Json | Select-Object -ExpandProperty db_url
        
        if ($dbUrl) {
            psql "$dbUrl" -f $testFile | Tee-Object -FilePath "test-results.txt"
            Write-Host ""
            Write-Host "✅ Test results saved to: test-results.txt" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Could not get database URL from supabase CLI" -ForegroundColor Yellow
            Write-Host "📋 Please run the SQL in Supabase Dashboard instead:" -ForegroundColor Cyan
            Write-Host "   1. Go to Supabase Dashboard -> SQL Editor"
            Write-Host "   2. Copy contents of: $testFile"
            Write-Host "   3. Paste and run"
        }
    } else {
        Write-Host "psql not found" -ForegroundColor Yellow
        Write-Host "Please run the SQL in Supabase Dashboard:" -ForegroundColor Cyan
        Write-Host "   1. Go to Supabase Dashboard -> SQL Editor"
        Write-Host "   2. Copy contents of: $testFile"
        Write-Host "   3. Paste and run"
        Write-Host "   4. Share the results here"
    }
} else {
    Write-Host "❌ Test file not found: $testFile" -ForegroundColor Red
}

Write-Host ""
Write-Host "📖 Instructions:" -ForegroundColor Cyan
Write-Host "   After running these tests, look for:" -ForegroundColor Gray
Write-Host "   - Demographics count should match filtered age/gender" -ForegroundColor Gray
Write-Host "   - Location count should decrease with smaller radius" -ForegroundColor Gray
Write-Host "   - Behavior count should show only drivers when filtered" -ForegroundColor Gray
Write-Host "   - Debug info should show the SQL queries being executed" -ForegroundColor Gray
