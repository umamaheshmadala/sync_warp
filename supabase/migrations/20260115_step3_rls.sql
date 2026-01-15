-- ============================================
-- STEP 3: ENABLE RLS & CREATE POLICIES (Run after Step 2)
-- ============================================

-- Enable RLS
ALTER TABLE share_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_clicks_unified ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_conversions ENABLE ROW LEVEL SECURITY;

-- share_events policies
CREATE POLICY "Users can view own shares"
  ON share_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create shares"
  ON share_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Business owners can view entity shares"
  ON share_events FOR SELECT
  USING (
    (entity_type = 'storefront' AND EXISTS (
      SELECT 1 FROM businesses b WHERE b.id = entity_id AND b.owner_id = auth.uid()
    ))
    OR
    (entity_type = 'product' AND EXISTS (
      SELECT 1 FROM business_products bp
      JOIN businesses b ON bp.business_id = b.id
      WHERE bp.id = entity_id AND b.owner_id = auth.uid()
    ))
    OR
    (entity_type = 'offer' AND EXISTS (
      SELECT 1 FROM business_offers bo
      JOIN businesses b ON bo.business_id = b.id
      WHERE bo.id = entity_id AND b.owner_id = auth.uid()
    ))
    OR
    (entity_type = 'profile' AND entity_id = auth.uid())
  );

-- share_clicks_unified policies
CREATE POLICY "Users can view clicks on their shares"
  ON share_clicks_unified FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM share_events se
      WHERE se.id = share_clicks_unified.share_event_id
      AND se.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can view entity clicks"
  ON share_clicks_unified FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM share_events se
      WHERE se.id = share_clicks_unified.share_event_id
      AND (
        (se.entity_type = 'storefront' AND EXISTS (
          SELECT 1 FROM businesses b WHERE b.id = se.entity_id AND b.owner_id = auth.uid()
        ))
        OR
        (se.entity_type = 'product' AND EXISTS (
          SELECT 1 FROM business_products bp
          JOIN businesses b ON bp.business_id = b.id
          WHERE bp.id = se.entity_id AND b.owner_id = auth.uid()
        ))
        OR
        (se.entity_type = 'offer' AND EXISTS (
          SELECT 1 FROM business_offers bo
          JOIN businesses b ON bo.business_id = b.id
          WHERE bo.id = se.entity_id AND b.owner_id = auth.uid()
        ))
      )
    )
  );

CREATE POLICY "Anyone can track clicks"
  ON share_clicks_unified FOR INSERT
  WITH CHECK (true);

-- share_conversions policies
CREATE POLICY "Users can view conversions on their shares"
  ON share_conversions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM share_events se
      WHERE se.id = share_conversions.share_event_id
      AND se.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can view entity conversions"
  ON share_conversions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM share_events se
      WHERE se.id = share_conversions.share_event_id
      AND (
        (se.entity_type = 'storefront' AND EXISTS (
          SELECT 1 FROM businesses b WHERE b.id = se.entity_id AND b.owner_id = auth.uid()
        ))
        OR
        (se.entity_type = 'product' AND EXISTS (
          SELECT 1 FROM business_products bp
          JOIN businesses b ON bp.business_id = b.id
          WHERE bp.id = se.entity_id AND b.owner_id = auth.uid()
        ))
        OR
        (se.entity_type = 'offer' AND EXISTS (
          SELECT 1 FROM business_offers bo
          JOIN businesses b ON bo.business_id = b.id
          WHERE bo.id = se.entity_id AND b.owner_id = auth.uid()
        ))
      )
    )
  );

CREATE POLICY "Authenticated users can track conversions"
  ON share_conversions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
