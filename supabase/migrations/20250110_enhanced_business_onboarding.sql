-- ============================================================================
-- Migration: Enhanced Business Onboarding
-- Story: 4B.4
-- Description: Adds comprehensive business profiling with customer demographics,
--              business metrics, marketing goals, and onboarding progress tracking
-- ============================================================================

-- ============================================================================
-- 1. ALTER EXISTING businesses TABLE
-- ============================================================================

-- Add new columns for enhanced business profiling
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS employees_count INTEGER,
ADD COLUMN IF NOT EXISTS years_in_business INTEGER,
ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_profile_update TIMESTAMPTZ DEFAULT now();

-- Add constraints for new columns
ALTER TABLE businesses
ADD CONSTRAINT IF NOT EXISTS chk_employees_count CHECK (employees_count IS NULL OR employees_count > 0),
ADD CONSTRAINT IF NOT EXISTS chk_years_in_business CHECK (years_in_business IS NULL OR years_in_business >= 0),
ADD CONSTRAINT IF NOT EXISTS chk_profile_completion CHECK (profile_completion_percentage >= 0 AND profile_completion_percentage <= 100);

-- Add index for profile completion queries
CREATE INDEX IF NOT EXISTS idx_businesses_profile_completion 
ON businesses(profile_completion_percentage) 
WHERE profile_completion_percentage < 100;

-- ============================================================================
-- 2. CREATE business_customer_profiles TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Demographics
  primary_age_ranges TEXT[] DEFAULT ARRAY[]::TEXT[],
  gender_distribution JSONB DEFAULT '{"male": 0, "female": 0, "other": 0}'::JSONB,
  income_levels TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Interests & Behavior
  interest_categories TEXT[] DEFAULT ARRAY[]::TEXT[],
  customer_behavior_notes TEXT,
  
  -- Additional Context
  typical_visit_duration INTEGER, -- minutes
  repeat_customer_rate INTEGER, -- percentage (0-100)
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  UNIQUE(business_id),
  CHECK (repeat_customer_rate IS NULL OR (repeat_customer_rate >= 0 AND repeat_customer_rate <= 100))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_profiles_business 
ON business_customer_profiles(business_id);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_age_ranges 
ON business_customer_profiles USING GIN(primary_age_ranges);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_income 
ON business_customer_profiles USING GIN(income_levels);

-- Comments
COMMENT ON TABLE business_customer_profiles IS 'Stores target customer demographics and behavior profiles for businesses';
COMMENT ON COLUMN business_customer_profiles.primary_age_ranges IS 'Array of age ranges like ["25-34", "35-44"]';
COMMENT ON COLUMN business_customer_profiles.gender_distribution IS 'JSON object with male, female, other percentages';
COMMENT ON COLUMN business_customer_profiles.income_levels IS 'Array of income levels like ["middle", "upper_middle"]';

-- ============================================================================
-- 3. CREATE business_metrics TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Transaction Metrics (stored in cents for precision)
  avg_transaction_cents INTEGER,
  min_transaction_cents INTEGER,
  max_transaction_cents INTEGER,
  
  -- Customer Metrics
  avg_visits_per_customer_monthly INTEGER,
  current_customer_base_size INTEGER,
  new_customers_monthly INTEGER,
  
  -- Timing Metrics
  busiest_hours JSONB DEFAULT '[]'::JSONB, -- [{"day": "monday", "hour": 12}, ...]
  busiest_days TEXT[] DEFAULT ARRAY[]::TEXT[], -- ["monday", "friday"]
  
  -- Seasonal Patterns (monthly multipliers, 1.0 = average)
  seasonal_pattern JSONB DEFAULT '{
    "jan": 1.0, "feb": 1.0, "mar": 1.0, "apr": 1.0,
    "may": 1.0, "jun": 1.0, "jul": 1.0, "aug": 1.0,
    "sep": 1.0, "oct": 1.0, "nov": 1.0, "dec": 1.0
  }'::JSONB,
  
  -- Data Quality
  last_calculated_at TIMESTAMPTZ,
  data_source TEXT DEFAULT 'manual', -- 'manual', 'integrated', 'estimated'
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  UNIQUE(business_id),
  CHECK (avg_transaction_cents IS NULL OR avg_transaction_cents > 0),
  CHECK (min_transaction_cents IS NULL OR min_transaction_cents > 0),
  CHECK (max_transaction_cents IS NULL OR max_transaction_cents > 0),
  CHECK (avg_visits_per_customer_monthly IS NULL OR avg_visits_per_customer_monthly > 0),
  CHECK (current_customer_base_size IS NULL OR current_customer_base_size >= 0),
  CHECK (new_customers_monthly IS NULL OR new_customers_monthly >= 0),
  CHECK (data_source IN ('manual', 'integrated', 'estimated'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_metrics_business 
ON business_metrics(business_id);

CREATE INDEX IF NOT EXISTS idx_business_metrics_avg_transaction 
ON business_metrics(avg_transaction_cents) 
WHERE avg_transaction_cents IS NOT NULL;

-- Comments
COMMENT ON TABLE business_metrics IS 'Stores operational metrics and performance data for businesses';
COMMENT ON COLUMN business_metrics.avg_transaction_cents IS 'Average ticket size in cents for precision';
COMMENT ON COLUMN business_metrics.seasonal_pattern IS 'Monthly multipliers showing seasonal trends';
COMMENT ON COLUMN business_metrics.busiest_hours IS 'Array of {day, hour} objects for peak times';

-- ============================================================================
-- 4. CREATE business_marketing_goals TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_marketing_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Goals
  primary_goal TEXT CHECK (primary_goal IN (
    'awareness', 'traffic', 'sales', 'loyalty', 'engagement'
  )),
  secondary_goals TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Budget (stored in cents)
  monthly_budget_cents INTEGER,
  willing_to_spend_more BOOLEAN DEFAULT false,
  
  -- Preferences
  preferred_campaign_types TEXT[] DEFAULT ARRAY[]::TEXT[], -- ['coupons', 'ads', 'events']
  preferred_ad_frequency TEXT DEFAULT 'moderate' CHECK (
    preferred_ad_frequency IN ('low', 'moderate', 'high')
  ),
  
  -- Competition
  aware_of_competitors BOOLEAN DEFAULT false,
  competitor_names TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Success Metrics
  target_new_customers_monthly INTEGER,
  target_revenue_increase_percentage INTEGER,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  UNIQUE(business_id),
  CHECK (monthly_budget_cents IS NULL OR monthly_budget_cents >= 0),
  CHECK (target_new_customers_monthly IS NULL OR target_new_customers_monthly > 0),
  CHECK (target_revenue_increase_percentage IS NULL OR 
         (target_revenue_increase_percentage >= 0 AND target_revenue_increase_percentage <= 1000))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketing_goals_business 
ON business_marketing_goals(business_id);

CREATE INDEX IF NOT EXISTS idx_marketing_goals_primary_goal 
ON business_marketing_goals(primary_goal) 
WHERE primary_goal IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_goals_budget 
ON business_marketing_goals(monthly_budget_cents) 
WHERE monthly_budget_cents IS NOT NULL;

-- Comments
COMMENT ON TABLE business_marketing_goals IS 'Stores marketing objectives and budget information for businesses';
COMMENT ON COLUMN business_marketing_goals.primary_goal IS 'Main marketing objective: awareness, traffic, sales, loyalty, or engagement';
COMMENT ON COLUMN business_marketing_goals.monthly_budget_cents IS 'Monthly marketing budget in cents';

-- ============================================================================
-- 5. CREATE business_onboarding_progress TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  data JSONB DEFAULT '{}'::JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  UNIQUE(business_id, step_number),
  CHECK (step_number > 0 AND step_number <= 10),
  CHECK (step_name IS NOT NULL AND length(step_name) > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_business 
ON business_onboarding_progress(business_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_incomplete 
ON business_onboarding_progress(business_id, completed) 
WHERE completed = false;

-- Comments
COMMENT ON TABLE business_onboarding_progress IS 'Tracks progress through multi-step business onboarding wizard';
COMMENT ON COLUMN business_onboarding_progress.data IS 'Stores draft data for the step';

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate profile completion percentage
CREATE OR REPLACE FUNCTION calculate_profile_completion(p_business_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_score INTEGER := 0;
  v_total_fields INTEGER := 0;
  v_completed_fields INTEGER := 0;
  
  -- Business basic fields (from businesses table)
  v_business RECORD;
  
  -- Extended profile data
  v_has_customer_profile BOOLEAN;
  v_has_metrics BOOLEAN;
  v_has_marketing_goals BOOLEAN;
  
  v_customer_profile RECORD;
  v_metrics RECORD;
  v_goals RECORD;
BEGIN
  -- Get business basic info
  SELECT * INTO v_business
  FROM businesses
  WHERE id = p_business_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Check basic fields (20 points total)
  v_total_fields := 20;
  
  -- Required basics (5 points each)
  IF v_business.name IS NOT NULL AND length(v_business.name) > 0 THEN
    v_completed_fields := v_completed_fields + 1;
  END IF;
  
  IF v_business.category IS NOT NULL THEN
    v_completed_fields := v_completed_fields + 1;
  END IF;
  
  IF v_business.address IS NOT NULL THEN
    v_completed_fields := v_completed_fields + 1;
  END IF;
  
  IF v_business.phone IS NOT NULL THEN
    v_completed_fields := v_completed_fields + 1;
  END IF;
  
  -- Optional basics (worth less, 2.5 points each = 10 points total)
  IF v_business.employees_count IS NOT NULL THEN
    v_completed_fields := v_completed_fields + 0.5;
  END IF;
  
  IF v_business.years_in_business IS NOT NULL THEN
    v_completed_fields := v_completed_fields + 0.5;
  END IF;
  
  -- Check customer profile (30 points total)
  SELECT * INTO v_customer_profile
  FROM business_customer_profiles
  WHERE business_id = p_business_id;
  
  IF FOUND THEN
    v_has_customer_profile := true;
    
    -- Age ranges (10 points)
    IF array_length(v_customer_profile.primary_age_ranges, 1) > 0 THEN
      v_completed_fields := v_completed_fields + 2;
    END IF;
    
    -- Gender distribution (5 points)
    IF (v_customer_profile.gender_distribution->>'male')::INTEGER + 
       (v_customer_profile.gender_distribution->>'female')::INTEGER + 
       (v_customer_profile.gender_distribution->>'other')::INTEGER >= 50 THEN
      v_completed_fields := v_completed_fields + 1;
    END IF;
    
    -- Income levels (10 points)
    IF array_length(v_customer_profile.income_levels, 1) > 0 THEN
      v_completed_fields := v_completed_fields + 2;
    END IF;
    
    -- Interest categories (5 points)
    IF array_length(v_customer_profile.interest_categories, 1) > 0 THEN
      v_completed_fields := v_completed_fields + 1;
    END IF;
  END IF;
  
  -- Check business metrics (30 points total)
  SELECT * INTO v_metrics
  FROM business_metrics
  WHERE business_id = p_business_id;
  
  IF FOUND THEN
    v_has_metrics := true;
    
    -- Average transaction (10 points)
    IF v_metrics.avg_transaction_cents IS NOT NULL THEN
      v_completed_fields := v_completed_fields + 2;
    END IF;
    
    -- Customer metrics (10 points)
    IF v_metrics.current_customer_base_size IS NOT NULL THEN
      v_completed_fields := v_completed_fields + 1;
    END IF;
    
    IF v_metrics.avg_visits_per_customer_monthly IS NOT NULL THEN
      v_completed_fields := v_completed_fields + 1;
    END IF;
    
    -- Busiest hours/days (5 points)
    IF array_length(v_metrics.busiest_days, 1) > 0 OR 
       jsonb_array_length(v_metrics.busiest_hours) > 0 THEN
      v_completed_fields := v_completed_fields + 1;
    END IF;
    
    -- Seasonal patterns (5 points)
    IF v_metrics.seasonal_pattern IS NOT NULL THEN
      v_completed_fields := v_completed_fields + 1;
    END IF;
  END IF;
  
  -- Check marketing goals (20 points total)
  SELECT * INTO v_goals
  FROM business_marketing_goals
  WHERE business_id = p_business_id;
  
  IF FOUND THEN
    v_has_marketing_goals := true;
    
    -- Primary goal (10 points)
    IF v_goals.primary_goal IS NOT NULL THEN
      v_completed_fields := v_completed_fields + 2;
    END IF;
    
    -- Budget (10 points)
    IF v_goals.monthly_budget_cents IS NOT NULL AND v_goals.monthly_budget_cents > 0 THEN
      v_completed_fields := v_completed_fields + 2;
    END IF;
  END IF;
  
  -- Calculate percentage (completed / total * 100)
  v_score := ROUND((v_completed_fields::DECIMAL / v_total_fields::DECIMAL) * 100);
  
  -- Ensure it's between 0 and 100
  v_score := LEAST(100, GREATEST(0, v_score));
  
  -- Update the businesses table
  UPDATE businesses
  SET profile_completion_percentage = v_score,
      last_profile_update = now()
  WHERE id = p_business_id;
  
  RETURN v_score;
END;
$$;

COMMENT ON FUNCTION calculate_profile_completion IS 'Calculates profile completion percentage based on filled fields across all profile tables';

-- Function to update profile completion on changes
CREATE OR REPLACE FUNCTION update_profile_completion_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update completion percentage
  PERFORM calculate_profile_completion(NEW.business_id);
  
  -- Update timestamp
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- Trigger for business_customer_profiles
DROP TRIGGER IF EXISTS trigger_update_customer_profile_completion ON business_customer_profiles;
CREATE TRIGGER trigger_update_customer_profile_completion
  AFTER INSERT OR UPDATE ON business_customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_completion_trigger();

-- Trigger for business_metrics
DROP TRIGGER IF EXISTS trigger_update_metrics_completion ON business_metrics;
CREATE TRIGGER trigger_update_metrics_completion
  AFTER INSERT OR UPDATE ON business_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_completion_trigger();

-- Trigger for business_marketing_goals
DROP TRIGGER IF EXISTS trigger_update_goals_completion ON business_marketing_goals;
CREATE TRIGGER trigger_update_goals_completion
  AFTER INSERT OR UPDATE ON business_marketing_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_completion_trigger();

-- Trigger for updated_at on all tables
CREATE TRIGGER trigger_update_customer_profiles_updated_at
  BEFORE UPDATE ON business_customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_business_metrics_updated_at
  BEFORE UPDATE ON business_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_marketing_goals_updated_at
  BEFORE UPDATE ON business_marketing_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_onboarding_progress_updated_at
  BEFORE UPDATE ON business_onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE business_customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_marketing_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Policies for business_customer_profiles
CREATE POLICY "Business owners can view their customer profiles"
  ON business_customer_profiles FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can manage their customer profiles"
  ON business_customer_profiles FOR ALL
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all customer profiles"
  ON business_customer_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for business_metrics
CREATE POLICY "Business owners can view their metrics"
  ON business_metrics FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can manage their metrics"
  ON business_metrics FOR ALL
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all business metrics"
  ON business_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for business_marketing_goals
CREATE POLICY "Business owners can view their marketing goals"
  ON business_marketing_goals FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can manage their marketing goals"
  ON business_marketing_goals FOR ALL
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all marketing goals"
  ON business_marketing_goals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for business_onboarding_progress
CREATE POLICY "Business owners can view their onboarding progress"
  ON business_onboarding_progress FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can manage their onboarding progress"
  ON business_onboarding_progress FOR ALL
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all onboarding progress"
  ON business_onboarding_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 9. SAMPLE DATA (for testing)
-- ============================================================================

-- Note: Sample data would be inserted here for testing purposes
-- This is commented out for production deployment

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verify migration
DO $$
BEGIN
  RAISE NOTICE 'Enhanced Business Onboarding migration completed successfully!';
  RAISE NOTICE 'New tables created:';
  RAISE NOTICE '  - business_customer_profiles';
  RAISE NOTICE '  - business_metrics';
  RAISE NOTICE '  - business_marketing_goals';
  RAISE NOTICE '  - business_onboarding_progress';
  RAISE NOTICE 'Profile completion calculation function ready';
  RAISE NOTICE 'RLS policies enabled for all tables';
END $$;
