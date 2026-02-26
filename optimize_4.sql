BEGIN;
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
