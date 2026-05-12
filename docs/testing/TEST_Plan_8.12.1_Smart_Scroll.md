# 🧪 Test Plan: STORY 8.12.1 - Smart Scroll Detection & Auto-Scroll

## Overview
This document outlines the testing procedures to verify the Smart Scroll Detection and Auto-Scroll features implemented in Story 8.12.1 for the messaging interface.

## Prerequisites
- **Test Environment:** Local dev server or staging.
- **Accounts:** Two active user accounts (Sender and Receiver) logged into the same conversation.
- **Device Types:** Desktop browser, mobile browser (or simulator), and native iOS/Android (via Capacitor) if applicable.

## Test Cases

### TC-8.12.1-1: Scroll Position Detection (`isAtBottom`)
**Goal:** Verify the system accurately detects when the user is at the bottom of the chat view.
1. Open a conversation with enough messages to require scrolling.
2. Scroll to the very bottom of the chat.
3. **Expected Result:** The `useScrollPosition` hook should register `isAtBottom === true`.
4. Scroll up past the 80px threshold.
5. **Expected Result:** The `useScrollPosition` hook should register `isAtBottom === false`.

### TC-8.12.1-2: Conditional Auto-Scroll (Receiver at Bottom)
**Goal:** Verify chat automatically scrolls down when new messages arrive *and* the user is already at the bottom.
1. **Receiver:** Open the conversation and scroll to the absolute bottom.
2. **Sender:** Send a message.
3. **Expected Result:** The Receiver's chat view smoothly auto-scrolls downward to reveal the newly arrived message without user intervention.

### TC-8.12.1-3: Conditional Auto-Scroll (Receiver Scrolled Up)
**Goal:** Verify chat does *not* auto-scroll when new messages arrive *and* the user is reading older history.
1. **Receiver:** Open the conversation and scroll up significantly (reading older messages).
2. **Sender:** Send a message.
3. **Expected Result:** The Receiver's viewport remains completely stable. The view does *not* snap to the bottom.

### TC-8.12.1-4: Sender Auto-Scroll (Optimistic UI)
**Goal:** Verify that sending a message always forces the view to the bottom, regardless of prior scroll position.
1. **Sender:** Open the conversation and scroll up into the history.
2. **Sender:** Type a message and hit "Send".
3. **Expected Result:** The chat view immediately auto-scrolls to the bottom to display the newly sent message, tracking the optimistic UI update before server confirmation.

### TC-8.12.1-5: Mobile Keyboard Preservation
**Goal:** Verify the scroll position adapts correctly when the mobile virtual keyboard is toggled.
1. **Mobile Tester:** Open a conversation and scroll to the bottom.
2. Tap the chat input field to open the virtual keyboard.
3. **Expected Result:** The viewport shrinks, but the scroll position adjusts so the latest messages remain visible just above the keyboard.
4. Dismiss the keyboard.
5. **Expected Result:** The viewport expands, and the scroll position adapts downwards to keep the latest messages visible.

### TC-8.12.1-6: Burst Throttling (Stress Test)
**Goal:** Verify the UI remains responsive during a rapid influx of messages.
1. **Receiver:** Open the conversation and scroll to the bottom.
2. **Sender:** Rapidly send 10-15 messages in quick succession (e.g., holding enter or using a script).
3. **Expected Result:** The Receiver's auto-scrolling debounces locally, preventing visual jitter. The scroll animation should feel smooth rather than spasmodic, eventually settling at the final message.
