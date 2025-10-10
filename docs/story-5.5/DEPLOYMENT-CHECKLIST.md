# Deployment Checklist - Coupon Collection Fix

## Pre-Deployment

### Code Review
- [ ] Review changes in `src/hooks/useCoupons.ts`
- [ ] Verify error handling is comprehensive
- [ ] Check that all error codes are handled
- [ ] Ensure console logging is appropriate

### Documentation Review
- [ ] Read `FIX-COUPON-COLLECTION-ERROR.md`
- [ ] Understand the changes made
- [ ] Review testing procedures
- [ ] Check troubleshooting guide

### Local Testing
- [ ] Test normal coupon collection
- [ ] Test duplicate collection attempt
- [ ] Test coupon deletion
- [ ] Test re-collection after deletion
- [ ] Test shared coupon scenario
- [ ] Verify error messages are clear
- [ ] Check UI updates immediately

## Staging Deployment

### Database Verification
- [ ] Log in to Supabase dashboard (staging)
- [ ] Open SQL Editor
- [ ] Run `VERIFY-HAS-BEEN-SHARED-COLUMN.sql`
- [ ] Confirm 3 rows returned (has_been_shared, deleted_at, shared_to_user_id)
- [ ] If verification fails, proceed to migration

### Database Migration (if needed)
- [ ] Run `APPLY-SHARING-MIGRATION.sql` in Supabase SQL Editor
- [ ] Verify migration completed successfully
- [ ] Re-run verification script
- [ ] Confirm all columns exist
- [ ] Check triggers are in place
- [ ] Verify RLS policies are correct

### Code Deployment
- [ ] Create a new branch: `git checkout -b fix/coupon-collection-error`
- [ ] Commit changes: `git commit -m "Fix: Improve coupon collection error handling and UI refresh"`
- [ ] Push to remote: `git push origin fix/coupon-collection-error`
- [ ] Create Pull Request
- [ ] Wait for code review
- [ ] Merge to main/staging branch

### Staging Testing
- [ ] Restart development server
- [ ] Log in as test user
- [ ] Test normal collection flow
- [ ] Test error scenarios
- [ ] Test deletion and re-collection
- [ ] Test shared coupon logic
- [ ] Verify browser console messages
- [ ] Check Supabase logs for errors
- [ ] Run `TEST-COUPON-FLOW.sql` for comprehensive testing

### Verification
- [ ] All tests pass
- [ ] Error messages are helpful
- [ ] UI updates correctly
- [ ] No console errors
- [ ] No performance degradation
- [ ] Cache clears properly

## Production Deployment

### Pre-Production Checks
- [ ] Staging tests all passed
- [ ] No critical bugs found
- [ ] Team reviewed and approved
- [ ] Backup plan in place
- [ ] Rollback strategy ready

### Database Verification (Production)
- [ ] Log in to Supabase dashboard (production)
- [ ] Run `VERIFY-HAS-BEEN-SHARED-COLUMN.sql`
- [ ] Confirm columns exist
- [ ] If not, schedule maintenance window for migration

### Database Migration (Production)
⚠️ **IMPORTANT**: Only run if verification failed

- [ ] Notify users of maintenance (if needed)
- [ ] Create database backup
- [ ] Run `APPLY-SHARING-MIGRATION.sql`
- [ ] Monitor migration progress
- [ ] Verify migration completed successfully
- [ ] Re-run verification script
- [ ] Check database logs for errors

### Code Deployment (Production)
- [ ] Merge staging branch to production
- [ ] Deploy to production environment
- [ ] Verify deployment successful
- [ ] Check application starts correctly

### Post-Deployment Testing
- [ ] Test normal collection (as real user)
- [ ] Test duplicate collection
- [ ] Test coupon deletion
- [ ] Test re-collection
- [ ] Verify error messages work
- [ ] Check UI refresh works
- [ ] Monitor error logs
- [ ] Check Supabase logs

### Monitoring (First 24 Hours)
- [ ] Monitor error rates
- [ ] Check user reports
- [ ] Review Supabase logs
- [ ] Watch for performance issues
- [ ] Track collection/deletion metrics
- [ ] Monitor cache behavior

## Post-Deployment

### User Communication
- [ ] Announce fix (if needed)
- [ ] Update help documentation
- [ ] Notify support team of changes
- [ ] Update FAQ if needed

### Documentation
- [ ] Update release notes
- [ ] Document any issues found
- [ ] Update troubleshooting guide if needed
- [ ] Archive deployment notes

### Metrics
- [ ] Track collection success rate
- [ ] Monitor error reduction
- [ ] Measure UI response time
- [ ] Track user satisfaction

## Rollback Plan (if needed)

### Immediate Actions
- [ ] Stop new deployments
- [ ] Assess impact
- [ ] Notify team

### Code Rollback
- [ ] Revert to previous version
- [ ] Deploy previous code
- [ ] Verify application works
- [ ] Monitor for stability

### Database Considerations
⚠️ **Note**: Database migrations are additive only (no rollback needed)
- [ ] Verify data integrity
- [ ] Check for orphaned records
- [ ] Monitor database performance

## Success Criteria

✅ Deployment is successful when:
- [ ] All tests pass in production
- [ ] Error messages are specific and helpful
- [ ] UI updates immediately after actions
- [ ] No increase in error rates
- [ ] Users can collect/delete coupons normally
- [ ] Shared coupon logic works correctly
- [ ] No performance degradation
- [ ] Support tickets decrease

## Team Signoffs

- [ ] Developer: _________________________
- [ ] Code Reviewer: _________________________
- [ ] QA Tester: _________________________
- [ ] DevOps: _________________________
- [ ] Product Manager: _________________________

## Notes

### Issues Found During Deployment


### Lessons Learned


### Action Items


---

**Deployment Date**: ______________  
**Deployed By**: ______________  
**Version**: 1.0  
**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Rolled Back
