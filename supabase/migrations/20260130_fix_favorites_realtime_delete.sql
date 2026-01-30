-- Migration: Set REPLICA IDENTITY FULL for user_favorites
-- Created: 2026-01-30
-- Description: Ensures DELETE events include all columns so that real-time subscriptions can filter by user_id

ALTER TABLE user_favorites REPLICA IDENTITY FULL;
