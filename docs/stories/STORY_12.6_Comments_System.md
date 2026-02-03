# Story 12.6: Comments System

**EPIC**: [EPIC 12 - Instagram-Style Products](../epics/EPIC_12_Instagram_Style_Products.md)  
**Status**: 📋 Ready for Development  
**Priority**: P0  
**Estimate**: 8 points  

---

## User Story

**As a** user  
**I want to** comment on products and read others' comments  
**So that** I can ask questions and see community feedback  

---

## Scope

### In Scope
- Add comment to product
- View comments (paginated, 10 per load)
- Edit own comment (with "Edited" indicator)
- Delete own comment
- Business owner can delete any comment
- Comment character limit (300)
- Report/appeal comment (reuse Reviews system)
- Notification to business owner on new comment
- Notification to commenter when their comment gets a reply
- Real-time comment updates

### Out of Scope
- Nested replies (flat structure only)
- Comment pinning
- Comment reactions/likes
- @mentions in comments

---

## Technical Specifications

### Database Schema

```sql
CREATE TABLE product_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 300),
  is_edited BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE, -- For moderation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_product_comments_product ON product_comments(product_id);
CREATE INDEX idx_product_comments_user ON product_comments(user_id);
CREATE INDEX idx_product_comments_created ON product_comments(product_id, created_at DESC);

-- Denormalized count
ALTER TABLE products ADD COLUMN comment_count INTEGER DEFAULT 0;

-- Trigger for count
CREATE OR REPLACE FUNCTION update_product_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE products SET comment_count = comment_count + 1 WHERE id = NEW.product_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE products SET comment_count = comment_count - 1 WHERE id = OLD.product_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_comments_count_trigger
AFTER INSERT OR DELETE ON product_comments
FOR EACH ROW EXECUTE FUNCTION update_product_comment_count();
```

### RLS Policies

```sql
-- Anyone can read non-hidden comments
CREATE POLICY "Read visible comments"
ON product_comments FOR SELECT
USING (is_hidden = FALSE);

-- Users can insert their own comments
CREATE POLICY "Insert own comments"
ON product_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Update own comments"
ON product_comments FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete own comments OR business owner can delete any
CREATE POLICY "Delete comments"
ON product_comments FOR DELETE
USING (
  auth.uid() = user_id 
  OR auth.uid() IN (
    SELECT owner_id FROM businesses 
    WHERE id = (SELECT business_id FROM products WHERE id = product_id)
  )
);
```

---

## UI/UX Specifications

### Comments Section Layout

```
┌───────────────────────────────────────────┐
│ 💬 5 comments                              │
├───────────────────────────────────────────┤
│ ┌─────┐ John Smith            ⋮          │
│ │ 👤 │ Great product! Love it.            │
│ └─────┘ 2h ago                             │
├───────────────────────────────────────────┤
│ ┌─────┐ Sarah Lee (Edited)    ⋮          │
│ │ 👤 │ Is this available in blue?        │
│ └─────┘ 1h ago                             │
├───────────────────────────────────────────┤
│ ┌─────┐ Mike Chen             ⋮          │
│ │ 👤 │ Just ordered one, can't wait!     │
│ └─────┘ 30m ago                            │
├───────────────────────────────────────────┤
│         [Load more comments]               │
├───────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐   │
│ │ Add a comment...                    │   │
│ └─────────────────────────────────────┘   │
│                    [Post] (145/300)       │
└───────────────────────────────────────────┘
```

### Comment Actions Menu (⋮)

**For own comment:**
- Edit
- Delete

**For others' comments (as business owner):**
- Delete
- Report

**For others' comments (as regular user):**
- Report

### Character Counter
- Shows current/max: "145/300"
- Turns red when >280 characters
- Post button disabled at 0 or >300

---

## Acceptance Criteria

### Adding Comments
- [ ] User must be logged in to comment
- [ ] If not logged in, show login prompt
- [ ] Comment input has 300 character limit
- [ ] Character counter shows real-time count
- [ ] Post button disabled if empty or over limit
- [ ] After posting, comment appears at top of list
- [ ] Input field clears after successful post
- [ ] Optimistic update (show immediately)

### Viewing Comments
- [ ] Load 10 comments initially
- [ ] "Load more" button if >10 comments
- [ ] Comments sorted newest first
- [ ] Each comment shows: avatar, name, content, timestamp
- [ ] Edited comments show "(Edited)" label
- [ ] Timestamps are relative: "2h ago", "Yesterday"
- [ ] Real-time updates when new comments arrive

### Editing Comments
- [ ] User can edit their own comment
- [ ] Edit opens inline text input
- [ ] "Save" and "Cancel" buttons
- [ ] After save, "(Edited)" label appears
- [ ] `updated_at` timestamp updates

### Deleting Comments
- [ ] User can delete their own comment
- [ ] Business owner can delete any comment on their product
- [ ] Confirmation dialog: "Delete this comment?"
- [ ] After delete, comment removed from list
- [ ] Count decrements

### Reporting Comments
- [ ] "Report" option in menu for others' comments
- [ ] Opens report modal (reuse Reviews appeal system)
- [ ] Reasons: Spam, Inappropriate, Harassment, Other
- [ ] Submission creates entry in `content_appeals` table
- [ ] Toast: "Comment reported. We'll review it."

### Notifications
- [ ] Business owner notified on new comment
- [ ] Respects per-product notification toggle
- [ ] Notification format: "{User} commented on {Product}"
- [ ] Notification includes comment preview (50 chars)

---

## API Design

### Add Comment
```typescript
const addComment = async (productId: string, content: string) => {
  return supabase.from('product_comments').insert({
    product_id: productId,
    user_id: userId,
    content: content.trim()
  });
};
```

### Get Comments (Paginated)
```typescript
const getComments = async (productId: string, page: number = 0) => {
  const limit = 10;
  const offset = page * limit;
  
  return supabase
    .from('product_comments')
    .select(`
      id, content, is_edited, created_at, updated_at,
      user:profiles!user_id(id, full_name, avatar_url)
    `)
    .eq('product_id', productId)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
};
```

### Edit Comment
```typescript
const editComment = async (commentId: string, content: string) => {
  return supabase
    .from('product_comments')
    .update({ 
      content: content.trim(), 
      is_edited: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', commentId)
    .eq('user_id', userId);
};
```

### Delete Comment
```typescript
const deleteComment = async (commentId: string) => {
  return supabase
    .from('product_comments')
    .delete()
    .eq('id', commentId);
};
```

### Report Comment
```typescript
const reportComment = async (commentId: string, reason: string, details?: string) => {
  return supabase.from('content_appeals').insert({
    content_type: 'product_comment',
    content_id: commentId,
    reporter_id: userId,
    reason,
    details,
    status: 'pending'
  });
};
```

---

## Service Layer

### productCommentService.ts

```typescript
export const productCommentService = {
  add(productId: string, content: string): Promise<ServiceResponse<Comment>>;
  getList(productId: string, page?: number): Promise<ServiceResponse<Comment[]>>;
  edit(commentId: string, content: string): Promise<ServiceResponse<void>>;
  delete(commentId: string): Promise<ServiceResponse<void>>;
  report(commentId: string, reason: string, details?: string): Promise<ServiceResponse<void>>;
  subscribeToNew(productId: string, callback: (comment: Comment) => void): () => void;
};
```

---

## Component Structure

```
src/components/products/
├── ProductComments.tsx           # Main comments section
├── ProductCommentItem.tsx        # Single comment row
├── ProductCommentInput.tsx       # Add comment input
├── ProductCommentEditForm.tsx    # Inline edit form
├── ProductCommentMenu.tsx        # Actions dropdown
├── ProductCommentReportModal.tsx # Report dialog (or reuse existing)
└── hooks/
    └── useProductComments.ts     # Comments state management
```

---

## Real-time Subscription

```typescript
// Subscribe to new comments
const channel = supabase
  .channel(`product-comments-${productId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'product_comments',
      filter: `product_id=eq.${productId}`
    },
    (payload) => {
      // Add new comment to list
      addCommentToList(payload.new);
    }
  )
  .subscribe();
```

---

## Testing Checklist

- [ ] Add comment (appears in list)
- [ ] Add comment at character limit (300)
- [ ] Try to exceed limit (blocked)
- [ ] Edit own comment (shows Edited)
- [ ] Delete own comment (removed)
- [ ] Business owner deletes others' comment
- [ ] Report a comment (shows confirmation)
- [ ] Load more comments (pagination)
- [ ] Real-time: new comment appears without refresh
- [ ] Logged out user sees login prompt
- [ ] Character counter works correctly
- [ ] Timestamps display correctly
- [ ] Business owner receives notification

---

## Dependencies

- [ ] Content appeals system (Reviews module)
- [ ] Notification service
- [ ] Profiles table for user info
- [ ] Story 12.11 for notification toggle
