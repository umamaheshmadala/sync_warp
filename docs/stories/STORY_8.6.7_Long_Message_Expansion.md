# Story 8.6.7: Long Message Text Expansion (Read More)

**Epic:** 8.6 - Push Notifications & Real-Time Updates  
**Priority:** Medium  
**Story Points:** 3

## User Story

As a user, I want long text messages to be truncated with a "Read more" button so that the chat interface remains clean and scannable, just like WhatsApp.

## Acceptance Criteria

- [ ] Messages longer than 7 lines are truncated with ellipsis
- [ ] "Read more" button appears below truncated messages
- [ ] Tapping "Read more" expands the message smoothly
- [ ] Expansion animation is smooth (250ms)
- [ ] Only text messages are affected (not images/videos)
- [ ] Expanded state persists while scrolling within the same chat session

## Technical Implementation

### Detection Logic

```typescript
// Measure actual rendered height
const MAX_COLLAPSED_HEIGHT = 140; // 7 lines × 20px
if (textRef.current.scrollHeight > MAX_COLLAPSED_HEIGHT) {
  setNeedsReadMore(true);
}
```

### CSS Line Clamping

```css
.collapsed {
  display: -webkit-box;
  -webkit-line-clamp: 7;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-height: 140px;
}
```

### State Management

- `isExpanded`: Boolean state for each message
- `needsReadMore`: Determined on mount via useEffect
- `textRef`: Ref to measure actual text height

## WhatsApp Parity

✅ Matches WhatsApp's 7-line threshold  
✅ Uses same CSS line-clamp technique  
✅ Smooth expand animation  
✅ "Read more" button positioning

## Files Affected

- `src/components/messaging/MessageBubble.tsx` - Add expansion logic
- No new files needed

## Testing

1. Send a message with 50 lines of text
2. Verify it's truncated to 7 lines
3. Verify "Read more" button appears
4. Tap button and verify smooth expansion
5. Verify short messages (< 7 lines) don't show button
6. Test in both light and dark modes

## Dependencies

- None

## Notes

- Only applies to `type: 'text'` messages
- Image captions are not affected
- State does not persist across chat navigation (resets on return)
