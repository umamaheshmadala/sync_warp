BEGIN;
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

COMMIT;
