-- =====================================================
-- Master Seed Script - Run All Data Population Scripts
-- =====================================================
-- Purpose: Execute all seed data scripts in the correct order
-- This script runs all 4 population scripts sequentially
-- =====================================================
-- WARNING: This will temporarily disable RLS on multiple tables
-- Only run this in development/test environments
-- =====================================================

\echo '╔══════════════════════════════════════════════════════╗'
\echo '║  Starting Database Seed Data Population             ║'
\echo '║  Project: SynC - Targeted Campaigns System          ║'
\echo '╚══════════════════════════════════════════════════════╝'
\echo ''

-- =====================================================
-- Script 1: Populate User Profiles
-- =====================================================
\echo '📝 Step 1/4: Populating 100 test user profiles...'
\echo '------------------------------------------------'

\i 01_populate_profiles.sql

\echo ''
\echo '✅ Step 1/4 Complete: User profiles populated'
\echo ''
\echo '================================================'
\echo ''

-- =====================================================
-- Script 2: Populate Driver Profiles
-- =====================================================
\echo '🚗 Step 2/4: Creating 20 driver profiles...'
\echo '------------------------------------------------'

\i 02_populate_driver_profiles.sql

\echo ''
\echo '✅ Step 2/4 Complete: Driver profiles created'
\echo ''
\echo '================================================'
\echo ''

-- =====================================================
-- Script 3: Update Businesses with Cities
-- =====================================================
\echo '🏢 Step 3/4: Updating businesses with city data...'
\echo '------------------------------------------------'

\i 03_update_businesses_with_cities.sql

\echo ''
\echo '✅ Step 3/4 Complete: Businesses updated with cities'
\echo ''
\echo '================================================'
\echo ''

-- =====================================================
-- Script 4: Populate Customer Profiles
-- =====================================================
\echo '👥 Step 4/4: Creating customer profiles...'
\echo '------------------------------------------------'

\i 04_populate_customer_profiles.sql

\echo ''
\echo '✅ Step 4/4 Complete: Customer profiles created'
\echo ''
\echo '================================================'
\echo ''

-- =====================================================
-- Final Verification
-- =====================================================
\echo '🔍 Running final verification checks...'
\echo '------------------------------------------------'

-- Comprehensive verification query
SELECT 
  '📊 DATABASE POPULATION SUMMARY' as summary,
  (SELECT COUNT(*) FROM profiles) as total_profiles,
  (SELECT COUNT(*) FROM driver_profiles) as total_drivers,
  (SELECT COUNT(*) FROM customer_profiles) as total_customers,
  (SELECT COUNT(*) FROM businesses WHERE city IS NOT NULL) as businesses_with_city,
  (SELECT ROUND(AVG(driver_score)::numeric, 2) FROM driver_profiles) as avg_driver_score,
  (SELECT ROUND(AVG(avg_rating)::numeric, 2) FROM driver_profiles) as avg_driver_rating,
  (SELECT COUNT(DISTINCT city) FROM businesses WHERE city IS NOT NULL) as unique_cities;

\echo ''
\echo '╔══════════════════════════════════════════════════════╗'
\echo '║  ✅ DATABASE SEED POPULATION COMPLETE!              ║'
\echo '╚══════════════════════════════════════════════════════╝'
\echo ''
\echo '📚 Next Steps:'
\echo '  1. Verify the data using the Supabase Dashboard'
\echo '  2. Test the Campaign Targeting Demo with real data'
\echo '  3. Run integration tests to ensure all components work'
\echo ''
\echo '📖 For more information, see:'
\echo '  - README.md in this directory'
\echo '  - docs/targeted-campaigns.md in project root'
\echo ''
