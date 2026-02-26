BEGIN;
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

COMMIT;
