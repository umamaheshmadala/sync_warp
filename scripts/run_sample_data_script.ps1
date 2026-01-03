# PowerShell script to add sample data to your Supabase database
# Run this script: .\run_sample_data_script.ps1

Write-Host "🚀 Adding sample businesses to your database..." -ForegroundColor Green

$PROJECT_REF = "ysxmgbblljoyebvugrfo"
$DATABASE_URL = "postgresql://postgres:[password]@db.$PROJECT_REF.supabase.co:5432/postgres"

Write-Host "📋 You need to provide your database password."
Write-Host "💡 Get it from: https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
Write-Host ""

# Prompt for password securely
$SecurePassword = Read-Host "Enter your database password" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
$Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Build the connection string
$DatabaseUrl = "postgresql://postgres:$Password@db.$PROJECT_REF.supabase.co:5432/postgres"

Write-Host "🔗 Connecting to database..." -ForegroundColor Yellow

# Execute the SQL script
try {
    psql $DatabaseUrl -f "database/migrations/add_sample_data.sql"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Sample data added successfully!" -ForegroundColor Green
        Write-Host "🎉 Now refresh your app at http://localhost:5173" -ForegroundColor Green
        Write-Host "📍 You should see nearby businesses appear!" -ForegroundColor Green
    } else {
        Write-Host "❌ Error running SQL script. Check your password and try again." -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Make sure you have the correct database password." -ForegroundColor Yellow
}

# Clear password from memory
$Password = $null
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)