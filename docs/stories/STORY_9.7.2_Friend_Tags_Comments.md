# Story 9.7.2: Friend Tags in Deal Comments

**Epic:** [EPIC 9.7: Friends & Deal Sharing Integration](../epics/EPIC_9.7_Friends_Deal_Sharing.md)  
**Priority:** 🟡 Medium  
**Estimated Time:** 1 day  
**MCP Usage:** 🧠 Context7 MCP (Medium)  
**Dependencies:** Epic 9.3 (Friends Module), Story 9.7.1 (Deal Sharing)  
**Status:** ✅ Completed

---

## 📋 Story Description

Enable users to @mention their friends in deal comments using an autocomplete interface. When a friend is tagged, they receive a notification and can click through to view the deal and comment.

---

## ✅ Acceptance Criteria

### UI Components
- [ ] @mention autocomplete in comment input
- [ ] Dropdown showing matching friends as user types
- [ ] Friend avatar and name in autocomplete suggestions
- [ ] Tagged friends highlighted in comment text
- [ ] Clickable tags that navigate to friend profile

### Functionality
- [ ] Trigger autocomplete on "@" character
- [ ] Filter friends by name as user types
- [ ] Insert friend mention on selection
- [ ] Extract mentioned user IDs from comment
- [ ] Send notification to tagged friends
- [ ] Store mentions in database
- [ ] Render mentions as clickable links

### Integration
- [ ] Works with existing comment system
- [ ] Integrates with notification system
- [ ] Mobile keyboard support
- [ ] Accessibility (screen readers)

---

## 🎨 Component Implementation

### File: `src/components/deals/CommentInput.tsx`

```typescript
import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useFriends } from '@/hooks/useFriends';
import { createComment, notifyMentionedUsers } from '@/services/commentService';
import toast from 'react-hot-toast';

interface CommentInputProps {
  dealId: string;
  onCommentAdded?: () => void;
}

export function CommentInput({ dealId, onCommentAdded }: CommentInputProps) {
  const [comment, setComment] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const { data: friends } = useFriends();

  // Filter friends for mentions
  const filteredFriends = friends?.filter((friend) =>
    friend.profile?.full_name?.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    friend.profile?.username?.toLowerCase().includes(mentionQuery.toLowerCase())
  ).slice(0, 5); // Limit to 5 suggestions

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async () => {
      const mentionedUserIds = extractMentions(comment);
      
      // Create comment
      const newComment = await createComment(dealId, comment);
      
      // Notify mentioned users
      if (mentionedUserIds.length > 0) {
        await notifyMentionedUsers(mentionedUserIds, dealId, newComment.id);
      }
      
      return newComment;
    },
    onSuccess: () => {
      setComment('');
      toast.success('Comment posted');
      queryClient.invalidateQueries({ queryKey: ['deal-comments', dealId] });
      onCommentAdded?.();
    },
    onError: () => {
      toast.error('Failed to post comment');
    },
  });

  // Extract user IDs from @mentions
  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const matches = [...text.matchAll(mentionRegex)];
    return matches.map((match) => match[2]);
  };

  // Handle text change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    setComment(value);

    // Check for @ mention trigger
    const textBeforeCursor = value.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      
      // Check if we're still in a mention (no space after @)
      if (!textAfterAt.includes(' ')) {
        setShowMentions(true);
        setMentionQuery(textAfterAt);
        setMentionPosition(lastAtIndex);
        setSelectedIndex(0);
        return;
      }
    }
    
    setShowMentions(false);
  };

  // Handle mention selection
  const selectMention = (friend: any) => {
    const beforeMention = comment.slice(0, mentionPosition);
    const afterMention = comment.slice(textareaRef.current?.selectionStart || 0);
    
    // Insert mention in markdown format: @[Name](user_id)
    const mentionText = `@[${friend.profile.full_name}](${friend.friend_id})`;
    const newComment = beforeMention + mentionText + ' ' + afterMention;
    
    setComment(newComment);
    setShowMentions(false);
    setMentionQuery('');
    
    // Focus back on textarea
    textareaRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showMentions || !filteredFriends || filteredFriends.length === 0) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < filteredFriends.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (filteredFriends[selectedIndex]) {
          selectMention(filteredFriends[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowMentions(false);
        break;
    }
  };

  const handleSubmit = () => {
    if (!comment.trim()) return;
    createCommentMutation.mutate();
  };

  return (
    <div className="relative">
      <div className="flex space-x-2">
        <Textarea
          ref={textareaRef}
          value={comment}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment... (type @ to mention friends)"
          rows={3}
          className="flex-1"
        />
        <Button
          onClick={handleSubmit}
          disabled={!comment.trim() || createCommentMutation.isPending}
          size="icon"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Mention Autocomplete Dropdown */}
      {showMentions && filteredFriends && filteredFriends.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-full max-w-sm bg-white border rounded-lg shadow-lg z-50">
          <div className="p-2 space-y-1">
            {filteredFriends.map((friend, index) => (
              <button
                key={friend.friend_id}
                onClick={() => selectMention(friend)}
                className={`w-full flex items-center space-x-3 p-2 rounded hover:bg-muted text-left ${
                  index === selectedIndex ? 'bg-muted' : ''
                }`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={friend.profile?.avatar_url} />
                  <AvatarFallback>
                    {friend.profile?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-sm">
                    {friend.profile?.full_name}
                  </div>
                  {friend.profile?.username && (
                    <div className="text-xs text-muted-foreground">
                      @{friend.profile.username}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### File: `src/components/deals/CommentText.tsx`

```typescript
import { Link } from 'react-router-dom';

interface CommentTextProps {
  text: string;
}

export function CommentText({ text }: CommentTextProps) {
  // Parse mentions and render as links
  const renderText = () => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      // Add mention as link
      const [fullMatch, name, userId] = match;
      parts.push(
        <Link
          key={match.index}
          to={`/profile/${userId}`}
          className="text-primary font-medium hover:underline"
        >
          @{name}
        </Link>
      );

      lastIndex = match.index + fullMatch.length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  return <span>{renderText()}</span>;
}
```

---

## 🛢 Database Schema

### File: `supabase/migrations/20250126_comment_mentions.sql`

```sql
-- Add mentions column to deal_comments table
ALTER TABLE deal_comments
ADD COLUMN IF NOT EXISTS mentioned_user_ids UUID[] DEFAULT '{}';

-- Index for querying mentions
CREATE INDEX IF NOT EXISTS idx_deal_comments_mentioned_users
  ON deal_comments USING GIN (mentioned_user_ids);

-- Function to notify mentioned users
CREATE OR REPLACE FUNCTION notify_comment_mentions()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_commenter_name TEXT;
  v_deal_title TEXT;
BEGIN
  -- Get commenter name
  SELECT full_name INTO v_commenter_name
  FROM profiles
  WHERE id = NEW.user_id;

  -- Get deal title
  SELECT title INTO v_deal_title
  FROM deals
  WHERE id = NEW.deal_id;

  -- Notify each mentioned user
  FOREACH v_user_id IN ARRAY NEW.mentioned_user_ids
  LOOP
    INSERT INTO notifications (user_id, type, title, message, data, route_to)
    VALUES (
      v_user_id,
      'comment_mention',
      'You were mentioned',
      v_commenter_name || ' mentioned you in a comment on "' || v_deal_title || '"',
      jsonb_build_object(
        'deal_id', NEW.deal_id,
        'comment_id', NEW.id,
        'commenter_id', NEW.user_id
      ),
      '/deals/' || NEW.deal_id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE TRIGGER trigger_notify_comment_mentions
  AFTER INSERT ON deal_comments
  FOR EACH ROW
  WHEN (array_length(NEW.mentioned_user_ids, 1) > 0)
  EXECUTE FUNCTION notify_comment_mentions();
```

---

## 🔧 Service Implementation

### File: `src/services/commentService.ts`

```typescript
import { supabase } from '@/lib/supabase';

export async function createComment(dealId: string, text: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Extract mentioned user IDs
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const matches = [...text.matchAll(mentionRegex)];
  const mentionedUserIds = matches.map((match) => match[2]);

  const { data, error } = await supabase
    .from('deal_comments')
    .insert({
      deal_id: dealId,
      user_id: user.id,
      content: text,
      mentioned_user_ids: mentionedUserIds,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function notifyMentionedUsers(
  userIds: string[],
  dealId: string,
  commentId: string
) {
  // Notifications are handled by database trigger
  // This function is kept for potential future enhancements
  return { success: true };
}
```

---

## 🧪 Testing Plan

### Manual Testing
1. **Type @ in Comment**
   - Start typing a comment
   - Type "@" character
   - Verify autocomplete dropdown appears

2. **Search Friends**
   - Type friend name after "@"
   - Verify list filters correctly
   - Test partial names

3. **Select Mention**
   - Use arrow keys to navigate
   - Press Enter to select
   - Verify mention inserted correctly

4. **Post Comment**
   - Post comment with mentions
   - Verify mentioned friend receives notification
   - Verify mention appears as link in comment

5. **Click Mention**
   - Click on @mention in comment
   - Verify navigates to friend profile

### Edge Cases
- [ ] Multiple mentions in one comment
- [ ] Mention at start/middle/end of comment
- [ ] Cancel mention (press Escape)
- [ ] No matching friends
- [ ] Very long friend names

---

## 🎯 MCP Integration

### Context7 MCP Usage

```bash
# Find existing comment system
warp mcp run context7 "find deal comment components"

# Analyze comment input implementation
warp mcp run context7 "analyze src/components/deals/CommentInput.tsx"
```

---

## ✅ Definition of Done

- [ ] Component implemented with autocomplete
- [ ] Database migration applied
- [ ] Trigger for notifications created
- [ ] Service functions implemented
- [ ] Mentions render as clickable links
- [ ] Keyboard navigation working
- [ ] Mobile support verified
- [ ] Manual testing completed

---

**Next Story:** [Story 9.7.3: Friend-Based Deal Recommendations](./STORY_9.7.3_Friend_Recommendations.md)
