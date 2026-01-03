-- ⚡ STORY 8.1.7: Performance Testing Implementation
-- Create test data generators and performance test suite

-- Performance test results table
CREATE TABLE IF NOT EXISTS performance_test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_name TEXT NOT NULL,
  query TEXT NOT NULL,
  execution_time_ms NUMERIC NOT NULL,
  rows_returned INTEGER,
  index_used BOOLEAN,
  sequential_scan BOOLEAN,
  buffer_hits INTEGER,
  buffer_reads INTEGER,
  test_run_id UUID NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_test_run_id CHECK (test_run_id IS NOT NULL)
);

-- Index for performance test queries
CREATE INDEX IF NOT EXISTS idx_performance_test_results_test_run 
ON performance_test_results(test_run_id, executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_test_results_test_name 
ON performance_test_results(test_name, executed_at DESC);

-- Enable pg_stat_statements for query analysis
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Generate test users function
CREATE OR REPLACE FUNCTION generate_test_users(p_count INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_user_id UUID;
  v_counter INTEGER := 0;
BEGIN
  FOR i IN 1..p_count LOOP
    v_user_id := uuid_generate_v4();
    
    -- Insert into profiles table directly (skip auth.users for test data)
    INSERT INTO profiles (id, full_name, username, email)
    VALUES (
      v_user_id,
      'Test User ' || i,
      'testuser' || i,
      'testuser' || i || '@example.com'
    )
    ON CONFLICT (id) DO NOTHING;
    
    v_counter := v_counter + 1;
    
    -- Progress update every 100 users
    IF v_counter % 100 = 0 THEN
      RAISE NOTICE 'Generated % users...', v_counter;
    END IF;
  END LOOP;
  
  RETURN v_counter;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate test conversations function
CREATE OR REPLACE FUNCTION generate_test_conversations(p_count INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_conversation_id UUID;
  v_user1 UUID;
  v_user2 UUID;
  v_counter INTEGER := 0;
BEGIN
  FOR i IN 1..p_count LOOP
    v_conversation_id := uuid_generate_v4();
    
    -- Pick two random users
    SELECT id INTO v_user1 FROM profiles ORDER BY RANDOM() LIMIT 1;
    SELECT id INTO v_user2 FROM profiles WHERE id != v_user1 ORDER BY RANDOM() LIMIT 1;
    
    IF v_user1 IS NULL OR v_user2 IS NULL THEN
      RAISE NOTICE 'Not enough users to create conversations. Created % conversations.', v_counter;
      RETURN v_counter;
    END IF;
    
    INSERT INTO conversations (id, type, participants, created_at, last_message_at)
    VALUES (
      v_conversation_id,
      'direct',
      ARRAY[v_user1, v_user2],
      NOW() - (random() * INTERVAL '90 days'),
      NOW() - (random() * INTERVAL '7 days')
    )
    ON CONFLICT (participants) WHERE type = 'direct' DO NOTHING;
    
    v_counter := v_counter + 1;
    
    -- Progress update every 1000 conversations
    IF v_counter % 1000 = 0 THEN
      RAISE NOTICE 'Generated % conversations...', v_counter;
    END IF;
  END LOOP;
  
  RETURN v_counter;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate test messages function
CREATE OR REPLACE FUNCTION generate_test_messages(p_count INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_message_id UUID;
  v_conversation RECORD;
  v_sender UUID;
  v_counter INTEGER := 0;
BEGIN
  FOR i IN 1..p_count LOOP
    -- Pick random conversation
    SELECT id, participants INTO v_conversation 
    FROM conversations 
    ORDER BY RANDOM() 
    LIMIT 1;
    
    IF v_conversation.id IS NULL THEN
      RAISE NOTICE 'No conversations found. Created % messages.', v_counter;
      RETURN v_counter;
    END IF;
    
    -- Pick random participant as sender
    v_sender := v_conversation.participants[1 + floor(random() * array_length(v_conversation.participants, 1))];
    
    v_message_id := uuid_generate_v4();
    
    INSERT INTO messages (
      id,
      conversation_id,
      sender_id,
      content,
      type,
      created_at
    )
    VALUES (
      v_message_id,
      v_conversation.id,
      v_sender,
      'Test message content ' || i || ' with some random text to simulate real messages and make full-text search more realistic',
      CASE floor(random() * 10)
        WHEN 0 THEN 'image'
        WHEN 1 THEN 'video'
        ELSE 'text'
      END,
      NOW() - (random() * INTERVAL '90 days')
    );
    
    v_counter := v_counter + 1;
    
    -- Progress update every 10K messages
    IF v_counter % 10000 = 0 THEN
      RAISE NOTICE 'Generated % messages...', v_counter;
    END IF;
  END LOOP;
  
  RETURN v_counter;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run performance test suite function
CREATE OR REPLACE FUNCTION run_performance_tests()
RETURNS TABLE (
  test_name TEXT,
  execution_time_ms NUMERIC,
  status TEXT
) AS $$
DECLARE
  v_test_run_id UUID := uuid_generate_v4();
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_execution_time NUMERIC;
  v_conversation_id UUID;
BEGIN
  RAISE NOTICE 'Starting performance test suite: %', v_test_run_id;
  
  -- Get a valid conversation ID for testing
  SELECT id INTO v_conversation_id FROM conversations LIMIT 1;
  
  IF v_conversation_id IS NULL THEN
    RAISE EXCEPTION 'No conversations found. Generate test data first.';
  END IF;
  
  -- Test 1: Fetch recent messages
  v_start_time := clock_timestamp();
  PERFORM * FROM messages 
  WHERE conversation_id = v_conversation_id
  ORDER BY created_at DESC 
  LIMIT 50;
  v_end_time := clock_timestamp();
  v_execution_time := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
  
  INSERT INTO performance_test_results (test_name, query, execution_time_ms, test_run_id)
  VALUES ('fetch_recent_messages', 'messages WHERE conversation_id', v_execution_time, v_test_run_id);
  
  RETURN QUERY SELECT 
    'fetch_recent_messages'::TEXT, 
    v_execution_time,
    CASE WHEN v_execution_time < 50 THEN '✅ PASS' ELSE '❌ FAIL' END::TEXT;
  
  -- Test 2: Conversation list
  v_start_time := clock_timestamp();
  PERFORM * FROM conversation_list 
  ORDER BY last_message_at DESC 
  LIMIT 50;
  v_end_time := clock_timestamp();
  v_execution_time := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
  
  INSERT INTO performance_test_results (test_name, query, execution_time_ms, test_run_id)
  VALUES ('conversation_list', 'conversation_list view', v_execution_time, v_test_run_id);
  
  RETURN QUERY SELECT 
    'conversation_list'::TEXT, 
    v_execution_time,
    CASE WHEN v_execution_time < 100 THEN '✅ PASS' ELSE '❌ FAIL' END::TEXT;
  
  -- Test 3: Unread count
  v_start_time := clock_timestamp();
  PERFORM COUNT(*) FROM messages m
  LEFT JOIN message_read_receipts mrr ON mrr.message_id = m.id
  WHERE m.conversation_id = v_conversation_id
    AND mrr.read_at IS NULL;
  v_end_time := clock_timestamp();
  v_execution_time := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
  
  INSERT INTO performance_test_results (test_name, query, execution_time_ms, test_run_id)
  VALUES ('unread_count', 'COUNT unread messages', v_execution_time, v_test_run_id);
  
  RETURN QUERY SELECT 
    'unread_count'::TEXT, 
    v_execution_time,
    CASE WHEN v_execution_time < 50 THEN '✅ PASS' ELSE '❌ FAIL' END::TEXT;
  
  -- Test 4: Message search
  v_start_time := clock_timestamp();
  PERFORM * FROM search_messages('test');
  v_end_time := clock_timestamp();
  v_execution_time := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
  
  INSERT INTO performance_test_results (test_name, query, execution_time_ms, test_run_id)
  VALUES ('message_search', 'search_messages function', v_execution_time, v_test_run_id);
  
  RETURN QUERY SELECT 
    'message_search'::TEXT, 
    v_execution_time,
    CASE WHEN v_execution_time < 200 THEN '✅ PASS' ELSE '❌ FAIL' END::TEXT;
  
  -- Test 5: Send message function
  v_start_time := clock_timestamp();
  PERFORM send_message(
    v_conversation_id,
    'Performance test message',
    'text',
    NULL,
    NULL,
    NULL
  );
  v_end_time := clock_timestamp();
  v_execution_time := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
  
  INSERT INTO performance_test_results (test_name, query, execution_time_ms, test_run_id)
  VALUES ('send_message_function', 'send_message function', v_execution_time, v_test_run_id);
  
  RETURN QUERY SELECT 
    'send_message_function'::TEXT, 
    v_execution_time,
    CASE WHEN v_execution_time < 100 THEN '✅ PASS' ELSE '❌ FAIL' END::TEXT;
  
  RAISE NOTICE 'Performance test suite completed: %', v_test_run_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check slow queries
CREATE OR REPLACE FUNCTION get_slow_queries()
RETURNS TABLE (
  query TEXT,
  calls BIGINT,
  total_exec_time NUMERIC,
  mean_exec_time NUMERIC,
  max_exec_time NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pg_stat_statements.query::TEXT,
    pg_stat_statements.calls,
    ROUND(pg_stat_statements.total_exec_time::NUMERIC, 2) AS total_exec_time,
    ROUND(pg_stat_statements.mean_exec_time::NUMERIC, 2) AS mean_exec_time,
    ROUND(pg_stat_statements.max_exec_time::NUMERIC, 2) AS max_exec_time
  FROM pg_stat_statements
  WHERE mean_exec_time > 100 -- queries slower than 100ms
  ORDER BY mean_exec_time DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check index usage
CREATE OR REPLACE FUNCTION get_index_usage()
RETURNS TABLE (
  schemaname TEXT,
  tablename TEXT,
  indexname TEXT,
  idx_scan BIGINT,
  idx_tup_read BIGINT,
  idx_tup_fetch BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pg_stat_user_indexes.schemaname::TEXT,
    pg_stat_user_indexes.tablename::TEXT,
    pg_stat_user_indexes.indexname::TEXT,
    pg_stat_user_indexes.idx_scan,
    pg_stat_user_indexes.idx_tup_read,
    pg_stat_user_indexes.idx_tup_fetch
  FROM pg_stat_user_indexes
  WHERE tablename IN ('messages', 'conversations', 'message_read_receipts')
  ORDER BY idx_scan DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check for sequential scans
CREATE OR REPLACE FUNCTION get_sequential_scans()
RETURNS TABLE (
  schemaname TEXT,
  tablename TEXT,
  seq_scan BIGINT,
  seq_tup_read BIGINT,
  idx_scan BIGINT,
  idx_tup_fetch BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pg_stat_user_tables.schemaname::TEXT,
    pg_stat_user_tables.tablename::TEXT,
    pg_stat_user_tables.seq_scan,
    pg_stat_user_tables.seq_tup_read,
    pg_stat_user_tables.idx_scan,
    pg_stat_user_tables.idx_tup_fetch
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
    AND tablename IN ('messages', 'conversations', 'message_read_receipts', 'conversation_participants')
  ORDER BY seq_scan DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- COMMENT ON MIGRATION
COMMENT ON TABLE performance_test_results IS 'STORY 8.1.7: Performance test results tracking';
COMMENT ON FUNCTION generate_test_users IS 'STORY 8.1.7: Generate test users for performance testing';
COMMENT ON FUNCTION generate_test_conversations IS 'STORY 8.1.7: Generate test conversations for performance testing';
COMMENT ON FUNCTION generate_test_messages IS 'STORY 8.1.7: Generate test messages for performance testing';
COMMENT ON FUNCTION run_performance_tests IS 'STORY 8.1.7: Run comprehensive performance test suite';
COMMENT ON FUNCTION get_slow_queries IS 'STORY 8.1.7: Helper to identify slow queries';
COMMENT ON FUNCTION get_index_usage IS 'STORY 8.1.7: Helper to check index usage statistics';
COMMENT ON FUNCTION get_sequential_scans IS 'STORY 8.1.7: Helper to identify sequential scans';
