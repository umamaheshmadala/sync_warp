-- ============================================================
-- STORY 8.7.3: Spam Detection System
-- ============================================================
-- Implements automated spam detection with:
-- - Dual rate limiting (global + per-conversation)
-- - Configurable spam keywords (admin-managed)
-- - Spam patterns for pattern matching
-- - User reputation scoring
-- - Rate limit violation tracking
-- ============================================================

-- ============================================================
-- STEP 1: Create spam_keywords table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.spam_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL UNIQUE,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
  action TEXT CHECK (action IN ('flag', 'block')) DEFAULT 'flag',
  is_active BOOLEAN DEFAULT true,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spam_keywords_active ON public.spam_keywords(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_spam_keywords_severity ON public.spam_keywords(severity);

COMMENT ON TABLE public.spam_keywords IS 'Admin-managed spam keywords with configurable severity';
COMMENT ON COLUMN public.spam_keywords.severity IS 'low=log only, medium=flag, high=block';
COMMENT ON COLUMN public.spam_keywords.action IS 'flag=mark for review, block=prevent send';

-- Seed with common spam keywords
INSERT INTO public.spam_keywords (keyword, severity, action) VALUES
  ('free money', 'high', 'block'),
  ('click here now', 'high', 'block'),
  ('limited time offer', 'medium', 'flag'),
  ('congratulations you won', 'high', 'block'),
  ('claim your prize', 'high', 'block'),
  ('winner', 'low', 'flag'),
  ('viagra', 'high', 'block'),
  ('crypto investment', 'medium', 'flag')
ON CONFLICT (keyword) DO NOTHING;

-- ============================================================
-- STEP 2: Create spam_patterns table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.spam_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  pattern TEXT NOT NULL, -- Regex pattern
  description TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
  is_active BOOLEAN DEFAULT true,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spam_patterns_active ON public.spam_patterns(is_active) WHERE is_active = true;

COMMENT ON TABLE public.spam_patterns IS 'Regex patterns for spam detection';

-- Seed with common patterns
INSERT INTO public.spam_patterns (name, pattern, description, severity) VALUES
  ('Excessive URLs', '(https?://[^\s]+.*){4,}', 'More than 3 URLs in message', 'high'),
  ('All Caps', '^[A-Z\s!?.,]{20,}$', 'Message is mostly uppercase', 'low'),
  ('Repetitive Characters', '(.)\1{10,}', 'Same character repeated 10+ times', 'medium'),
  ('Phone Number Spam', '\d{3}[-.\s]?\d{3}[-.\s]?\d{4}', 'Contains phone number pattern', 'low')
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 3: Create user_reputation_scores table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_reputation_scores (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reputation_score NUMERIC(5,2) DEFAULT 100.00, -- Scale: 0-100
  total_messages_sent INT DEFAULT 0,
  spam_flags_received INT DEFAULT 0,
  rate_limit_violations INT DEFAULT 0,
  last_violation_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_reputation_score ON public.user_reputation_scores(reputation_score);

COMMENT ON TABLE public.user_reputation_scores IS 'User trust scores for spam detection';
COMMENT ON COLUMN public.user_reputation_scores.reputation_score IS '100=trusted, 0=known spammer';

-- ============================================================
-- STEP 4: Create rate_limit_violations table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  violation_type TEXT CHECK (violation_type IN ('global', 'conversation')) NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  attempted_message_count INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_violations_user ON public.rate_limit_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_violations_created ON public.rate_limit_violations(created_at DESC);

COMMENT ON TABLE public.rate_limit_violations IS 'Tracks rate limit violations for admin review';

-- ============================================================
-- STEP 5: Alter messages table for spam tracking
-- ============================================================

ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS is_spam_flagged BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS spam_score NUMERIC(3,2) DEFAULT 0.00, -- 0.00-1.00
  ADD COLUMN IF NOT EXISTS spam_reason TEXT,
  ADD COLUMN IF NOT EXISTS spam_flagged_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_messages_spam_flagged 
  ON public.messages(is_spam_flagged) WHERE is_spam_flagged = true;

COMMENT ON COLUMN public.messages.spam_score IS 'Confidence score: 0.00=clean, 1.00=definitely spam';
COMMENT ON COLUMN public.messages.spam_reason IS 'Reason for spam flag (keyword, pattern, rate limit)';

-- ============================================================
-- STEP 6: Enable RLS on spam tables
-- ============================================================

ALTER TABLE public.spam_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spam_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reputation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_violations ENABLE ROW LEVEL SECURITY;

-- Policy: All users can read active spam keywords (for client-side checks)
DROP POLICY IF EXISTS "spam_keywords_read_active" ON public.spam_keywords;
CREATE POLICY "spam_keywords_read_active"
  ON public.spam_keywords FOR SELECT
  USING (is_active = true);

-- Policy: All users can read active patterns
DROP POLICY IF EXISTS "spam_patterns_read_active" ON public.spam_patterns;
CREATE POLICY "spam_patterns_read_active"
  ON public.spam_patterns FOR SELECT
  USING (is_active = true);

-- Policy: Users can view their own reputation score
DROP POLICY IF EXISTS "user_reputation_select_own" ON public.user_reputation_scores;
CREATE POLICY "user_reputation_select_own"
  ON public.user_reputation_scores FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can view their own violations
DROP POLICY IF EXISTS "violations_select_own" ON public.rate_limit_violations;
CREATE POLICY "violations_select_own"
  ON public.rate_limit_violations FOR SELECT
  USING (auth.uid() = user_id);

-- ⏸️ ADMIN POLICIES (Implement when admin panel is ready)
-- Future: Admins can manage spam keywords, patterns, and view all violations

COMMENT ON POLICY "spam_keywords_read_active" ON public.spam_keywords IS 
  'All users can read active keywords for client-side spam detection';

-- ============================================================
-- STEP 7: Create rate limit trigger functions
-- ============================================================

-- TRIGGER 1: Global rate limit (10 messages/minute)
CREATE OR REPLACE FUNCTION public.check_global_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_msg_count INT;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Count messages in last minute
  SELECT COUNT(*) INTO v_msg_count
  FROM public.messages
  WHERE sender_id = v_user_id
  AND created_at > NOW() - INTERVAL '1 minute';

  IF v_msg_count >= 10 THEN
    -- Log violation
    INSERT INTO public.rate_limit_violations (user_id, violation_type, attempted_message_count)
    VALUES (v_user_id, 'global', v_msg_count + 1);

    -- Update reputation
    UPDATE public.user_reputation_scores
    SET rate_limit_violations = rate_limit_violations + 1,
        last_violation_at = NOW(),
        reputation_score = GREATEST(0, reputation_score - 5) -- Deduct 5 points
    WHERE user_id = v_user_id;

    RAISE EXCEPTION 'Global rate limit exceeded: Maximum 10 messages per minute';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_global_rate_limit ON public.messages;
CREATE TRIGGER trigger_global_rate_limit
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.check_global_rate_limit();

COMMENT ON FUNCTION public.check_global_rate_limit IS 
  'Enforces global rate limit of 10 messages per minute per user';

-- TRIGGER 2: Per-conversation rate limit (20 messages/minute)
CREATE OR REPLACE FUNCTION public.check_conversation_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_msg_count INT;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Count messages to same conversation in last minute
  SELECT COUNT(*) INTO v_msg_count
  FROM public.messages
  WHERE sender_id = v_user_id
  AND conversation_id = NEW.conversation_id
  AND created_at > NOW() - INTERVAL '1 minute';

  IF v_msg_count >= 20 THEN
    -- Log violation
    INSERT INTO public.rate_limit_violations (user_id, violation_type, conversation_id, attempted_message_count)
    VALUES (v_user_id, 'conversation', NEW.conversation_id, v_msg_count + 1);

    -- Update reputation
    UPDATE public.user_reputation_scores
    SET rate_limit_violations = rate_limit_violations + 1,
        last_violation_at = NOW(),
        reputation_score = GREATEST(0, reputation_score - 3) -- Deduct 3 points
    WHERE user_id = v_user_id;

    RAISE EXCEPTION 'Conversation rate limit exceeded: Maximum 20 messages per minute per chat';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_conversation_rate_limit ON public.messages;
CREATE TRIGGER trigger_conversation_rate_limit
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.check_conversation_rate_limit();

COMMENT ON FUNCTION public.check_conversation_rate_limit IS 
  'Enforces per-conversation rate limit of 20 messages per minute';

-- ============================================================
-- STEP 8: Create helper function - initialize_user_reputation()
-- ============================================================

CREATE OR REPLACE FUNCTION public.initialize_user_reputation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_reputation_scores (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-initialize reputation for new users
DROP TRIGGER IF EXISTS trigger_init_user_reputation ON auth.users;
CREATE TRIGGER trigger_init_user_reputation
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.initialize_user_reputation();

COMMENT ON FUNCTION public.initialize_user_reputation IS 
  'Auto-creates reputation score entry for new users';

-- ============================================================
-- STEP 9: Validation
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'spam_keywords') THEN
    RAISE EXCEPTION 'spam_keywords table was not created';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rate_limit_violations') THEN
    RAISE EXCEPTION 'rate_limit_violations table was not created';
  END IF;

  RAISE NOTICE 'Spam detection migration completed successfully';
END $$;

-- Display stats
DO $$
DECLARE
  v_keyword_count INT;
  v_pattern_count INT;
BEGIN
  SELECT COUNT(*) INTO v_keyword_count FROM public.spam_keywords WHERE is_active = true;
  SELECT COUNT(*) INTO v_pattern_count FROM public.spam_patterns WHERE is_active = true;
  
  RAISE NOTICE 'Active spam keywords: %', v_keyword_count;
  RAISE NOTICE 'Active spam patterns: %', v_pattern_count;
END $$;
