# Story 8.3.4 Part 2: Coupon Sharing via Messaging Integration

**Epic:** 8.3 - Sharing & Viral Growth  
**Parent Story:** 8.3.4 - Coupon/Deal Sharing Integration  
**Status:** Planning  
**Priority:** High  
**Estimated Effort:** 3-5 days

## Overview

Integrate coupon sharing with the messaging system to create a permanent, rich media record of all coupon shares between users. When a user shares a coupon via the Share Modal, the system should automatically create a WhatsApp-style rich media message in the conversation with the recipient.

## User Story

**As a** SynC user  
**I want** my coupon shares to appear as rich media messages in my conversations  
**So that** I can refer back to what coupons I've shared with friends and have a permanent record of the transaction

## Business Value

- **Improved UX**: Users can easily reference past coupon shares in their message history
- **Trust & Transparency**: Both parties have a permanent record of the coupon transfer
- **Engagement**: Rich media messages are more engaging than plain notifications
- **Context**: Coupon shares become part of the conversation flow, allowing replies and discussion

## Acceptance Criteria

### 1. Share Modal Integration

- [ ] When a user shares a coupon via the Share Modal, a message is automatically created in the conversation with the recipient
- [ ] The Share Modal closes after successful share
- [ ] User is navigated to the messaging screen showing the sent coupon message
- [ ] The message appears for both sender and recipient

### 2. Rich Media Message Display

- [ ] Coupon messages display as rich media cards (similar to WhatsApp link previews)
- [ ] Card shows: Coupon image/brand logo, title, discount value, expiry date
- [ ] Card has a distinct visual style to differentiate from regular link previews
- [ ] Message is replyable by both sender and recipient

### 3. Message Type & Data Structure

- [ ] New message type: `coupon_shared` (or extend existing link preview system)
- [ ] Message metadata includes: `coupon_id`, `collection_id`, `sender_id`, `recipient_id`
- [ ] Message is stored in the `messages` table with proper foreign key relationships

### 4. Ownership Transfer Enforcement

- [ ] Coupon sharing via URL links in Message Composer is **disabled**
- [ ] Only the Share Modal can trigger coupon ownership transfer
- [ ] Attempting to paste a coupon URL in the composer shows a message: "Please use the Share button to share coupons"

### 5. Navigation & UX

- [ ] After sharing, user is taken to the conversation with the recipient
- [ ] The newly created coupon message is visible and highlighted
- [ ] Success toast confirms the share and message creation

## Technical Requirements

### Database Changes

- Extend `messages` table to support `coupon_shared` message type (or use existing `link_previews` JSONB)
- Ensure `send_message` RPC can handle coupon share messages

### Backend (RPC Functions)

- Update `log_coupon_share` to accept `conversation_id` parameter
- Create message record as part of the coupon share transaction
- Ensure atomicity: if message creation fails, rollback the coupon transfer

### Frontend Components

- **ShareCouponModal**: Add conversation creation/retrieval logic
- **MessageBubble**: Extend to render coupon share messages with rich media card
- **LinkPreviewCard**: Extend or create variant for coupon shares
- **MessageComposer**: Add validation to block coupon URL sharing

### Services

- **messagingService**: Add `sendCouponShareMessage()` method
- **sharingLimitsService**: Update `shareWithLimitValidation()` to create message

## Design Specifications

### Coupon Share Message Card

```
┌─────────────────────────────────────┐
│ [Coupon Icon] Coupon Shared         │
├─────────────────────────────────────┤
│  ┌─────────┐                        │
│  │ [Image] │  Burger Special - 30% Off│
│  │         │  Valid until: Dec 15, 2025│
│  └─────────┘  TU1 Test Business 1   │
│                                      │
│  "You received this coupon!"        │
└─────────────────────────────────────┘
```

## Dependencies

- Story 8.3.4 (Coupon Sharing Integration) - **Must be complete**
- Story 8.3.3 (Link Preview Generation) - **Leverages existing infrastructure**
- Story 8.2.7 (Message Sending & Receiving) - **Extends messaging system**

## Out of Scope (Phase 2)

- Coupon status updates in messages (e.g., "Redeemed", "Expired")
- Ability to re-share received coupons from the message
- Analytics on coupon shares via messaging

## Testing Checklist

### Unit Tests

- [ ] `sendCouponShareMessage()` creates message with correct metadata
- [ ] `log_coupon_share` creates both coupon transfer and message record
- [ ] Message Composer blocks coupon URL sharing

### Integration Tests

- [ ] Share coupon via Share Modal → Message appears in conversation
- [ ] Both sender and recipient see the coupon message
- [ ] Navigation to messaging screen works correctly
- [ ] Coupon ownership transfer and message creation are atomic

### Manual Testing

- [ ] Share coupon from Test User 1 to Test User 2
- [ ] Verify message appears in conversation for both users
- [ ] Verify rich media card displays correctly
- [ ] Reply to the coupon message and verify it works
- [ ] Attempt to paste coupon URL in composer and verify it's blocked

## Implementation Notes

- Use existing `link_previews` JSONB structure in messages table to avoid schema changes
- Set `link_preview.type = 'coupon_shared'` to differentiate from regular link previews
- Reuse `LinkPreviewCard` component with a new variant for coupon shares
- Ensure `send_message` RPC is called within the `log_coupon_share` transaction for atomicity

## Success Metrics

- 100% of coupon shares via Share Modal create a corresponding message
- Users can successfully reply to coupon share messages
- Zero instances of coupon sharing via URL links in Message Composer
- Navigation to messaging screen after share has <2s latency

---

**Created:** December 3, 2025  
**Last Updated:** December 3, 2025  
**Author:** Development Team
