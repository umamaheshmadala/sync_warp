# Get your Supabase service role key from dashboard
Write-Host "To execute SQL directly, you need your SERVICE ROLE key (not anon key)" -ForegroundColor Yellow
Write-Host "Get it from: https://supabase.com/dashboard/project/ysxmgbblljoyebvugrfo/settings/api" -ForegroundColor Yellow
Write-Host "Look for 'service_role' key (starts with eyJ...)" -ForegroundColor Yellow
Write-Host ""

$serviceKey = Read-Host "Enter your SERVICE ROLE key"
$supabaseUrl = "https://ysxmgbblljoyebvugrfo.supabase.co"

$headers = @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer $serviceKey"
    "Content-Type" = "application/json"
}

# Insert businesses one by one
$businesses = @(
    @{business_name="Cafe Coffee Day - Vijayawada"; business_type="Restaurant"; address="MG Road, Vijayawada"; latitude=16.4715657; longitude=80.6150415; phone="+91-8866123456"; website="https://www.cafecoffeeday.com"; status="active"},
    @{business_name="McDonald's Vijayawada"; business_type="Restaurant"; address="Besant Road, Vijayawada"; latitude=16.4705657; longitude=80.6140415; phone="+91-8866654321"; website="https://www.mcdonalds.co.in"; status="active"},
    @{business_name="More Supermarket"; business_type="Retail"; address="Labbipet, Vijayawada"; latitude=16.4720657; longitude=80.6156415; phone="+91-8866789012"; website="https://www.more.co.in"; status="active"},
    @{business_name="Apollo Pharmacy"; business_type="Healthcare"; address="Governorpet, Vijayawada"; latitude=16.4700657; longitude=80.6136415; phone="+91-8866345678"; website="https://www.apollopharmacy.in"; status="active"},
    @{business_name="PVP Square Mall"; business_type="Shopping"; address="PVP Square, Vijayawada"; latitude=16.4730657; longitude=80.6170415; phone="+91-8866901234"; website="https://www.pvpsquare.com"; status="active"}
)

$successCount = 0
foreach ($business in $businesses) {
    try {
        $body = $business | ConvertTo-Json
        $result = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/businesses" -Method POST -Headers $headers -Body $body
        Write-Host "✅ Added: $($business.business_name)" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host "⚠️ Skipped: $($business.business_name) (may already exist)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✅ Process complete! Added $successCount businesses" -ForegroundColor Green
Write-Host "🎉 Now refresh your app at http://localhost:5173" -ForegroundColor Green