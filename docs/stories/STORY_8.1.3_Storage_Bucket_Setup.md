# 📦 STORY 8.1.3: Storage Bucket Setup for Message Attachments

**Parent Epic:** [EPIC 8.1 - Messaging Foundation & Database Architecture](../epics/EPIC_8.1_Messaging_Foundation_Database.md)  
**Story Owner:** Backend Engineering / DevOps  
**Estimated Effort:** 2 days  
**Priority:** 🔴 Critical  
**Status:** 📋 Ready for Implementation  
**Depends On:** Story 8.1.1 (Core Tables)

---

## 🎯 **Story Goal**

Set up a secure Supabase storage bucket for message attachments (images/videos) with proper RLS policies, file size limits, and MIME type restrictions to ensure secure and efficient media handling in messaging.

---

## 📝 **User Story**

**As a** backend developer  
**I want to** configure a secure storage bucket for message attachments  
**So that** users can safely upload and access media files in their conversations

---

## ✅ **Acceptance Criteria**

- [ ] `message-attachments` bucket created and configured
- [ ] File size limit set to 25MB
- [ ] Allowed MIME types restricted (images & videos only)
- [ ] Bucket is private (no public access)
- [ ] RLS policies created for upload/view/delete operations
- [ ] Signed URLs working with 1-hour expiration
- [ ] CORS configured for web and mobile access
- [ ] File path structure follows convention: `{user_id}/{conversation_id}/{timestamp}-{filename}`
- [ ] Upload/download tested from web and mobile
- [ ] Thumbnail generation setup documented

---

## 🛢 **MCP Integration (Primary: Supabase MCP)**

### **Phase 1: Create Storage Bucket**

```bash
# Create the message-attachments bucket
warp mcp run supabase "execute_sql INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('message-attachments', 'message-attachments', false, 26214400, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']);"

# Verify bucket created
warp mcp run supabase "execute_sql SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'message-attachments';"

# Check bucket configuration
warp mcp run supabase "execute_sql SELECT * FROM storage.buckets WHERE id = 'message-attachments';"
```

### **Phase 2: Configure RLS Policies**

```bash
# Policy 1: Users can upload to their own folders
warp mcp run supabase "execute_sql CREATE POLICY \"Users can upload their own attachments\" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'message-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);"

# Policy 2: Users can view attachments in their conversations
warp mcp run supabase "execute_sql CREATE POLICY \"Users can view conversation attachments\" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'message-attachments' AND EXISTS (SELECT 1 FROM messages m JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id WHERE cp.user_id = auth.uid() AND cp.left_at IS NULL AND (m.media_urls @> ARRAY[storage.objects.name] OR m.thumbnail_url = storage.objects.name)));"

# Policy 3: Users can delete their own attachments
warp mcp run supabase "execute_sql CREATE POLICY \"Users can delete their own attachments\" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'message-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);"

# Verify policies created
warp mcp run supabase "execute_sql SELECT policyname, tablename FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%attachment%';"
```

### **Phase 3: Test File Operations**

```bash
# List all files in bucket (should be empty initially)
warp mcp run supabase "execute_sql SELECT name, created_at, metadata FROM storage.objects WHERE bucket_id = 'message-attachments' LIMIT 10;"

# Test file path validation
warp mcp run supabase "execute_sql SELECT storage.foldername('user-id/conversation-id/12345-test.jpg');"

# Check storage statistics
warp mcp run supabase "execute_sql SELECT COUNT(*) as total_files, SUM((metadata->>'size')::bigint) as total_size_bytes FROM storage.objects WHERE bucket_id = 'message-attachments';"
```

### **Phase 4: Verify CORS Configuration**

```bash
# Check CORS settings (if configured via SQL)
warp mcp run supabase "execute_sql SELECT * FROM storage.buckets WHERE id = 'message-attachments';"

# Note: CORS is typically configured via Supabase Dashboard or environment config
# Document the required CORS settings for deployment
```

---

## 🧠 **MCP Integration (Secondary: Context7 MCP)**

```bash
# Analyze storage security
warp mcp run context7 "Review the storage bucket RLS policies and identify any security vulnerabilities or ways users could access unauthorized files"

# Suggest optimization
warp mcp run context7 "Analyze the file path structure and suggest improvements for organization and cleanup efficiency"

# Check integration points
warp mcp run context7 "Find all places in the codebase where file uploads will be implemented and list integration requirements"
```

---

## 📋 **Implementation Tasks**

### **Task 1: Create Bucket via SQL** ⏱️ 1 hour
```sql
-- Create bucket with configuration
INSERT INTO storage.buckets (
  id, 
  name, 
  public, 
  file_size_limit, 
  allowed_mime_types
) VALUES (
  'message-attachments',
  'message-attachments',
  false, -- Private bucket
  26214400, -- 25 MB in bytes
  ARRAY[
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
);
```

### **Task 2: Create RLS Policies** ⏱️ 2 hours
```sql
-- Policy 1: Upload Policy
CREATE POLICY "Users can upload their own attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: View Policy (conversation members only)
CREATE POLICY "Users can view conversation attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'message-attachments' AND
  EXISTS (
    SELECT 1 
    FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE 
      cp.user_id = auth.uid() AND
      cp.left_at IS NULL AND
      (m.media_urls @> ARRAY[storage.objects.name] OR
       m.thumbnail_url = storage.objects.name)
  )
);

-- Policy 3: Delete Policy
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### **Task 3: Configure CORS** ⏱️ 1 hour
- Configure allowed origins for web app
- Configure allowed origins for mobile app
- Set allowed methods: GET, POST, DELETE
- Document CORS configuration

### **Task 4: Test Upload/Download** ⏱️ 3 hours
- Create test upload function
- Test image upload (JPEG, PNG, GIF, WebP)
- Test video upload (MP4, QuickTime, WebM)
- Test file size limit enforcement (>25MB should fail)
- Test MIME type restriction (other types should fail)
- Test signed URL generation
- Test signed URL expiration
- Test download from signed URL

### **Task 5: Document File Structure** ⏱️ 1 hour
```
message-attachments/
  {user_id}/              ← User's folder
    {conversation_id}/    ← Conversation folder
      {timestamp}-{original_filename}
      {timestamp}-{original_filename}_thumb.jpg  ← Thumbnail
```

Example:
```
message-attachments/
  550e8400-e29b-41d4-a716-446655440000/
    8b7df143-d91c-4ecf-8d5a-2e0ffb9b8a5d/
      1704150000000-vacation.jpg
      1704150000000-vacation_thumb.jpg
      1704150120000-video.mp4
      1704150120000-video_thumb.jpg
```

### **Task 6: Setup Cleanup Strategy** ⏱️ 1 hour
- Document orphaned file detection
- Plan cleanup schedule (handled in Story 8.1.6)
- Document storage monitoring

---

## 🧪 **Testing Checklist**

### **Configuration Tests**
- [ ] Bucket exists and is private
- [ ] File size limit is 25MB
- [ ] Only allowed MIME types accepted
- [ ] CORS configured correctly

### **Upload Tests**
- [ ] User can upload image to their folder
- [ ] User can upload video to their folder
- [ ] User CANNOT upload to another user's folder
- [ ] Upload >25MB file fails
- [ ] Upload invalid MIME type fails
- [ ] File path follows correct structure

### **Access Tests**
- [ ] User can view attachments in their conversations
- [ ] User CANNOT view attachments from other conversations
- [ ] Signed URL works for authorized user
- [ ] Signed URL expires after 1 hour
- [ ] Unauthorized user cannot access file

### **Delete Tests**
- [ ] User can delete their own attachments
- [ ] User CANNOT delete others' attachments
- [ ] Deleted files removed from storage

### **Performance Tests**
- [ ] Upload 5MB image < 3 seconds
- [ ] Signed URL generation < 100ms
- [ ] Download via signed URL performs well

---

## 📊 **Success Metrics**

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Upload Success Rate** | > 99% | Monitor upload errors |
| **File Size Compliance** | 100% | All files ≤ 25MB |
| **MIME Type Compliance** | 100% | Only allowed types stored |
| **Signed URL Expiration** | 100% | URLs expire at 1 hour |
| **RLS Enforcement** | 100% | No unauthorized access |
| **Upload Speed (5MB)** | < 3s | Measure upload time |

---

## 🔗 **Dependencies**

**Requires:**
- ✅ Story 8.1.1 (messages table with media_urls column)
- ✅ Supabase Storage enabled
- ✅ Auth system working

**Enables:**
- Epic 8.3 (Media Attachments feature)
- Story 8.1.6 (Cleanup of old files)

---

## 📦 **Deliverables**

1. **Migration File**: `supabase/migrations/20250203_create_message_attachments_bucket.sql`
2. **RLS Policies**: Storage object policies documented
3. **CORS Config**: Documentation of CORS settings
4. **File Structure Guide**: `docs/messaging/STORAGE_STRUCTURE.md`
5. **Upload/Download Examples**: Sample code for frontend
6. **Test Results**: Upload/download test documentation

---

## 🚨 **Edge Cases & Security Considerations**

1. **Orphaned Files**: Files uploaded but message creation fails
   - Solution: Cleanup job in Story 8.1.6
   
2. **Filename Conflicts**: Same filename uploaded twice
   - Solution: Timestamp prefix ensures uniqueness
   
3. **Malicious File Upload**: User tries to upload executable
   - Solution: MIME type restriction enforced by bucket
   
4. **Storage Quota**: User uploads too many files
   - Solution: Monitor and implement user quotas (future)
   
5. **Deleted Message Files**: Message deleted but file remains
   - Solution: Cleanup job references messages table

6. **CORS Bypass Attempts**: Unauthorized domain access
   - Solution: Strict CORS policy + RLS enforcement

---

## 💡 **Implementation Notes**

### **Signed URL Generation (Frontend Code)**
```typescript
// Generate signed URL for viewing
const { data, error } = await supabase.storage
  .from('message-attachments')
  .createSignedUrl(filePath, 3600); // 1 hour expiration
```

### **Upload Function (Frontend Code)**
```typescript
// Upload with proper path structure
const userId = (await supabase.auth.getUser()).data.user!.id;
const fileName = `${userId}/${conversationId}/${Date.now()}-${file.name}`;

const { data, error } = await supabase.storage
  .from('message-attachments')
  .upload(fileName, file);
```

### **Thumbnail Generation**
- Use `browser-image-compression` library (frontend)
- Generate 300px max dimension thumbnail
- Upload with `_thumb.jpg` suffix

---

## ✅ **Definition of Done**

- [ ] Bucket created and configured
- [ ] All 3 RLS policies active
- [ ] CORS configured and tested
- [ ] File uploads working from web/mobile
- [ ] Signed URLs working correctly
- [ ] File size and MIME type limits enforced
- [ ] Unauthorized access blocked
- [ ] Documentation complete
- [ ] Test suite passing
- [ ] Code reviewed and approved

---

**Story Status:** 📋 Ready for Implementation  
**Next Story:** [STORY 8.1.4 - Core Database Functions](./STORY_8.1.4_Core_Database_Functions.md)
