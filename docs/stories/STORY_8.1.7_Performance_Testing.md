# ⚡ STORY 8.1.7: Performance Testing Implementation

**Parent Epic:** [EPIC 8.1 - Messaging Foundation & Database Architecture](../epics/EPIC_8.1_Messaging_Foundation_Database.md)  
**Story Owner:** Backend Engineering + QA  
**Estimated Effort:** 2 days  
**Priority:** 🟡 High  
**Status:** 📋 Ready for Implementation  
**Depends On:** Story 8.1.1, 8.1.2, 8.1.3, 8.1.4, 8.1.5

---

## 🎯 **Story Goal**

Conduct comprehensive performance testing on the messaging database infrastructure to validate query execution times, index efficiency, Realtime performance, and storage operations under production-like load conditions.

---

## 📱 **Platform Support**

### **Web + iOS + Android (Performance Testing)**

Performance testing for the messaging system must validate behavior across **all three platforms**, as mobile devices introduce unique performance constraints not present on web. Mobile testing is **critical** due to:

#### **Mobile-Specific Performance Considerations**

**1. Network Conditions Testing**
- **Mobile Networks**: 3G, 4G, 5G, WiFi have vastly different latency/bandwidth
  - **Test Environments**:
    - Slow 3G: 400ms RTT, 400 Kbps down, 400 Kbps up
    - Fast 3G: 300ms RTT, 1.6 Mbps down, 750 Kbps up
    - 4G: 170ms RTT, 10 Mbps down, 5 Mbps up
    - 5G: 10ms RTT, 100 Mbps down, 50 Mbps up
  - **Chrome DevTools MCP**: Use network throttling to simulate mobile conditions
    ```bash
    # Simulate Slow 3G network
    warp mcp run chrome-devtools "emulate network=Slow 3G"
    
    # Run performance tests under network constraint
    warp mcp run supabase "execute_sql SELECT run_performance_tests();"
    
    # Reset to no throttling
    warp mcp run chrome-devtools "emulate network=No emulation"
    ```

**2. Device Performance Benchmarks**
- **CPU Throttling**: Mobile CPUs are slower than desktop
  - **Test on Real Devices**:
    - Low-end Android (2019, SD 665, 4GB RAM)
    - Mid-range Android (2021, SD 778G, 6GB RAM)
    - iPhone 11 (A13 Bionic)
    - iPhone 14 (A15 Bionic)
  - **Chrome DevTools CPU Throttling**: Simulate slower mobile CPUs
    ```bash
    # Simulate 4x CPU slowdown (typical mobile)
    warp mcp run chrome-devtools "emulate cpuThrottlingRate=4"
    
    # Test React rendering performance
    warp mcp run puppeteer "run performance test on conversation list rendering"
    ```

**3. Realtime Subscription Latency (Mobile)**
- **WebSocket Connection**: Mobile devices frequently lose/regain network
  - **Target Latencies**:
    - Web: < 100ms message delivery
    - Mobile (WiFi): < 300ms message delivery
    - Mobile (4G): < 500ms message delivery
    - Mobile (3G): < 1000ms message delivery
  - **Test Reconnection**:
    ```typescript
    // Test mobile reconnection scenario
    await simulateNetworkDisconnect(5000) // 5 seconds offline
    const reconnectStart = Date.now()
    await waitForRealtimeReconnect()
    const reconnectTime = Date.now() - reconnectStart
    
    // Target: < 2 seconds to reconnect and sync
    expect(reconnectTime).toBeLessThan(2000)
    ```

**4. Storage Upload/Download Performance (Mobile)**
- **Image/Video Upload**: Mobile uploads slower due to network + compression
  - **Test Cases**:
    - Upload 1MB image over 4G: target < 3 seconds
    - Upload 10MB video over 4G: target < 30 seconds
    - Download 1MB image: target < 2 seconds
    - Download 10MB video: target < 20 seconds
  - **Mobile Optimization**:
    - Compress images before upload (iOS: `ImageOptim`, Android: `Compressor`)
    - Use Capacitor `@capacitor/filesystem` to check file size before upload
    - Show upload progress with `@capacitor/upload`

**5. Database Query Performance (Client-Side)**
- **Local SQLite Queries**: Mobile apps use local cache (SQLite)
  - **Test Cases**:
    - Fetch 50 messages from local cache: target < 50ms
    - Search messages in local cache: target < 200ms
    - Load conversation list (50 items): target < 100ms
  - **Indexing**: Ensure local SQLite has proper indexes:
    ```sql
    -- Local cache indexes (SQLite)
    CREATE INDEX idx_local_messages_conversation_created 
    ON local_messages(conversation_id, created_at DESC);
    
    CREATE INDEX idx_local_messages_search 
    ON local_messages(content); -- or FTS5 virtual table
    ```

**6. Memory Usage (Mobile)**
- **RAM Constraints**: Mobile devices have limited memory (2-8GB vs 16-32GB desktop)
  - **Test Memory Usage**:
    - Load 100 conversations: target < 50MB RAM increase
    - Load 1000 messages: target < 100MB RAM increase
    - Monitor for memory leaks over 5-minute test
  - **Puppeteer MCP**: Use memory profiling
    ```bash
    # Take memory snapshot before test
    warp mcp run puppeteer "take memory snapshot before-messages-load"
    
    # Load messages
    warp mcp run puppeteer "click selector=[data-testid=load-messages]"
    
    # Take memory snapshot after test
    warp mcp run puppeteer "take memory snapshot after-messages-load"
    
    # Compare snapshots
    warp mcp run puppeteer "compare memory snapshots"
    ```

**7. Battery Impact Testing**
- **Background Sync**: Realtime subscriptions drain battery
  - **Optimization Strategies**:
    - Use `@capacitor/app` to detect background state
    - Disconnect Realtime when app backgrounded > 1 minute
    - Use push notifications instead of persistent connection
    - Re-connect when app returns to foreground
  - **Test Battery Drain**:
    - Run app for 1 hour with active messaging
    - Measure battery drop (target: < 10% per hour)

#### **Mobile Performance Testing Checklist**

- [ ] **Network Simulation**: Test under Slow 3G, Fast 3G, 4G, 5G
- [ ] **CPU Throttling**: Test with 4x CPU slowdown
- [ ] **Real Device Testing**: Test on low-end Android + iPhone 11
- [ ] **Realtime Latency**: Verify message delivery < 500ms on 4G
- [ ] **Reconnection Speed**: Verify reconnect < 2 seconds after disconnect
- [ ] **Upload Performance**: 1MB image upload < 3s on 4G
- [ ] **Download Performance**: 1MB image download < 2s on 4G
- [ ] **Local Cache Performance**: 50 messages load < 50ms from SQLite
- [ ] **Memory Usage**: Load 100 conversations < 50MB RAM increase
- [ ] **Memory Leaks**: No leaks over 5-minute test
- [ ] **Battery Impact**: < 10% battery drain per hour
- [ ] **Background Behavior**: Realtime disconnects after 1 minute in background

#### **Performance Targets by Platform**

| Metric | Web (Desktop) | iOS/Android (WiFi) | iOS/Android (4G) |
|--------|---------------|--------------------|-----------------|
| **Message Delivery (Realtime)** | < 100ms | < 300ms | < 500ms |
| **Conversation List Load** | < 50ms | < 100ms | < 200ms |
| **Message Search** | < 200ms | < 300ms | < 500ms |
| **Image Upload (1MB)** | < 1s | < 2s | < 3s |
| **Image Download (1MB)** | < 500ms | < 1s | < 2s |
| **Reconnect After Disconnect** | < 1s | < 2s | < 3s |
| **Local Cache Query (50 msgs)** | N/A | < 50ms | < 50ms |
| **Memory Usage (100 convos)** | < 100MB | < 50MB | < 50MB |
| **Battery Drain (1 hour)** | N/A | < 10% | < 10% |

#### **Testing Tools (MCP Integration)**

```bash
# 1. Network throttling tests
warp mcp run chrome-devtools "emulate network=Slow 3G"
warp mcp run supabase "execute_sql SELECT run_performance_tests();"

# 2. CPU throttling tests
warp mcp run chrome-devtools "emulate cpuThrottlingRate=4"
warp mcp run puppeteer "run load test with 100 concurrent users"

# 3. Memory profiling
warp mcp run puppeteer "take memory snapshot before-load"
warp mcp run puppeteer "click selector=[data-testid=load-messages]"
warp mcp run puppeteer "take memory snapshot after-load"

# 4. Performance trace (Web Vitals)
warp mcp run chrome-devtools "performance_start_trace reload=true autoStop=true"
warp mcp run chrome-devtools "performance_stop_trace"

# 5. Mobile device testing (real devices)
# Connect iOS device, enable remote debugging
# Connect Android device, enable USB debugging
warp mcp run puppeteer "navigate http://192.168.1.100:5173 allowDangerous=true"
warp mcp run puppeteer "run e2e test suite on mobile device"
```

#### **Key Differences from Web**

| Aspect | Web (Desktop) | iOS/Android |
|--------|---------------|-------------|
| **Network** | Stable, high-speed | Intermittent, variable speed |
| **CPU** | Powerful (4-16 cores) | Limited (4-8 cores, slower) |
| **Memory** | Abundant (16-32GB) | Constrained (2-8GB) |
| **Battery** | Unlimited (plugged in) | Limited (need to optimize) |
| **Local Cache** | IndexedDB (browser-managed) | SQLite (app-managed, faster) |
| **Testing Tools** | Chrome DevTools, Jest | Xcode Instruments, Android Profiler |

---

## 📝 **User Story**

**As a** QA engineer  
**I want to** validate messaging system performance under load  
**So that** we can confidently deploy to production knowing the system meets performance targets

---

## ✅ **Acceptance Criteria**

- [ ] Test database populated with 100K+ messages
- [ ] All critical queries meet performance targets
- [ ] EXPLAIN ANALYZE executed on all queries
- [ ] Index usage verified (no sequential scans)
- [ ] Realtime subscription latency < 300ms
- [ ] Storage upload/download performance validated
- [ ] Load testing completed (1K concurrent users)
- [ ] Performance report generated
- [ ] Bottlenecks identified and documented

---

## 🛢 **MCP Integration (Primary: Supabase MCP)**

### **Phase 1: Generate Test Data**

```bash
# Create test data generation function
warp mcp run supabase "apply_migration create_test_data_generator"

# Generate test users
warp mcp run supabase "execute_sql SELECT generate_test_users(1000);"

# Generate test conversations
warp mcp run supabase "execute_sql SELECT generate_test_conversations(10000);"

# Generate test messages
warp mcp run supabase "execute_sql SELECT generate_test_messages(100000);"

# Verify data created
warp mcp run supabase "execute_sql SELECT COUNT(*) as user_count FROM profiles; SELECT COUNT(*) as conversation_count FROM conversations; SELECT COUNT(*) as message_count FROM messages;"
```

### **Phase 2: Test Query Performance**

```bash
# Test message fetching
warp mcp run supabase "execute_sql EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM messages WHERE conversation_id = (SELECT id FROM conversations LIMIT 1) ORDER BY created_at DESC LIMIT 50;"

# Test conversation list
warp mcp run supabase "execute_sql EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM conversation_list ORDER BY last_message_at DESC LIMIT 50;"

# Test unread count
warp mcp run supabase "execute_sql EXPLAIN ANALYZE SELECT COUNT(*) FROM messages m LEFT JOIN message_read_receipts mrr ON mrr.message_id = m.id WHERE m.conversation_id = (SELECT id FROM conversations LIMIT 1) AND mrr.read_at IS NULL;"

# Test message search
warp mcp run supabase "execute_sql EXPLAIN ANALYZE SELECT * FROM search_messages('test query');"

# Test send_message function
warp mcp run supabase "execute_sql EXPLAIN ANALYZE SELECT send_message((SELECT id FROM conversations LIMIT 1)::UUID, 'Test message', 'text', NULL, NULL, NULL);"
```

### **Phase 3: Verify Index Usage**

```bash
# Check all indexes on messages table
warp mcp run supabase "execute_sql SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'messages';"

# Check index usage statistics
warp mcp run supabase "execute_sql SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch FROM pg_stat_user_indexes WHERE tablename IN ('messages', 'conversations', 'message_read_receipts') ORDER BY idx_scan DESC;"

# Identify unused indexes
warp mcp run supabase "execute_sql SELECT schemaname, tablename, indexname FROM pg_stat_user_indexes WHERE idx_scan = 0 AND indexname NOT LIKE '%_pkey';"

# Check for sequential scans
warp mcp run supabase "execute_sql SELECT schemaname, tablename, seq_scan, seq_tup_read, idx_scan, idx_tup_fetch FROM pg_stat_user_tables WHERE schemaname = 'public' AND (seq_scan > 1000 OR idx_scan = 0) ORDER BY seq_scan DESC;"
```

### **Phase 4: Test Realtime Performance**

```bash
# Enable query logs
warp mcp run supabase "execute_sql ALTER DATABASE postgres SET log_min_duration_statement = 0;"

# Test realtime subscription setup time
warp mcp run supabase "execute_sql SELECT * FROM pg_stat_subscription;"

# Check active realtime connections
warp mcp run supabase "execute_sql SELECT count(*) FROM pg_stat_activity WHERE application_name LIKE '%realtime%';"

# Test broadcast performance
warp mcp run supabase "get_logs realtime"
```

---

## 🧠 **MCP Integration (Secondary: Context7 MCP)**

```bash
# Analyze slow queries
warp mcp run context7 "Review the EXPLAIN ANALYZE output for the conversation_list query and suggest performance improvements"

# Identify bottlenecks
warp mcp run context7 "Analyze the database schema and identify potential performance bottlenecks for the messaging system"

# Review index strategy
warp mcp run context7 "Review all indexes on the messages table and suggest additional indexes or improvements"
```

---

## 📋 **Implementation Tasks**

### **Task 1: Create Test Data Generator** ⏱️ 3 hours

```sql
-- Generate test users
CREATE OR REPLACE FUNCTION generate_test_users(p_count INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_user_id UUID;
  v_counter INTEGER := 0;
BEGIN
  FOR i IN 1..p_count LOOP
    v_user_id := uuid_generate_v4();
    
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES (
      v_user_id,
      'testuser' || i || '@example.com',
      crypt('password123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW()
    );
    
    INSERT INTO profiles (id, full_name, username, email)
    VALUES (
      v_user_id,
      'Test User ' || i,
      'testuser' || i,
      'testuser' || i || '@example.com'
    );
    
    v_counter := v_counter + 1;
  END LOOP;
  
  RETURN v_counter;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate test conversations
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
    
    INSERT INTO conversations (id, type, participants, created_at, last_message_at)
    VALUES (
      v_conversation_id,
      'direct',
      ARRAY[v_user1, v_user2],
      NOW() - (random() * INTERVAL '90 days'),
      NOW() - (random() * INTERVAL '7 days')
    );
    
    v_counter := v_counter + 1;
  END LOOP;
  
  RETURN v_counter;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate test messages
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
    SELECT id, participants INTO v_conversation FROM conversations ORDER BY RANDOM() LIMIT 1;
    
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
      'Test message content ' || i || ' with some random text to simulate real messages',
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
```

### **Task 2: Create Performance Test Suite** ⏱️ 4 hours

```sql
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
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Run performance test suite
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
BEGIN
  RAISE NOTICE 'Starting performance test suite: %', v_test_run_id;
  
  -- Test 1: Fetch recent messages
  v_start_time := clock_timestamp();
  PERFORM * FROM messages 
  WHERE conversation_id = (SELECT id FROM conversations LIMIT 1)
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
  WHERE m.conversation_id = (SELECT id FROM conversations LIMIT 1)
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
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **Task 3: Create Load Testing Script** ⏱️ 3 hours

```typescript
// performance-test.ts
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!

interface TestResult {
  testName: string
  duration: number
  success: boolean
  error?: string
}

async function runLoadTest(concurrentUsers: number) {
  const results: TestResult[] = []
  
  console.log(`🚀 Starting load test with ${concurrentUsers} concurrent users...`)
  
  // Create multiple client instances
  const clients = Array.from({ length: concurrentUsers }, () => 
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  )
  
  // Test 1: Fetch conversation list
  const test1Start = Date.now()
  await Promise.all(clients.map(async (client) => {
    try {
      const { data, error } = await client
        .from('conversation_list')
        .select('*')
        .order('last_message_at', { ascending: false })
        .limit(50)
      
      if (error) throw error
    } catch (err: any) {
      results.push({
        testName: 'conversation_list',
        duration: 0,
        success: false,
        error: err.message
      })
    }
  }))
  const test1Duration = Date.now() - test1Start
  results.push({
    testName: 'conversation_list_concurrent',
    duration: test1Duration,
    success: true
  })
  
  // Test 2: Fetch messages
  const test2Start = Date.now()
  await Promise.all(clients.map(async (client) => {
    try {
      const { data, error } = await client
        .from('messages')
        .select('*')
        .limit(50)
        .order('created_at', { ascending: false })
      
      if (error) throw error
    } catch (err: any) {
      results.push({
        testName: 'fetch_messages',
        duration: 0,
        success: false,
        error: err.message
      })
    }
  }))
  const test2Duration = Date.now() - test2Start
  results.push({
    testName: 'fetch_messages_concurrent',
    duration: test2Duration,
    success: true
  })
  
  // Test 3: Realtime subscription
  const test3Start = Date.now()
  await Promise.all(clients.map(async (client) => {
    return new Promise((resolve) => {
      const subscription = client
        .channel('messages')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages' 
        }, (payload) => {
          console.log('Realtime message received:', payload)
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setTimeout(() => {
              subscription.unsubscribe()
              resolve(null)
            }, 1000)
          }
        })
    })
  }))
  const test3Duration = Date.now() - test3Start
  results.push({
    testName: 'realtime_subscription_concurrent',
    duration: test3Duration,
    success: true
  })
  
  // Generate report
  console.log('\n📊 Load Test Results:')
  console.log('='.repeat(60))
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL'
    console.log(`${status} ${result.testName}: ${result.duration}ms`)
    if (result.error) console.log(`   Error: ${result.error}`)
  })
  console.log('='.repeat(60))
}

// Run the test
runLoadTest(100).then(() => {
  console.log('✅ Load test complete')
  process.exit(0)
}).catch((err) => {
  console.error('❌ Load test failed:', err)
  process.exit(1)
})
```

### **Task 4: Generate Performance Report** ⏱️ 2 hours

Create comprehensive performance report including:
- Query execution times
- Index usage statistics
- Realtime performance metrics
- Storage operation benchmarks
- Bottlenecks and recommendations

---

## 🧪 **Testing Checklist**

### **Database Query Performance**
- [ ] Message fetch < 50ms
- [ ] Conversation list < 100ms
- [ ] Unread count < 50ms
- [ ] Message search < 200ms
- [ ] send_message function < 100ms
- [ ] mark_as_read function < 50ms

### **Index Usage**
- [ ] All queries use indexes (no sequential scans)
- [ ] No unused indexes
- [ ] Index scan count > 0 for all critical indexes
- [ ] Buffer hit ratio > 95%

### **Realtime Performance**
- [ ] Subscription setup < 1s
- [ ] Message broadcast < 300ms
- [ ] Connection stability (no disconnects)
- [ ] 100 concurrent subscriptions supported

### **Storage Performance**
- [ ] File upload < 2s for 5MB file
- [ ] File download < 2s for 5MB file
- [ ] Signed URL generation < 100ms

### **Load Testing**
- [ ] 100 concurrent users supported
- [ ] 1000 concurrent users supported
- [ ] No connection pool exhaustion
- [ ] Database CPU < 80% under load

---

## 📊 **Success Metrics**

| Test Category | Metric | Target | Status |
|--------------|--------|--------|--------|
| **Message Fetch** | Query time | < 50ms | ⏱️ Test |
| **Conversation List** | Query time | < 100ms | ⏱️ Test |
| **Unread Count** | Query time | < 50ms | ⏱️ Test |
| **Message Search** | Query time | < 200ms | ⏱️ Test |
| **Realtime** | Broadcast latency | < 300ms | ⏱️ Test |
| **Storage Upload** | 5MB file | < 2s | ⏱️ Test |
| **Index Usage** | No seq scans | 100% | ⏱️ Test |
| **Concurrent Users** | Support | 1000 | ⏱️ Test |

---

## 🔗 **Dependencies**

**Requires:**
- ✅ Story 8.1.1 (All tables)
- ✅ Story 8.1.2 (RLS policies)
- ✅ Story 8.1.3 (Storage bucket)
- ✅ Story 8.1.4 (Database functions)
- ✅ Story 8.1.5 (Optimized views)

**Enables:**
- Production deployment
- Performance baseline establishment
- Capacity planning

---

## 📦 **Deliverables**

1. **Test Data Generator**: SQL functions for generating test data
2. **Performance Test Suite**: Automated SQL test functions
3. **Load Testing Script**: TypeScript script for load testing
4. **Performance Report**: Comprehensive PDF/markdown report
5. **Recommendations**: Document with optimization suggestions

---

## 🚨 **Edge Cases**

1. **Large conversations**: 10K+ messages
2. **High concurrent load**: 1K+ simultaneous users
3. **Complex search queries**: Multiple terms with filters
4. **Database connection pool**: Exhaustion under load
5. **Storage bandwidth**: Multiple large file uploads
6. **Realtime scaling**: 1K+ active subscriptions

---

## 💡 **Performance Optimization Checklist**

```sql
-- Enable pg_stat_statements for query analysis
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Check slow queries
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100 -- queries slower than 100ms
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Check table bloat
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check missing indexes
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  seq_tup_read / seq_scan AS avg_seq_tup_read
FROM pg_stat_user_tables
WHERE seq_scan > 0
  AND schemaname = 'public'
ORDER BY seq_scan DESC;
```

---

## ✅ **Definition of Done**

- [ ] Test data generated (100K+ messages)
- [ ] All performance tests executed
- [ ] All targets met or documented
- [ ] Index usage verified
- [ ] Load testing completed
- [ ] Performance report generated
- [ ] Bottlenecks identified
- [ ] Optimization recommendations documented
- [ ] Baseline metrics established

---

**Story Status:** 📋 Ready for Implementation  
**Next Story:** [STORY 8.1.8 - System Integration](./STORY_8.1.8_System_Integration.md)
