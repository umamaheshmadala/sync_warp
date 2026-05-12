-- Migration: 20260318000000_create_product_category_master.sql
-- Description: Create product_category_master table with 3-level hierarchy

CREATE TABLE product_category_master (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  level       INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
  parent_id   UUID REFERENCES product_category_master(id),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE NULLS NOT DISTINCT (name, level, parent_id)
);

CREATE INDEX idx_pcm_level    ON product_category_master(level);
CREATE INDEX idx_pcm_parent   ON product_category_master(parent_id);
CREATE INDEX idx_pcm_active   ON product_category_master(is_active);

ALTER TABLE product_category_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_all_categories" ON product_category_master
  FOR SELECT USING (true);
-- No INSERT/UPDATE/DELETE policies for regular users (admin only via service role)
