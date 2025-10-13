# Simple Supabase Migration Script
$projectId = "ysxmgbblljoyebvugrfo"

Write-Host "Deploying migrations to Supabase..." -ForegroundColor Cyan
Write-Host "Project ID: $projectId" -ForegroundColor Yellow
Write-Host ""

# Migration 1: Create user_profiles table
Write-Host "1. Creating user_profiles table..." -ForegroundColor Yellow
$sql1 = @"
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  age INTEGER CHECK (age >= 13 AND age <= 100),
  age_range TEXT CHECK (age_range IN ('18-24', '25-34', '35-44', '45-54', '55-64', '65+')),
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  income_range TEXT CHECK (income_range IN ('below_3lpa', '3-5lpa', '5-10lpa', '10-20lpa', 'above_20lpa')),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  city TEXT,
  state TEXT,
  postal_code TEXT,
  interests TEXT[],
  purchase_history JSONB DEFAULT '[]'::jsonb,
  last_active_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_purchases INTEGER DEFAULT 0,
  total_spent_cents BIGINT DEFAULT 0,
  is_driver BOOLEAN DEFAULT FALSE,
  driver_rating DECIMAL(3, 2),
  total_trips INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_age_range ON user_profiles(age_range);
CREATE INDEX IF NOT EXISTS idx_user_profiles_gender ON user_profiles(gender);
CREATE INDEX IF NOT EXISTS idx_user_profiles_income_range ON user_profiles(income_range);
CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON user_profiles USING GIST (ll_to_earth(latitude, longitude));
CREATE INDEX IF NOT EXISTS idx_user_profiles_interests ON user_profiles USING GIN (interests);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_driver ON user_profiles(is_driver);
CREATE INDEX IF NOT EXISTS idx_user_profiles_city ON user_profiles(city);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow read access to user_profiles" ON user_profiles FOR SELECT TO authenticated USING (true);
"@

try {
    supabase db execute --project-ref $projectId --query $sql1
    Write-Host "   Success!" -ForegroundColor Green
} catch {
    Write-Host "   Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "2. Creating calculate_campaign_reach function..." -ForegroundColor Yellow
$sql2Path = ".\supabase\migrations\20250113_calculate_reach_function.sql"
try {
    supabase db execute --project-ref $projectId --file $sql2Path
    Write-Host "   Success!" -ForegroundColor Green
} catch {
    Write-Host "   Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "3. Seeding 10000 users (this may take 60 seconds)..." -ForegroundColor Yellow
$sql3Path = ".\supabase\migrations\20250113_seed_user_profiles.sql"
try {
    supabase db execute --project-ref $projectId --file $sql3Path
    Write-Host "   Success!" -ForegroundColor Green
} catch {
    Write-Host "   Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "4. Verifying data..." -ForegroundColor Yellow
try {
    $count = supabase db execute --project-ref $projectId --query "SELECT COUNT(*) FROM user_profiles;"
    Write-Host "   User count: $count" -ForegroundColor Cyan
} catch {
    Write-Host "   Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Deployment complete!" -ForegroundColor Green
