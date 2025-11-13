# Simple approach - execute SQL using supabase CLI
Write-Host "Adding sample businesses using Supabase CLI..." -ForegroundColor Green

# Since the direct connection didn't work, let's try a different approach
# First, let's create a temporary migration file
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$migrationFile = "supabase/migrations/${timestamp}_add_sample_data.sql"

# Create migrations directory if it doesn't exist
if (!(Test-Path "supabase/migrations")) {
    New-Item -ItemType Directory -Force -Path "supabase/migrations"
}

# Copy our SQL content to a migration file
Copy-Item "database/migrations/add_sample_data.sql" $migrationFile

Write-Host "Created migration file: $migrationFile" -ForegroundColor Yellow

# Try to push the migration
Write-Host "Pushing migration to Supabase..." -ForegroundColor Yellow
supabase db push --include-seed

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Sample data added successfully!" -ForegroundColor Green
    Write-Host "🎉 Now refresh your app at http://localhost:5173" -ForegroundColor Green
} else {
    Write-Host "❌ Migration failed. Let's try manual approach..." -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual Instructions:" -ForegroundColor Yellow
    Write-Host "1. Go to https://supabase.com/dashboard/project/ysxmgbblljoyebvugrfo" -ForegroundColor White
    Write-Host "2. Click 'SQL Editor'" -ForegroundColor White
    Write-Host "3. Copy the contents of database/migrations/add_sample_data.sql" -ForegroundColor White
    Write-Host "4. Paste and run in the SQL editor" -ForegroundColor White
}

# Clean up temporary migration file
Remove-Item $migrationFile -Force