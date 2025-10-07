-- Migration: Add Enhanced Profile Columns to Businesses Table
-- Description: Adds columns for storing enhanced business profile data
-- These columns store JSON strings or text for the enhanced profile tab

-- Add enhanced profile columns to businesses table
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS target_age_range TEXT,
ADD COLUMN IF NOT EXISTS target_income_level TEXT,
ADD COLUMN IF NOT EXISTS target_interests TEXT,
ADD COLUMN IF NOT EXISTS customer_pain_points TEXT,
ADD COLUMN IF NOT EXISTS avg_transaction_value TEXT,
ADD COLUMN IF NOT EXISTS customer_retention_rate TEXT,
ADD COLUMN IF NOT EXISTS monthly_revenue TEXT,
ADD COLUMN IF NOT EXISTS peak_hours TEXT,
ADD COLUMN IF NOT EXISTS business_goals TEXT,
ADD COLUMN IF NOT EXISTS marketing_budget TEXT,
ADD COLUMN IF NOT EXISTS growth_targets TEXT,
ADD COLUMN IF NOT EXISTS expansion_plans TEXT;

-- Add comments for documentation
COMMENT ON COLUMN businesses.target_age_range IS 'JSON array of target age ranges for customers';
COMMENT ON COLUMN businesses.target_income_level IS 'JSON array of target income levels';
COMMENT ON COLUMN businesses.target_interests IS 'JSON array of customer interests';
COMMENT ON COLUMN businesses.customer_pain_points IS 'JSON array of customer behaviors/pain points';
COMMENT ON COLUMN businesses.avg_transaction_value IS 'Average transaction value range';
COMMENT ON COLUMN businesses.customer_retention_rate IS 'Customer base size range';
COMMENT ON COLUMN businesses.monthly_revenue IS 'Visit frequency';
COMMENT ON COLUMN businesses.peak_hours IS 'JSON array of peak business hours';
COMMENT ON COLUMN businesses.business_goals IS 'JSON array of primary business goals';
COMMENT ON COLUMN businesses.marketing_budget IS 'Monthly marketing budget range';
COMMENT ON COLUMN businesses.growth_targets IS 'Target new customers';
COMMENT ON COLUMN businesses.expansion_plans IS 'JSON array of preferred campaign types';

-- Verify the columns were added
DO $$
BEGIN
  RAISE NOTICE 'Enhanced profile columns added successfully to businesses table';
END $$;
