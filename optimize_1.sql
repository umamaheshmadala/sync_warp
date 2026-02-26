BEGIN;
DROP POLICY IF EXISTS "System can insert activities" ON public."activities";
CREATE POLICY "System can insert activities" ON public."activities" FOR INSERT
  WITH CHECK ((user_id = ( SELECT (select auth.uid()) AS uid)));

DROP POLICY IF EXISTS "Users can read own activities" ON public."activities";
CREATE POLICY "Users can read own activities" ON public."activities" FOR SELECT
  USING ((user_id = ( SELECT (select auth.uid()) AS uid)));

DROP POLICY IF EXISTS "Business owners can manage own campaigns" ON public."ad_campaigns";
CREATE POLICY "Business owners can manage own campaigns" ON public."ad_campaigns" FOR ALL
  USING ((business_id IN ( SELECT businesses.id
   FROM businesses
  WHERE (businesses.owner_id = ( SELECT (select auth.uid()) AS uid)))));

DROP POLICY IF EXISTS "Business owners can create ads" ON public."ads";
CREATE POLICY "Business owners can create ads" ON public."ads" FOR INSERT
  WITH CHECK (((select auth.uid()) IN ( SELECT businesses.user_id
   FROM businesses
  WHERE (businesses.id = ads.business_id))));

DROP POLICY IF EXISTS "Business owners can delete own ads" ON public."ads";
CREATE POLICY "Business owners can delete own ads" ON public."ads" FOR DELETE
  USING (((select auth.uid()) IN ( SELECT businesses.user_id
   FROM businesses
  WHERE (businesses.id = ads.business_id))));

DROP POLICY IF EXISTS "Business owners can update own ads" ON public."ads";
CREATE POLICY "Business owners can update own ads" ON public."ads" FOR UPDATE
  USING (((select auth.uid()) IN ( SELECT businesses.user_id
   FROM businesses
  WHERE (businesses.id = ads.business_id))));

DROP POLICY IF EXISTS "Business owners can view own ads" ON public."ads";
CREATE POLICY "Business owners can view own ads" ON public."ads" FOR SELECT
  USING (((select auth.uid()) IN ( SELECT businesses.user_id
   FROM businesses
  WHERE (businesses.id = ads.business_id))));

DROP POLICY IF EXISTS "Users can insert own usage logs" ON public."api_usage_logs";
CREATE POLICY "Users can insert own usage logs" ON public."api_usage_logs" FOR INSERT
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Authenticated can read app settings" ON public."app_settings";
CREATE POLICY "Authenticated can read app settings" ON public."app_settings" FOR SELECT
  USING (((select auth.uid()) IS NOT NULL));

DROP POLICY IF EXISTS "Business owners can read own billing" ON public."billing_accounts";
CREATE POLICY "Business owners can read own billing" ON public."billing_accounts" FOR SELECT
  USING ((business_id IN ( SELECT businesses.id
   FROM businesses
  WHERE (businesses.owner_id = ( SELECT (select auth.uid()) AS uid)))));

DROP POLICY IF EXISTS "Business owners can update own billing" ON public."billing_accounts";
CREATE POLICY "Business owners can update own billing" ON public."billing_accounts" FOR UPDATE
  USING ((business_id IN ( SELECT businesses.id
   FROM businesses
  WHERE (businesses.owner_id = ( SELECT (select auth.uid()) AS uid)))));

DROP POLICY IF EXISTS "Business owners can read own transactions" ON public."billing_transactions";
CREATE POLICY "Business owners can read own transactions" ON public."billing_transactions" FOR SELECT
  USING ((business_id IN ( SELECT businesses.id
   FROM businesses
  WHERE (businesses.owner_id = ( SELECT (select auth.uid()) AS uid)))));

DROP POLICY IF EXISTS "Users can create blocks against others" ON public."blocked_users";
CREATE POLICY "Users can create blocks against others" ON public."blocked_users" FOR INSERT
  WITH CHECK ((blocker_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can remove their own blocks" ON public."blocked_users";
CREATE POLICY "Users can remove their own blocks" ON public."blocked_users" FOR DELETE
  USING ((blocker_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can update their own blocks" ON public."blocked_users";
CREATE POLICY "Users can update their own blocks" ON public."blocked_users" FOR UPDATE
  USING ((blocker_id = (select auth.uid())))
  WITH CHECK ((blocker_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can view their own blocks" ON public."blocked_users";
CREATE POLICY "Users can view their own blocks" ON public."blocked_users" FOR SELECT
  USING (((select auth.uid()) = blocker_id));

DROP POLICY IF EXISTS "Admins can read all activity logs" ON public."business_activity_log";
CREATE POLICY "Admins can read all activity logs" ON public."business_activity_log" FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.is_admin = true)))));

DROP POLICY IF EXISTS "Owners can insert logs for their business" ON public."business_activity_log";
CREATE POLICY "Owners can insert logs for their business" ON public."business_activity_log" FOR INSERT
  WITH CHECK ((EXISTS ( SELECT 1
   FROM businesses
  WHERE ((businesses.id = business_activity_log.business_id) AND (businesses.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Owners can read own business activity logs" ON public."business_activity_log";
CREATE POLICY "Owners can read own business activity logs" ON public."business_activity_log" FOR SELECT
  USING ((business_id IN ( SELECT businesses.id
   FROM businesses
  WHERE (businesses.user_id = (select auth.uid())))));

DROP POLICY IF EXISTS "Owners can view their own business logs" ON public."business_activity_log";
CREATE POLICY "Owners can view their own business logs" ON public."business_activity_log" FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM businesses
  WHERE ((businesses.id = business_activity_log.business_id) AND (businesses.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Business owners can view checkins" ON public."business_checkins";
CREATE POLICY "Business owners can view checkins" ON public."business_checkins" FOR SELECT
  USING ((business_id IN ( SELECT businesses.id
   FROM businesses
  WHERE (businesses.user_id = (select auth.uid())))));

DROP POLICY IF EXISTS "Users can create own check-ins" ON public."business_checkins";
CREATE POLICY "Users can create own check-ins" ON public."business_checkins" FOR INSERT
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can update own check-ins" ON public."business_checkins";
CREATE POLICY "Users can update own check-ins" ON public."business_checkins" FOR UPDATE
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view own check-ins" ON public."business_checkins";
CREATE POLICY "Users can view own check-ins" ON public."business_checkins" FOR SELECT
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Admins can update claims" ON public."business_claims";
CREATE POLICY "Admins can update claims" ON public."business_claims" FOR UPDATE
  USING ((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = (select auth.uid()))) = 'admin'::user_role));

DROP POLICY IF EXISTS "Admins can view all claims" ON public."business_claims";
CREATE POLICY "Admins can view all claims" ON public."business_claims" FOR SELECT
  USING ((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = (select auth.uid()))) = 'admin'::user_role));

DROP POLICY IF EXISTS "Authenticated users can create claims" ON public."business_claims";
CREATE POLICY "Authenticated users can create claims" ON public."business_claims" FOR INSERT
  WITH CHECK (((select auth.uid()) = claimer_id));

DROP POLICY IF EXISTS "Users can update own pending claims" ON public."business_claims";
CREATE POLICY "Users can update own pending claims" ON public."business_claims" FOR UPDATE
  USING ((((select auth.uid()) = claimer_id) AND ((status)::text = 'pending'::text)));

DROP POLICY IF EXISTS "Users can view own claims" ON public."business_claims";
CREATE POLICY "Users can view own claims" ON public."business_claims" FOR SELECT
  USING (((select auth.uid()) = claimer_id));

DROP POLICY IF EXISTS "Business owners can manage own coupons" ON public."business_coupons";
CREATE POLICY "Business owners can manage own coupons" ON public."business_coupons" FOR ALL
  USING ((EXISTS ( SELECT 1
   FROM businesses
  WHERE ((businesses.id = business_coupons.business_id) AND (businesses.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Business owners can manage own customer profiles" ON public."business_customer_profiles";
CREATE POLICY "Business owners can manage own customer profiles" ON public."business_customer_profiles" FOR ALL
  USING ((business_id IN ( SELECT businesses.id
   FROM businesses
  WHERE (businesses.owner_id = ( SELECT (select auth.uid()) AS uid)))));

DROP POLICY IF EXISTS "Business owners can view their followers" ON public."business_followers";
CREATE POLICY "Business owners can view their followers" ON public."business_followers" FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM businesses
  WHERE ((businesses.id = business_followers.business_id) AND (businesses.owner_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Users can delete own favorites" ON public."business_followers";
CREATE POLICY "Users can delete own favorites" ON public."business_followers" FOR DELETE
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can insert own favorites" ON public."business_followers";
CREATE POLICY "Users can insert own favorites" ON public."business_followers" FOR INSERT
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can update own favorites" ON public."business_followers";
CREATE POLICY "Users can update own favorites" ON public."business_followers" FOR UPDATE
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view own follows" ON public."business_followers";
CREATE POLICY "Users can view own follows" ON public."business_followers" FOR SELECT
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Business owners can manage own marketing goals" ON public."business_marketing_goals";
CREATE POLICY "Business owners can manage own marketing goals" ON public."business_marketing_goals" FOR ALL
  USING ((business_id IN ( SELECT businesses.id
   FROM businesses
  WHERE (businesses.owner_id = ( SELECT (select auth.uid()) AS uid)))));

DROP POLICY IF EXISTS "Business owners can read own metrics" ON public."business_metrics";
CREATE POLICY "Business owners can read own metrics" ON public."business_metrics" FOR SELECT
  USING ((business_id IN ( SELECT businesses.id
   FROM businesses
  WHERE (businesses.owner_id = ( SELECT (select auth.uid()) AS uid)))));

DROP POLICY IF EXISTS "Business owners can manage own onboarding progress" ON public."business_onboarding_progress";
CREATE POLICY "Business owners can manage own onboarding progress" ON public."business_onboarding_progress" FOR ALL
  USING ((business_id IN ( SELECT businesses.id
   FROM businesses
  WHERE (businesses.owner_id = ( SELECT (select auth.uid()) AS uid)))));

DROP POLICY IF EXISTS "Owners can manage own pending edits" ON public."business_pending_edits";
CREATE POLICY "Owners can manage own pending edits" ON public."business_pending_edits" FOR ALL
  USING ((EXISTS ( SELECT 1
   FROM businesses
  WHERE ((businesses.id = business_pending_edits.business_id) AND (businesses.user_id = (select auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM businesses
  WHERE ((businesses.id = business_pending_edits.business_id) AND (businesses.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Business owners can create responses" ON public."business_review_responses";
CREATE POLICY "Business owners can create responses" ON public."business_review_responses" FOR INSERT
  WITH CHECK ((EXISTS ( SELECT 1
   FROM businesses
  WHERE ((businesses.id = business_review_responses.business_id) AND (businesses.owner_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Business owners can delete own responses" ON public."business_review_responses";
CREATE POLICY "Business owners can delete own responses" ON public."business_review_responses" FOR DELETE
  USING ((EXISTS ( SELECT 1
   FROM businesses
  WHERE ((businesses.id = business_review_responses.business_id) AND (businesses.owner_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Business owners can update own responses" ON public."business_review_responses";
CREATE POLICY "Business owners can update own responses" ON public."business_review_responses" FOR UPDATE
  USING ((EXISTS ( SELECT 1
   FROM businesses
  WHERE ((businesses.id = business_review_responses.business_id) AND (businesses.owner_id = (select auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM businesses
  WHERE ((businesses.id = business_review_responses.business_id) AND (businesses.owner_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Admins can update reviews for moderation" ON public."business_reviews";
CREATE POLICY "Admins can update reviews for moderation" ON public."business_reviews" FOR UPDATE
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::user_role)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::user_role)))));

DROP POLICY IF EXISTS "Admins can view all reviews" ON public."business_reviews";
CREATE POLICY "Admins can view all reviews" ON public."business_reviews" FOR SELECT
  USING (((deleted_at IS NULL) OR ((select auth.uid()) = user_id) OR is_admin()));

DROP POLICY IF EXISTS "Business owners can feature reviews" ON public."business_reviews";
CREATE POLICY "Business owners can feature reviews" ON public."business_reviews" FOR UPDATE
  USING ((EXISTS ( SELECT 1
   FROM businesses
  WHERE ((businesses.id = business_reviews.business_id) AND (businesses.owner_id = (select auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM businesses
  WHERE ((businesses.id = business_reviews.business_id) AND (businesses.owner_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Users can create reviews with check-in (TESTING MODE)" ON public."business_reviews";
CREATE POLICY "Users can create reviews with check-in (TESTING MODE)" ON public."business_reviews" FOR INSERT
  WITH CHECK ((((select auth.uid()) = user_id) AND (((checkin_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM business_checkins
  WHERE ((business_checkins.id = business_reviews.checkin_id) AND (business_checkins.user_id = (select auth.uid())) AND (business_checkins.business_id = business_reviews.business_id))))) OR (checkin_id IS NULL))));

DROP POLICY IF EXISTS "Users can delete own reviews" ON public."business_reviews";
CREATE POLICY "Users can delete own reviews" ON public."business_reviews" FOR DELETE
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can update own reviews" ON public."business_reviews";
CREATE POLICY "Users can update own reviews" ON public."business_reviews" FOR UPDATE
  USING (((select auth.uid()) = user_id))
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view active reviews" ON public."business_reviews";
CREATE POLICY "Users can view active reviews" ON public."business_reviews" FOR SELECT
  USING (((deleted_at IS NULL) OR ((select auth.uid()) = user_id)));

DROP POLICY IF EXISTS "Users can view approved reviews" ON public."business_reviews";
CREATE POLICY "Users can view approved reviews" ON public."business_reviews" FOR SELECT
  USING ((((moderation_status = 'approved'::text) AND (deleted_at IS NULL)) OR (((select auth.uid()) = user_id) AND (deleted_at IS NULL)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::user_role))))));

DROP POLICY IF EXISTS "Business owners can view own history" ON public."business_status_history";
CREATE POLICY "Business owners can view own history" ON public."business_status_history" FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM businesses
  WHERE ((businesses.id = business_status_history.business_id) AND (businesses.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Admins can delete businesses" ON public."businesses";
CREATE POLICY "Admins can delete businesses" ON public."businesses" FOR DELETE
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::user_role)))));

DROP POLICY IF EXISTS "Users can manage own businesses" ON public."businesses";
CREATE POLICY "Users can manage own businesses" ON public."businesses" FOR ALL
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "businesses_view_own_campaign_analytics" ON public."campaign_analytics";
CREATE POLICY "businesses_view_own_campaign_analytics" ON public."campaign_analytics" FOR SELECT
  USING ((campaign_id IN ( SELECT campaigns.id
   FROM campaigns
  WHERE (campaigns.business_id IN ( SELECT businesses.id
           FROM businesses
          WHERE (businesses.owner_id = (select auth.uid())))))));

DROP POLICY IF EXISTS "Authenticated can read campaign metrics" ON public."campaign_metrics";
CREATE POLICY "Authenticated can read campaign metrics" ON public."campaign_metrics" FOR SELECT
  USING (((select auth.uid()) IS NOT NULL));

DROP POLICY IF EXISTS "businesses_view_campaign_targets" ON public."campaign_targets";
CREATE POLICY "businesses_view_campaign_targets" ON public."campaign_targets" FOR SELECT
  USING ((campaign_id IN ( SELECT campaigns.id
   FROM campaigns
  WHERE (campaigns.business_id IN ( SELECT businesses.id
           FROM businesses
          WHERE (businesses.owner_id = (select auth.uid())))))));

DROP POLICY IF EXISTS "users_view_own_campaign_targets" ON public."campaign_targets";
CREATE POLICY "users_view_own_campaign_targets" ON public."campaign_targets" FOR SELECT
  USING ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "businesses_create_campaigns" ON public."campaigns";
CREATE POLICY "businesses_create_campaigns" ON public."campaigns" FOR INSERT
  WITH CHECK ((business_id IN ( SELECT businesses.id
   FROM businesses
  WHERE (businesses.owner_id = (select auth.uid())))));

DROP POLICY IF EXISTS "businesses_delete_draft_campaigns" ON public."campaigns";
CREATE POLICY "businesses_delete_draft_campaigns" ON public."campaigns" FOR DELETE
  USING ((((status)::text = 'draft'::text) AND (business_id IN ( SELECT businesses.id
   FROM businesses
  WHERE (businesses.owner_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "businesses_update_own_campaigns" ON public."campaigns";
CREATE POLICY "businesses_update_own_campaigns" ON public."campaigns" FOR UPDATE
  USING ((business_id IN ( SELECT businesses.id
   FROM businesses
  WHERE (businesses.owner_id = (select auth.uid())))));

DROP POLICY IF EXISTS "businesses_view_own_campaigns" ON public."campaigns";
CREATE POLICY "businesses_view_own_campaigns" ON public."campaigns" FOR SELECT
  USING ((business_id IN ( SELECT businesses.id
   FROM businesses
  WHERE (businesses.owner_id = (select auth.uid())))));

DROP POLICY IF EXISTS "Business owners can read checkins at their business" ON public."checkins";
CREATE POLICY "Business owners can read checkins at their business" ON public."checkins" FOR SELECT
  USING ((business_id IN ( SELECT businesses.id
   FROM businesses
  WHERE (businesses.owner_id = ( SELECT (select auth.uid()) AS uid)))));

DROP POLICY IF EXISTS "Users can create own checkins" ON public."checkins";
CREATE POLICY "Users can create own checkins" ON public."checkins" FOR INSERT
  WITH CHECK ((user_id = ( SELECT (select auth.uid()) AS uid)));

DROP POLICY IF EXISTS "Users can read own checkins" ON public."checkins";
CREATE POLICY "Users can read own checkins" ON public."checkins" FOR SELECT
  USING ((user_id = ( SELECT (select auth.uid()) AS uid)));

DROP POLICY IF EXISTS "Admins can view all logs" ON public."cleanup_logs";
CREATE POLICY "Admins can view all logs" ON public."cleanup_logs" FOR SELECT
  USING ((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = (select auth.uid()))) = 'admin'::user_role));

DROP POLICY IF EXISTS "Users can delete their own hashes" ON public."contact_hashes";
CREATE POLICY "Users can delete their own hashes" ON public."contact_hashes" FOR DELETE
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can insert their own hashes" ON public."contact_hashes";
CREATE POLICY "Users can insert their own hashes" ON public."contact_hashes" FOR INSERT
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can select their own hashes" ON public."contact_hashes";
CREATE POLICY "Users can select their own hashes" ON public."contact_hashes" FOR SELECT
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can see own contact matches" ON public."contact_matches";
CREATE POLICY "Users can see own contact matches" ON public."contact_matches" FOR SELECT
  USING (((user_id = ( SELECT (select auth.uid()) AS uid)) OR (matched_user_id = ( SELECT (select auth.uid()) AS uid))));

COMMIT;
