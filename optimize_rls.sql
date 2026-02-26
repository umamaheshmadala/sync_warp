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

DROP POLICY IF EXISTS "Users can insert their own logs" ON public."contact_sync_logs";
CREATE POLICY "Users can insert their own logs" ON public."contact_sync_logs" FOR INSERT
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can create their own mutes" ON public."conversation_mutes";
CREATE POLICY "Users can create their own mutes" ON public."conversation_mutes" FOR INSERT
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can delete their own mutes" ON public."conversation_mutes";
CREATE POLICY "Users can delete their own mutes" ON public."conversation_mutes" FOR DELETE
  USING ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can update their own mutes" ON public."conversation_mutes";
CREATE POLICY "Users can update their own mutes" ON public."conversation_mutes" FOR UPDATE
  USING ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can view their own mutes" ON public."conversation_mutes";
CREATE POLICY "Users can view their own mutes" ON public."conversation_mutes" FOR SELECT
  USING ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Participants can view conversation participants" ON public."conversation_participants";
CREATE POLICY "Participants can view conversation participants" ON public."conversation_participants" FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.id = conversation_participants.conversation_id) AND ((select auth.uid()) = ANY (c.participants))))));

DROP POLICY IF EXISTS "Users can join conversations they are part of" ON public."conversation_participants";
CREATE POLICY "Users can join conversations they are part of" ON public."conversation_participants" FOR INSERT
  WITH CHECK (((user_id = (select auth.uid())) AND (EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.id = conversation_participants.conversation_id) AND ((select auth.uid()) = ANY (c.participants)))))));

DROP POLICY IF EXISTS "Users can leave conversations" ON public."conversation_participants";
CREATE POLICY "Users can leave conversations" ON public."conversation_participants" FOR DELETE
  USING ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can manage their own participation settings" ON public."conversation_participants";
CREATE POLICY "Users can manage their own participation settings" ON public."conversation_participants" FOR UPDATE
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Only friends can create direct conversations" ON public."conversations";
CREATE POLICY "Only friends can create direct conversations" ON public."conversations" FOR INSERT
  WITH CHECK ((((select auth.uid()) = ANY (participants)) AND ((type = 'group'::text) OR ((type = 'direct'::text) AND (NOT (EXISTS ( SELECT 1
   FROM blocked_users
  WHERE (((blocked_users.blocker_id = (select auth.uid())) AND (blocked_users.blocked_id = ANY (conversations.participants))) OR ((blocked_users.blocker_id = ANY (conversations.participants)) AND (blocked_users.blocked_id = (select auth.uid()))))))) AND (EXISTS ( SELECT 1
   FROM friendships
  WHERE ((friendships.user_id = (select auth.uid())) AND (friendships.friend_id = ANY (conversations.participants)) AND (friendships.status = 'active'::text))))))));

DROP POLICY IF EXISTS "Users can delete conversations they're part of" ON public."conversations";
CREATE POLICY "Users can delete conversations they're part of" ON public."conversations" FOR DELETE
  USING (((select auth.uid()) = ANY (participants)));

DROP POLICY IF EXISTS "Users can update conversations they're part of" ON public."conversations";
CREATE POLICY "Users can update conversations they're part of" ON public."conversations" FOR UPDATE
  USING (((select auth.uid()) = ANY (participants)))
  WITH CHECK (((select auth.uid()) = ANY (participants)));

DROP POLICY IF EXISTS "Users can view their conversations" ON public."conversations";
CREATE POLICY "Users can view their conversations" ON public."conversations" FOR SELECT
  USING (((select auth.uid()) = ANY (participants)));

DROP POLICY IF EXISTS "Business owners can view analytics" ON public."coupon_analytics";
CREATE POLICY "Business owners can view analytics" ON public."coupon_analytics" FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM businesses
  WHERE ((businesses.id = coupon_analytics.business_id) AND (businesses.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Business owners can manage own coupon batches" ON public."coupon_batches";
CREATE POLICY "Business owners can manage own coupon batches" ON public."coupon_batches" FOR ALL
  USING ((business_id IN ( SELECT businesses.id
   FROM businesses
  WHERE (businesses.owner_id = ( SELECT (select auth.uid()) AS uid)))));

DROP POLICY IF EXISTS "Users can manage their own coupon drafts" ON public."coupon_drafts";
CREATE POLICY "Users can manage their own coupon drafts" ON public."coupon_drafts" FOR ALL
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can read their own lifecycle events" ON public."coupon_lifecycle_events";
CREATE POLICY "Users can read their own lifecycle events" ON public."coupon_lifecycle_events" FOR SELECT
  USING ((((select auth.uid()) = user_id) OR ((select auth.uid()) = related_user_id)));

DROP POLICY IF EXISTS "Business owners can view redemptions" ON public."coupon_redemptions";
CREATE POLICY "Business owners can view redemptions" ON public."coupon_redemptions" FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM businesses
  WHERE ((businesses.id = coupon_redemptions.business_id) AND (businesses.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Users can create coupon shares" ON public."coupon_shares";
CREATE POLICY "Users can create coupon shares" ON public."coupon_shares" FOR INSERT
  WITH CHECK ((sender_id = ( SELECT (select auth.uid()) AS uid)));

DROP POLICY IF EXISTS "Users can read own coupon shares" ON public."coupon_shares";
CREATE POLICY "Users can read own coupon shares" ON public."coupon_shares" FOR SELECT
  USING (((sender_id = ( SELECT (select auth.uid()) AS uid)) OR (receiver_id = ( SELECT (select auth.uid()) AS uid))));

DROP POLICY IF EXISTS "Users can log shares as sender" ON public."coupon_sharing_log";
CREATE POLICY "Users can log shares as sender" ON public."coupon_sharing_log" FOR INSERT
  WITH CHECK (((select auth.uid()) = sender_id));

DROP POLICY IF EXISTS "Users can read their own sharing logs" ON public."coupon_sharing_log";
CREATE POLICY "Users can read their own sharing logs" ON public."coupon_sharing_log" FOR SELECT
  USING ((((select auth.uid()) = sender_id) OR ((select auth.uid()) = recipient_id)));

DROP POLICY IF EXISTS "Users can view their collected coupons" ON public."coupons";
CREATE POLICY "Users can view their collected coupons" ON public."coupons" FOR SELECT
  USING (((collected_by = (select auth.uid())) OR ((select auth.uid()) IN ( SELECT businesses.owner_id
   FROM businesses
  WHERE (businesses.id = coupons.business_id)))));

DROP POLICY IF EXISTS "Admins can manage retention policies" ON public."data_retention_policies";
CREATE POLICY "Admins can manage retention policies" ON public."data_retention_policies" FOR ALL
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::user_role)))));

DROP POLICY IF EXISTS "Authenticated users can create comments" ON public."deal_comments";
CREATE POLICY "Authenticated users can create comments" ON public."deal_comments" FOR INSERT
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can delete their own comments" ON public."deal_comments";
CREATE POLICY "Users can delete their own comments" ON public."deal_comments" FOR DELETE
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can update their own comments" ON public."deal_comments";
CREATE POLICY "Users can update their own comments" ON public."deal_comments" FOR UPDATE
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can create shares" ON public."deal_shares";
CREATE POLICY "Users can create shares" ON public."deal_shares" FOR INSERT
  WITH CHECK (((select auth.uid()) = sender_id));

DROP POLICY IF EXISTS "Users can delete their own shares" ON public."deal_shares";
CREATE POLICY "Users can delete their own shares" ON public."deal_shares" FOR DELETE
  USING (((select auth.uid()) = sender_id));

DROP POLICY IF EXISTS "Users can view shares they sent or received" ON public."deal_shares";
CREATE POLICY "Users can view shares they sent or received" ON public."deal_shares" FOR SELECT
  USING ((((select auth.uid()) = sender_id) OR ((select auth.uid()) = recipient_id)));

DROP POLICY IF EXISTS "Users can dismiss suggestions" ON public."dismissed_pymk_suggestions";
CREATE POLICY "Users can dismiss suggestions" ON public."dismissed_pymk_suggestions" FOR INSERT
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view own dismissed suggestions" ON public."dismissed_pymk_suggestions";
CREATE POLICY "Users can view own dismissed suggestions" ON public."dismissed_pymk_suggestions" FOR SELECT
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Authenticated can read driver config" ON public."driver_config";
CREATE POLICY "Authenticated can read driver config" ON public."driver_config" FOR SELECT
  USING (((select auth.uid()) IS NOT NULL));

DROP POLICY IF EXISTS "businesses_view_city_driver_profiles" ON public."driver_profiles";
CREATE POLICY "businesses_view_city_driver_profiles" ON public."driver_profiles" FOR SELECT
  USING ((city_id IN ( SELECT driver_profiles.city_id
   FROM businesses
  WHERE (businesses.owner_id = (select auth.uid())))));

DROP POLICY IF EXISTS "users_view_own_driver_profile" ON public."driver_profiles";
CREATE POLICY "users_view_own_driver_profile" ON public."driver_profiles" FOR SELECT
  USING ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can add favorites" ON public."favorite_products";
CREATE POLICY "Users can add favorites" ON public."favorite_products" FOR INSERT
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can remove favorites" ON public."favorite_products";
CREATE POLICY "Users can remove favorites" ON public."favorite_products" FOR DELETE
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view their own favorites" ON public."favorite_products";
CREATE POLICY "Users can view their own favorites" ON public."favorite_products" FOR SELECT
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can delete their own favorites" ON public."favorites";
CREATE POLICY "Users can delete their own favorites" ON public."favorites" FOR DELETE
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can insert their own favorites" ON public."favorites";
CREATE POLICY "Users can insert their own favorites" ON public."favorites" FOR INSERT
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can update their own favorites" ON public."favorites";
CREATE POLICY "Users can update their own favorites" ON public."favorites" FOR UPDATE
  USING (((select auth.uid()) = user_id))
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view their own favorites" ON public."favorites";
CREATE POLICY "Users can view their own favorites" ON public."favorites" FOR SELECT
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can mark notifications as read" ON public."follower_notifications";
CREATE POLICY "Users can mark notifications as read" ON public."follower_notifications" FOR UPDATE
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view own notifications" ON public."follower_notifications";
CREATE POLICY "Users can view own notifications" ON public."follower_notifications" FOR SELECT
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Admins can update reports" ON public."follower_reports";
CREATE POLICY "Admins can update reports" ON public."follower_reports" FOR UPDATE
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::user_role)))));

DROP POLICY IF EXISTS "Admins can view all reports" ON public."follower_reports";
CREATE POLICY "Admins can view all reports" ON public."follower_reports" FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::user_role)))));

DROP POLICY IF EXISTS "Business owners can create reports" ON public."follower_reports";
CREATE POLICY "Business owners can create reports" ON public."follower_reports" FOR INSERT
  WITH CHECK ((business_id IN ( SELECT businesses.id
   FROM businesses
  WHERE (businesses.owner_id = (select auth.uid())))));

DROP POLICY IF EXISTS "Business owners can view their own reports" ON public."follower_reports";
CREATE POLICY "Business owners can view their own reports" ON public."follower_reports" FOR SELECT
  USING (((reporter_id = (select auth.uid())) OR (business_id IN ( SELECT businesses.id
   FROM businesses
  WHERE (businesses.owner_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Users can follow others" ON public."following";
CREATE POLICY "Users can follow others" ON public."following" FOR INSERT
  WITH CHECK ((((select auth.uid()) = follower_id) AND (follower_id <> following_id)));

DROP POLICY IF EXISTS "Users can unfollow" ON public."following";
CREATE POLICY "Users can unfollow" ON public."following" FOR DELETE
  USING (((select auth.uid()) = follower_id));

DROP POLICY IF EXISTS "Users see friends' activities" ON public."friend_activities";
CREATE POLICY "Users see friends' activities" ON public."friend_activities" FOR SELECT
  USING (((user_id IN ( SELECT friendships.friend_id
   FROM friendships
  WHERE ((friendships.user_id = (select auth.uid())) AND (friendships.status = 'active'::text)))) OR (user_id = (select auth.uid()))));

DROP POLICY IF EXISTS "Users can create friend requests" ON public."friend_connections";
CREATE POLICY "Users can create friend requests" ON public."friend_connections" FOR INSERT
  WITH CHECK (((select auth.uid()) = requester_id));

DROP POLICY IF EXISTS "Users can update their connections" ON public."friend_connections";
CREATE POLICY "Users can update their connections" ON public."friend_connections" FOR UPDATE
  USING ((((select auth.uid()) = user_a_id) OR ((select auth.uid()) = user_b_id)));

DROP POLICY IF EXISTS "Users can view their connections" ON public."friend_connections";
CREATE POLICY "Users can view their connections" ON public."friend_connections" FOR SELECT
  USING ((((select auth.uid()) = user_a_id) OR ((select auth.uid()) = user_b_id)));

DROP POLICY IF EXISTS "Users can delete their own friend requests" ON public."friend_requests";
CREATE POLICY "Users can delete their own friend requests" ON public."friend_requests" FOR DELETE
  USING (((select auth.uid()) = sender_id));

DROP POLICY IF EXISTS "Users can send friend requests with block check" ON public."friend_requests";
CREATE POLICY "Users can send friend requests with block check" ON public."friend_requests" FOR INSERT
  WITH CHECK ((((select auth.uid()) = sender_id) AND (sender_id <> receiver_id) AND (NOT (EXISTS ( SELECT 1
   FROM blocked_users
  WHERE (((blocked_users.blocker_id = friend_requests.sender_id) AND (blocked_users.blocked_id = friend_requests.receiver_id)) OR ((blocked_users.blocker_id = friend_requests.receiver_id) AND (blocked_users.blocked_id = friend_requests.sender_id))))))));

DROP POLICY IF EXISTS "Users can update friend requests they received" ON public."friend_requests";
CREATE POLICY "Users can update friend requests they received" ON public."friend_requests" FOR UPDATE
  USING (((select auth.uid()) = receiver_id))
  WITH CHECK (((select auth.uid()) = receiver_id));

DROP POLICY IF EXISTS "Users can view friend requests with block check" ON public."friend_requests";
CREATE POLICY "Users can view friend requests with block check" ON public."friend_requests" FOR SELECT
  USING (((((select auth.uid()) = sender_id) OR ((select auth.uid()) = receiver_id)) AND (NOT (EXISTS ( SELECT 1
   FROM blocked_users
  WHERE (((blocked_users.blocker_id = (select auth.uid())) AND (blocked_users.blocked_id = ANY (ARRAY[friend_requests.sender_id, friend_requests.receiver_id]))) OR ((blocked_users.blocker_id = ANY (ARRAY[friend_requests.sender_id, friend_requests.receiver_id])) AND (blocked_users.blocked_id = (select auth.uid())))))))));

DROP POLICY IF EXISTS "friend_requests_insert_own" ON public."friend_requests";
CREATE POLICY "friend_requests_insert_own" ON public."friend_requests" FOR INSERT
  WITH CHECK (((select auth.uid()) = sender_id));

DROP POLICY IF EXISTS "friend_requests_select_own" ON public."friend_requests";
CREATE POLICY "friend_requests_select_own" ON public."friend_requests" FOR SELECT
  USING ((((select auth.uid()) = sender_id) OR ((select auth.uid()) = receiver_id)));

DROP POLICY IF EXISTS "Users create friendships" ON public."friendships";
CREATE POLICY "Users create friendships" ON public."friendships" FOR INSERT
  WITH CHECK ((((select auth.uid()) = user_id) AND (user_id <> friend_id)));

DROP POLICY IF EXISTS "Users delete their friendships" ON public."friendships";
CREATE POLICY "Users delete their friendships" ON public."friendships" FOR DELETE
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users update their friendships" ON public."friendships";
CREATE POLICY "Users update their friendships" ON public."friendships" FOR UPDATE
  USING (((select auth.uid()) = user_id))
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users view their friendships" ON public."friendships";
CREATE POLICY "Users view their friendships" ON public."friendships" FOR SELECT
  USING ((((select auth.uid()) = user_id) OR ((select auth.uid()) = friend_id)));

DROP POLICY IF EXISTS "Business owners can manage products" ON public."legacy_business_products";
CREATE POLICY "Business owners can manage products" ON public."legacy_business_products" FOR ALL
  USING ((EXISTS ( SELECT 1
   FROM businesses
  WHERE ((businesses.id = legacy_business_products.business_id) AND (businesses.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Users can delete their own media" ON public."media";
CREATE POLICY "Users can delete their own media" ON public."media" FOR DELETE
  USING (((select auth.uid()) = uploaded_by));

DROP POLICY IF EXISTS "Users can update their own media" ON public."media";
CREATE POLICY "Users can update their own media" ON public."media" FOR UPDATE
  USING (((select auth.uid()) = uploaded_by));

DROP POLICY IF EXISTS "Users can upload media for their own entities" ON public."media";
CREATE POLICY "Users can upload media for their own entities" ON public."media" FOR INSERT
  WITH CHECK (((select auth.uid()) = uploaded_by));

DROP POLICY IF EXISTS "Authenticated can read media limits" ON public."media_limits_config";
CREATE POLICY "Authenticated can read media limits" ON public."media_limits_config" FOR SELECT
  USING (((select auth.uid()) IS NOT NULL));

DROP POLICY IF EXISTS "Users can log edits for their own messages" ON public."message_edits";
CREATE POLICY "Users can log edits for their own messages" ON public."message_edits" FOR INSERT
  WITH CHECK (((edited_by = (select auth.uid())) AND (EXISTS ( SELECT 1
   FROM messages m
  WHERE ((m.id = message_edits.message_id) AND (m.sender_id = (select auth.uid())))))));

DROP POLICY IF EXISTS "Users can view their own message edits" ON public."message_edits";
CREATE POLICY "Users can view their own message edits" ON public."message_edits" FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM messages m
  WHERE ((m.id = message_edits.message_id) AND (m.sender_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Users can create forwards" ON public."message_forwards";
CREATE POLICY "Users can create forwards" ON public."message_forwards" FOR INSERT
  WITH CHECK ((forwarded_by = (select auth.uid())));

DROP POLICY IF EXISTS "Users can view forwards they created" ON public."message_forwards";
CREATE POLICY "Users can view forwards they created" ON public."message_forwards" FOR SELECT
  USING ((forwarded_by = (select auth.uid())));

DROP POLICY IF EXISTS "Users can hide messages in their conversations" ON public."message_hides";
CREATE POLICY "Users can hide messages in their conversations" ON public."message_hides" FOR INSERT
  WITH CHECK ((((select auth.uid()) = user_id) AND (EXISTS ( SELECT 1
   FROM (messages m
     JOIN conversation_participants cp ON ((m.conversation_id = cp.conversation_id)))
  WHERE ((m.id = message_hides.message_id) AND (cp.user_id = (select auth.uid())))))));

DROP POLICY IF EXISTS "Users can unhide own messages" ON public."message_hides";
CREATE POLICY "Users can unhide own messages" ON public."message_hides" FOR DELETE
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view own hidden messages" ON public."message_hides";
CREATE POLICY "Users can view own hidden messages" ON public."message_hides" FOR SELECT
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Senders can view read receipts" ON public."message_read_receipts";
CREATE POLICY "Senders can view read receipts" ON public."message_read_receipts" FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM messages m
  WHERE ((m.id = message_read_receipts.message_id) AND (m.sender_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Users can create their own read receipts" ON public."message_read_receipts";
CREATE POLICY "Users can create their own read receipts" ON public."message_read_receipts" FOR INSERT
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can update their own read receipts" ON public."message_read_receipts";
CREATE POLICY "Users can update their own read receipts" ON public."message_read_receipts" FOR UPDATE
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can insert their own reports" ON public."message_reports";
CREATE POLICY "Users can insert their own reports" ON public."message_reports" FOR INSERT
  WITH CHECK (((select auth.uid()) = reporter_id));

DROP POLICY IF EXISTS "Users can view their own reports" ON public."message_reports";
CREATE POLICY "Users can view their own reports" ON public."message_reports" FOR SELECT
  USING (((select auth.uid()) = reporter_id));

DROP POLICY IF EXISTS "Admins can view all messages" ON public."messages";
CREATE POLICY "Admins can view all messages" ON public."messages" FOR SELECT
  USING ((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = (select auth.uid()))) = 'admin'::user_role));

DROP POLICY IF EXISTS "Users can delete their own messages" ON public."messages";
CREATE POLICY "Users can delete their own messages" ON public."messages" FOR UPDATE
  USING ((sender_id = (select auth.uid())))
  WITH CHECK ((sender_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can edit their own recent messages" ON public."messages";
CREATE POLICY "Users can edit their own recent messages" ON public."messages" FOR UPDATE
  USING (((sender_id = (select auth.uid())) AND (is_deleted = false) AND (created_at > (now() - '00:15:00'::interval))))
  WITH CHECK (((sender_id = (select auth.uid())) AND (is_deleted = false)));

DROP POLICY IF EXISTS "Users can send messages" ON public."messages";
CREATE POLICY "Users can send messages" ON public."messages" FOR INSERT
  WITH CHECK (((sender_id = (select auth.uid())) AND (EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.id = messages.conversation_id) AND ((select auth.uid()) = ANY (c.participants))))) AND (NOT (EXISTS ( SELECT 1
   FROM (blocked_users b
     JOIN conversations c ON ((c.id = messages.conversation_id)))
  WHERE ((b.blocker_id = ANY (c.participants)) AND (b.blocker_id <> (select auth.uid())) AND (b.blocked_id = (select auth.uid()))))))));

DROP POLICY IF EXISTS "Users can view conversation messages" ON public."messages";
CREATE POLICY "Users can view conversation messages" ON public."messages" FOR SELECT
  USING (((EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.id = messages.conversation_id) AND ((select auth.uid()) = ANY (c.participants))))) AND (NOT (EXISTS ( SELECT 1
   FROM blocked_users b
  WHERE ((b.blocker_id = (select auth.uid())) AND (b.blocked_id = messages.sender_id)))))));

DROP POLICY IF EXISTS "prevent_messaging_blocked_users_bidirectional" ON public."messages";
CREATE POLICY "prevent_messaging_blocked_users_bidirectional" ON public."messages" FOR INSERT
  WITH CHECK ((NOT (EXISTS ( SELECT 1
   FROM blocked_users bu
  WHERE (((bu.blocker_id = (select auth.uid())) AND (bu.blocked_id = get_conversation_recipient(messages.conversation_id, (select auth.uid())))) OR ((bu.blocked_id = (select auth.uid())) AND (bu.blocker_id = get_conversation_recipient(messages.conversation_id, (select auth.uid())))))))));

DROP POLICY IF EXISTS "Users can manage own muted conversations" ON public."muted_conversations";
CREATE POLICY "Users can manage own muted conversations" ON public."muted_conversations" FOR ALL
  USING (((select auth.uid()) = user_id))
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can mute conversations" ON public."muted_conversations";
CREATE POLICY "Users can mute conversations" ON public."muted_conversations" FOR INSERT
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can unmute conversations" ON public."muted_conversations";
CREATE POLICY "Users can unmute conversations" ON public."muted_conversations" FOR DELETE
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can update their mutes" ON public."muted_conversations";
CREATE POLICY "Users can update their mutes" ON public."muted_conversations" FOR UPDATE
  USING (((select auth.uid()) = user_id))
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view their own muted conversations" ON public."muted_conversations";
CREATE POLICY "Users can view their own muted conversations" ON public."muted_conversations" FOR SELECT
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can update their own notification logs" ON public."notification_log";
CREATE POLICY "Users can update their own notification logs" ON public."notification_log" FOR UPDATE
  USING (((select auth.uid()) = user_id))
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view their own notification logs" ON public."notification_log";
CREATE POLICY "Users can view their own notification logs" ON public."notification_log" FOR SELECT
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can insert their own settings" ON public."notification_settings";
CREATE POLICY "Users can insert their own settings" ON public."notification_settings" FOR INSERT
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can manage own notification settings" ON public."notification_settings";
CREATE POLICY "Users can manage own notification settings" ON public."notification_settings" FOR ALL
  USING (((select auth.uid()) = user_id))
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can update their own settings" ON public."notification_settings";
CREATE POLICY "Users can update their own settings" ON public."notification_settings" FOR UPDATE
  USING (((select auth.uid()) = user_id))
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view their own settings" ON public."notification_settings";
CREATE POLICY "Users can view their own settings" ON public."notification_settings" FOR SELECT
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can send notifications to others" ON public."notifications";
CREATE POLICY "Users can send notifications to others" ON public."notifications" FOR INSERT
  WITH CHECK ((((select auth.uid()) IS NOT NULL) AND ((select auth.uid()) = sender_id)));

DROP POLICY IF EXISTS "Users can update their own notifications" ON public."notifications";
CREATE POLICY "Users can update their own notifications" ON public."notifications" FOR UPDATE
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view their own notifications" ON public."notifications";
CREATE POLICY "Users can view their own notifications" ON public."notifications" FOR SELECT
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Business owners can view own analytics" ON public."offer_analytics";
CREATE POLICY "Business owners can view own analytics" ON public."offer_analytics" FOR SELECT
  USING ((business_id IN ( SELECT businesses.id
   FROM businesses
  WHERE ((businesses.owner_id = (select auth.uid())) OR (businesses.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Business owners can insert audit logs" ON public."offer_audit_log";
CREATE POLICY "Business owners can insert audit logs" ON public."offer_audit_log" FOR INSERT
  WITH CHECK ((business_id IN ( SELECT businesses.id
   FROM businesses
  WHERE ((businesses.owner_id = (select auth.uid())) OR (businesses.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Business owners can view audit logs" ON public."offer_audit_log";
CREATE POLICY "Business owners can view audit logs" ON public."offer_audit_log" FOR SELECT
  USING ((business_id IN ( SELECT businesses.id
   FROM businesses
  WHERE ((businesses.owner_id = (select auth.uid())) OR (businesses.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Users can manage own drafts" ON public."offer_drafts";
CREATE POLICY "Users can manage own drafts" ON public."offer_drafts" FOR ALL
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Business owners can view own offer events" ON public."offer_lifecycle_events";
CREATE POLICY "Business owners can view own offer events" ON public."offer_lifecycle_events" FOR SELECT
  USING ((business_id IN ( SELECT businesses.id
   FROM businesses
  WHERE ((businesses.owner_id = (select auth.uid())) OR (businesses.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Business owners can view all shares of their offers" ON public."offer_shares";
CREATE POLICY "Business owners can view all shares of their offers" ON public."offer_shares" FOR SELECT
  USING ((business_id IN ( SELECT businesses.id
   FROM businesses
  WHERE ((businesses.owner_id = (select auth.uid())) OR (businesses.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Users can view shares they created" ON public."offer_shares";
CREATE POLICY "Users can view shares they created" ON public."offer_shares" FOR SELECT
  USING (((sharer_id = (select auth.uid())) OR (shared_to_user_id = (select auth.uid()))));

DROP POLICY IF EXISTS "Business owners can view their offer views" ON public."offer_views";
CREATE POLICY "Business owners can view their offer views" ON public."offer_views" FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM offers
  WHERE ((offers.id = offer_views.offer_id) AND (offers.business_id IN ( SELECT businesses.id
           FROM businesses
          WHERE ((businesses.owner_id = (select auth.uid())) OR (businesses.user_id = (select auth.uid())))))))));

DROP POLICY IF EXISTS "Business owners can delete own offers" ON public."offers";
CREATE POLICY "Business owners can delete own offers" ON public."offers" FOR DELETE
  USING (((EXISTS ( SELECT 1
   FROM businesses
  WHERE ((businesses.id = offers.business_id) AND ((businesses.owner_id = (select auth.uid())) OR (businesses.user_id = (select auth.uid())))))) AND (deleted_at IS NULL)));

DROP POLICY IF EXISTS "Business owners can insert own offers" ON public."offers";
CREATE POLICY "Business owners can insert own offers" ON public."offers" FOR INSERT
  WITH CHECK (((EXISTS ( SELECT 1
   FROM businesses
  WHERE ((businesses.id = offers.business_id) AND ((businesses.owner_id = (select auth.uid())) OR (businesses.user_id = (select auth.uid())))))) AND (deleted_at IS NULL)));

DROP POLICY IF EXISTS "Business owners can update own offers" ON public."offers";
CREATE POLICY "Business owners can update own offers" ON public."offers" FOR UPDATE
  USING (((EXISTS ( SELECT 1
   FROM businesses
  WHERE ((businesses.id = offers.business_id) AND ((businesses.owner_id = (select auth.uid())) OR (businesses.user_id = (select auth.uid())))))) AND (deleted_at IS NULL)))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM businesses
  WHERE ((businesses.id = offers.business_id) AND ((businesses.owner_id = (select auth.uid())) OR (businesses.user_id = (select auth.uid())))))));

DROP POLICY IF EXISTS "Business owners can view own offers" ON public."offers";
CREATE POLICY "Business owners can view own offers" ON public."offers" FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM businesses
  WHERE ((businesses.id = offers.business_id) AND ((businesses.owner_id = (select auth.uid())) OR (businesses.user_id = (select auth.uid())))))));

DROP POLICY IF EXISTS "Users can pin messages in their conversations" ON public."pinned_messages";
CREATE POLICY "Users can pin messages in their conversations" ON public."pinned_messages" FOR INSERT
  WITH CHECK (((pinned_by = (select auth.uid())) AND (EXISTS ( SELECT 1
   FROM conversation_participants
  WHERE ((conversation_participants.conversation_id = pinned_messages.conversation_id) AND (conversation_participants.user_id = (select auth.uid())))))));

DROP POLICY IF EXISTS "Users can unpin messages in their conversations" ON public."pinned_messages";
CREATE POLICY "Users can unpin messages in their conversations" ON public."pinned_messages" FOR DELETE
  USING ((EXISTS ( SELECT 1
   FROM conversation_participants
  WHERE ((conversation_participants.conversation_id = pinned_messages.conversation_id) AND (conversation_participants.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Users can view pinned messages in their conversations" ON public."pinned_messages";
CREATE POLICY "Users can view pinned messages in their conversations" ON public."pinned_messages" FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM conversation_participants
  WHERE ((conversation_participants.conversation_id = pinned_messages.conversation_id) AND (conversation_participants.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "create_pinned_messages" ON public."pinned_messages";
CREATE POLICY "create_pinned_messages" ON public."pinned_messages" FOR INSERT
  WITH CHECK (((conversation_id IN ( SELECT conversation_participants.conversation_id
   FROM conversation_participants
  WHERE (conversation_participants.user_id = (select auth.uid())))) AND (pinned_by = (select auth.uid()))));

DROP POLICY IF EXISTS "delete_pinned_messages" ON public."pinned_messages";
CREATE POLICY "delete_pinned_messages" ON public."pinned_messages" FOR DELETE
  USING (((pinned_by = (select auth.uid())) OR (conversation_id IN ( SELECT conversation_participants.conversation_id
   FROM conversation_participants
  WHERE ((conversation_participants.user_id = (select auth.uid())) AND (conversation_participants.is_admin = true))))));

DROP POLICY IF EXISTS "view_pinned_messages" ON public."pinned_messages";
CREATE POLICY "view_pinned_messages" ON public."pinned_messages" FOR SELECT
  USING ((conversation_id IN ( SELECT conversation_participants.conversation_id
   FROM conversation_participants
  WHERE (conversation_participants.user_id = (select auth.uid())))));

DROP POLICY IF EXISTS "Authenticated users can read pricing config" ON public."pricing_config";
CREATE POLICY "Authenticated users can read pricing config" ON public."pricing_config" FOR SELECT
  USING (((select auth.uid()) IS NOT NULL));

DROP POLICY IF EXISTS "Authenticated users can read pricing overrides" ON public."pricing_overrides";
CREATE POLICY "Authenticated users can read pricing overrides" ON public."pricing_overrides" FOR SELECT
  USING (((select auth.uid()) IS NOT NULL));

DROP POLICY IF EXISTS "Users can view their own privacy audit log" ON public."privacy_audit_log";
CREATE POLICY "Users can view their own privacy audit log" ON public."privacy_audit_log" FOR SELECT
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Authenticated users can comment" ON public."product_comments";
CREATE POLICY "Authenticated users can comment" ON public."product_comments" FOR INSERT
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Delete comments" ON public."product_comments";
CREATE POLICY "Delete comments" ON public."product_comments" FOR DELETE
  USING ((((select auth.uid()) = user_id) OR ((select auth.uid()) IN ( SELECT businesses.user_id
   FROM businesses
  WHERE (businesses.id = ( SELECT products.business_id
           FROM products
          WHERE (products.id = product_comments.product_id)))))));

DROP POLICY IF EXISTS "Delete own or business owner can delete" ON public."product_comments";
CREATE POLICY "Delete own or business owner can delete" ON public."product_comments" FOR DELETE
  USING ((((select auth.uid()) = user_id) OR (EXISTS ( SELECT 1
   FROM (products p
     JOIN businesses b ON ((p.business_id = b.id)))
  WHERE ((p.id = product_comments.product_id) AND (b.owner_id = (select auth.uid())))))));

DROP POLICY IF EXISTS "Insert own comments" ON public."product_comments";
CREATE POLICY "Insert own comments" ON public."product_comments" FOR INSERT
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Update own comments" ON public."product_comments";
CREATE POLICY "Update own comments" ON public."product_comments" FOR UPDATE
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Authenticated users can like" ON public."product_likes";
CREATE POLICY "Authenticated users can like" ON public."product_likes" FOR INSERT
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can like products" ON public."product_likes";
CREATE POLICY "Users can like products" ON public."product_likes" FOR INSERT
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can unlike their own" ON public."product_likes";
CREATE POLICY "Users can unlike their own" ON public."product_likes" FOR DELETE
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Business owners can manage their products" ON public."products";
CREATE POLICY "Business owners can manage their products" ON public."products" FOR ALL
  USING ((business_id IN ( SELECT businesses.id
   FROM businesses
  WHERE (businesses.owner_id = (select auth.uid())))))
  WITH CHECK ((business_id IN ( SELECT businesses.id
   FROM businesses
  WHERE (businesses.owner_id = (select auth.uid())))));

DROP POLICY IF EXISTS "Profiles are viewable based on privacy" ON public."profiles";
CREATE POLICY "Profiles are viewable based on privacy" ON public."profiles" FOR SELECT
  USING (can_view_profile((select auth.uid()), id));

DROP POLICY IF EXISTS "Users can insert own profile" ON public."profiles";
CREATE POLICY "Users can insert own profile" ON public."profiles" FOR INSERT
  WITH CHECK (((select auth.uid()) = id));

DROP POLICY IF EXISTS "Users can update own profile" ON public."profiles";
CREATE POLICY "Users can update own profile" ON public."profiles" FOR UPDATE
  USING (((select auth.uid()) = id));

DROP POLICY IF EXISTS "Users can delete their own push tokens" ON public."push_tokens";
CREATE POLICY "Users can delete their own push tokens" ON public."push_tokens" FOR DELETE
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can insert their own push tokens" ON public."push_tokens";
CREATE POLICY "Users can insert their own push tokens" ON public."push_tokens" FOR INSERT
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can update their own push tokens" ON public."push_tokens";
CREATE POLICY "Users can update their own push tokens" ON public."push_tokens" FOR UPDATE
  USING (((select auth.uid()) = user_id))
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view their own push tokens" ON public."push_tokens";
CREATE POLICY "Users can view their own push tokens" ON public."push_tokens" FOR SELECT
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "violations_select_own" ON public."rate_limit_violations";
CREATE POLICY "violations_select_own" ON public."rate_limit_violations" FOR SELECT
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Admins can manage all override requests" ON public."retention_override_requests";
CREATE POLICY "Admins can manage all override requests" ON public."retention_override_requests" FOR ALL
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::user_role)))));

DROP POLICY IF EXISTS "Users can manage their override requests" ON public."retention_override_requests";
CREATE POLICY "Users can manage their override requests" ON public."retention_override_requests" FOR ALL
  USING (((select auth.uid()) = requested_by));

DROP POLICY IF EXISTS "Business owners can view their warnings" ON public."retention_warnings";
CREATE POLICY "Business owners can view their warnings" ON public."retention_warnings" FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = retention_warnings.entity_id) AND (b.owner_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Authenticated users can vote" ON public."review_helpful_votes";
CREATE POLICY "Authenticated users can vote" ON public."review_helpful_votes" FOR INSERT
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can remove own votes" ON public."review_helpful_votes";
CREATE POLICY "Users can remove own votes" ON public."review_helpful_votes" FOR DELETE
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Admins can insert moderation log" ON public."review_moderation_log";
CREATE POLICY "Admins can insert moderation log" ON public."review_moderation_log" FOR INSERT
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::user_role)))));

DROP POLICY IF EXISTS "Admins can view moderation log" ON public."review_moderation_log";
CREATE POLICY "Admins can view moderation log" ON public."review_moderation_log" FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::user_role)))));

DROP POLICY IF EXISTS "Users can create reports" ON public."review_reports";
CREATE POLICY "Users can create reports" ON public."review_reports" FOR INSERT
  WITH CHECK (((reporter_id = (select auth.uid())) AND (NOT (EXISTS ( SELECT 1
   FROM business_reviews
  WHERE ((business_reviews.id = review_reports.review_id) AND (business_reviews.user_id = (select auth.uid()))))))));

DROP POLICY IF EXISTS "Users can view own reports" ON public."review_reports";
CREATE POLICY "Users can view own reports" ON public."review_reports" FOR SELECT
  USING ((reporter_id = (select auth.uid())));

DROP POLICY IF EXISTS "System can insert requests" ON public."review_requests";
CREATE POLICY "System can insert requests" ON public."review_requests" FOR INSERT
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can update own requests" ON public."review_requests";
CREATE POLICY "Users can update own requests" ON public."review_requests" FOR UPDATE
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view own requests" ON public."review_requests";
CREATE POLICY "Users can view own requests" ON public."review_requests" FOR SELECT
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can insert their own shares" ON public."review_shares";
CREATE POLICY "Users can insert their own shares" ON public."review_shares" FOR INSERT
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view their own shares" ON public."review_shares";
CREATE POLICY "Users can view their own shares" ON public."review_shares" FOR SELECT
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can log views" ON public."review_views";
CREATE POLICY "Users can log views" ON public."review_views" FOR INSERT
  WITH CHECK (((select auth.uid()) = viewer_id));

DROP POLICY IF EXISTS "Users can see relevant view data" ON public."review_views";
CREATE POLICY "Users can see relevant view data" ON public."review_views" FOR SELECT
  USING (((viewer_id = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM business_reviews br
  WHERE ((br.id = review_views.review_id) AND (br.user_id = (select auth.uid())))))));

DROP POLICY IF EXISTS "Users can manage their own reviews" ON public."reviews";
CREATE POLICY "Users can manage their own reviews" ON public."reviews" FOR ALL
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view their own search analytics" ON public."search_analytics";
CREATE POLICY "Users can view their own search analytics" ON public."search_analytics" FOR SELECT
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can delete own search history" ON public."search_history";
CREATE POLICY "Users can delete own search history" ON public."search_history" FOR DELETE
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can insert own search history" ON public."search_history";
CREATE POLICY "Users can insert own search history" ON public."search_history" FOR INSERT
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view own search history" ON public."search_history";
CREATE POLICY "Users can view own search history" ON public."search_history" FOR SELECT
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view their own share clicks" ON public."share_clicks";
CREATE POLICY "Users can view their own share clicks" ON public."share_clicks" FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM deal_shares ds
  WHERE ((ds.id = share_clicks.share_id) AND ((ds.sender_id = (select auth.uid())) OR (ds.recipient_id = (select auth.uid())))))));

DROP POLICY IF EXISTS "Users can view clicks on their shares" ON public."share_clicks_unified";
CREATE POLICY "Users can view clicks on their shares" ON public."share_clicks_unified" FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM share_events se
  WHERE ((se.id = share_clicks_unified.share_event_id) AND (se.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Authenticated users can track conversions" ON public."share_conversions";
CREATE POLICY "Authenticated users can track conversions" ON public."share_conversions" FOR INSERT
  WITH CHECK (((select auth.uid()) IS NOT NULL));

DROP POLICY IF EXISTS "Users can insert their own conversions" ON public."share_conversions";
CREATE POLICY "Users can insert their own conversions" ON public."share_conversions" FOR INSERT
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view conversions on their shares" ON public."share_conversions";
CREATE POLICY "Users can view conversions on their shares" ON public."share_conversions" FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM share_events se
  WHERE ((se.id = share_conversions.share_event_id) AND (se.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Users can view their own conversions" ON public."share_conversions";
CREATE POLICY "Users can view their own conversions" ON public."share_conversions" FOR SELECT
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Authenticated users can create shares" ON public."share_events";
CREATE POLICY "Authenticated users can create shares" ON public."share_events" FOR INSERT
  WITH CHECK (((select auth.uid()) IS NOT NULL));

DROP POLICY IF EXISTS "Business owners can view entity shares" ON public."share_events";
CREATE POLICY "Business owners can view entity shares" ON public."share_events" FOR SELECT
  USING ((((entity_type = 'storefront'::text) AND (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = share_events.entity_id) AND (b.owner_id = (select auth.uid())))))) OR ((entity_type = 'product'::text) AND (EXISTS ( SELECT 1
   FROM (products p
     JOIN businesses b ON ((p.business_id = b.id)))
  WHERE ((p.id = share_events.entity_id) AND (b.owner_id = (select auth.uid())))))) OR ((entity_type = 'offer'::text) AND (EXISTS ( SELECT 1
   FROM (offers o
     JOIN businesses b ON ((o.business_id = b.id)))
  WHERE ((o.id = share_events.entity_id) AND (b.owner_id = (select auth.uid())))))) OR ((entity_type = 'profile'::text) AND (entity_id = (select auth.uid())))));

DROP POLICY IF EXISTS "Users can view own shares" ON public."share_events";
CREATE POLICY "Users can view own shares" ON public."share_events" FOR SELECT
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Anyone can create shares" ON public."shares";
CREATE POLICY "Anyone can create shares" ON public."shares" FOR INSERT
  WITH CHECK ((((select auth.uid()) = user_id) OR (user_id IS NULL) OR ((select auth.uid()) IS NULL)));

DROP POLICY IF EXISTS "Business owners can view coupon shares" ON public."shares";
CREATE POLICY "Business owners can view coupon shares" ON public."shares" FOR SELECT
  USING (((type = 'coupon'::text) AND (EXISTS ( SELECT 1
   FROM (coupons
     JOIN businesses ON ((coupons.business_id = businesses.id)))
  WHERE ((coupons.id = shares.entity_id) AND (businesses.owner_id = (select auth.uid())))))));

DROP POLICY IF EXISTS "Business owners can view offer shares" ON public."shares";
CREATE POLICY "Business owners can view offer shares" ON public."shares" FOR SELECT
  USING (((type = 'offer'::text) AND (EXISTS ( SELECT 1
   FROM (offers
     JOIN businesses ON ((offers.business_id = businesses.id)))
  WHERE ((offers.id = shares.entity_id) AND (businesses.owner_id = (select auth.uid())))))));

DROP POLICY IF EXISTS "Business owners can view product shares" ON public."shares";
CREATE POLICY "Business owners can view product shares" ON public."shares" FOR SELECT
  USING (((type = 'product'::text) AND (EXISTS ( SELECT 1
   FROM (products
     JOIN businesses ON ((products.business_id = businesses.id)))
  WHERE ((products.id = shares.entity_id) AND (businesses.owner_id = (select auth.uid())))))));

DROP POLICY IF EXISTS "Business owners can view storefront shares" ON public."shares";
CREATE POLICY "Business owners can view storefront shares" ON public."shares" FOR SELECT
  USING (((type = 'storefront'::text) AND (EXISTS ( SELECT 1
   FROM businesses
  WHERE ((businesses.id = shares.entity_id) AND (businesses.owner_id = (select auth.uid())))))));

DROP POLICY IF EXISTS "Users can view own shares" ON public."shares";
CREATE POLICY "Users can view own shares" ON public."shares" FOR SELECT
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Authenticated can read sharing limits" ON public."sharing_limits";
CREATE POLICY "Authenticated can read sharing limits" ON public."sharing_limits" FOR SELECT
  USING (((select auth.uid()) IS NOT NULL));

DROP POLICY IF EXISTS "Admins can insert system settings" ON public."system_settings";
CREATE POLICY "Admins can insert system settings" ON public."system_settings" FOR INSERT
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::user_role)))));

DROP POLICY IF EXISTS "Admins can update system settings" ON public."system_settings";
CREATE POLICY "Admins can update system settings" ON public."system_settings" FOR UPDATE
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::user_role)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::user_role)))));

DROP POLICY IF EXISTS "Conversation participants can view typing indicators" ON public."typing_indicators";
CREATE POLICY "Conversation participants can view typing indicators" ON public."typing_indicators" FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.id = typing_indicators.conversation_id) AND ((select auth.uid()) = ANY (c.participants))))));

DROP POLICY IF EXISTS "Users can clear their own typing indicator" ON public."typing_indicators";
CREATE POLICY "Users can clear their own typing indicator" ON public."typing_indicators" FOR DELETE
  USING ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can publish their own typing indicator" ON public."typing_indicators";
CREATE POLICY "Users can publish their own typing indicator" ON public."typing_indicators" FOR INSERT
  WITH CHECK (((user_id = (select auth.uid())) AND (EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.id = typing_indicators.conversation_id) AND ((select auth.uid()) = ANY (c.participants)))))));

DROP POLICY IF EXISTS "Business owners can view collections" ON public."user_coupon_collections";
CREATE POLICY "Business owners can view collections" ON public."user_coupon_collections" FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM (business_coupons bc
     JOIN businesses b ON ((b.id = bc.business_id)))
  WHERE ((bc.id = user_coupon_collections.coupon_id) AND (b.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Users can delete their own coupon collections" ON public."user_coupon_collections";
CREATE POLICY "Users can delete their own coupon collections" ON public."user_coupon_collections" FOR DELETE
  USING ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can insert their own coupon collections" ON public."user_coupon_collections";
CREATE POLICY "Users can insert their own coupon collections" ON public."user_coupon_collections" FOR INSERT
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can update their own coupon collections" ON public."user_coupon_collections";
CREATE POLICY "Users can update their own coupon collections" ON public."user_coupon_collections" FOR UPDATE
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can view active or shared coupons" ON public."user_coupon_collections";
CREATE POLICY "Users can view active or shared coupons" ON public."user_coupon_collections" FOR SELECT
  USING (((user_id = (select auth.uid())) OR ((shared_to_user_id = (select auth.uid())) AND ((status)::text = 'active'::text))));

DROP POLICY IF EXISTS "Users can delete own favorites" ON public."user_favorites";
CREATE POLICY "Users can delete own favorites" ON public."user_favorites" FOR DELETE
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can insert own favorites" ON public."user_favorites";
CREATE POLICY "Users can insert own favorites" ON public."user_favorites" FOR INSERT
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view own favorites" ON public."user_favorites";
CREATE POLICY "Users can view own favorites" ON public."user_favorites" FOR SELECT
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can delete their own push tokens" ON public."user_push_tokens";
CREATE POLICY "Users can delete their own push tokens" ON public."user_push_tokens" FOR DELETE
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can insert their own push tokens" ON public."user_push_tokens";
CREATE POLICY "Users can insert their own push tokens" ON public."user_push_tokens" FOR INSERT
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can update their own push tokens" ON public."user_push_tokens";
CREATE POLICY "Users can update their own push tokens" ON public."user_push_tokens" FOR UPDATE
  USING (((select auth.uid()) = user_id))
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view their own push tokens" ON public."user_push_tokens";
CREATE POLICY "Users can view their own push tokens" ON public."user_push_tokens" FOR SELECT
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "user_reputation_select_own" ON public."user_reputation_scores";
CREATE POLICY "user_reputation_select_own" ON public."user_reputation_scores" FOR SELECT
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can manage their own wishlist" ON public."user_wishlist_items";
CREATE POLICY "Users can manage their own wishlist" ON public."user_wishlist_items" FOR ALL
  USING (((select auth.uid()) = user_id))
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view their own wishlist" ON public."user_wishlist_items";
CREATE POLICY "Users can view their own wishlist" ON public."user_wishlist_items" FOR SELECT
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can delete own wishlist items" ON public."wishlist_items";
CREATE POLICY "Users can delete own wishlist items" ON public."wishlist_items" FOR DELETE
  USING ((user_id = ( SELECT (select auth.uid()) AS uid)));

DROP POLICY IF EXISTS "Users can insert own wishlist items" ON public."wishlist_items";
CREATE POLICY "Users can insert own wishlist items" ON public."wishlist_items" FOR INSERT
  WITH CHECK ((user_id = ( SELECT (select auth.uid()) AS uid)));

DROP POLICY IF EXISTS "Users can read own wishlist items" ON public."wishlist_items";
CREATE POLICY "Users can read own wishlist items" ON public."wishlist_items" FOR SELECT
  USING ((user_id = ( SELECT (select auth.uid()) AS uid)));

COMMIT;