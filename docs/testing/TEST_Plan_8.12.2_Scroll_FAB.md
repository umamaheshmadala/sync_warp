# 🧪 Test Plan: STORY 8.12.2 - Scroll-to-Bottom FAB & Unread Badge

## Overview
This document outlines the testing procedures to verify the Scroll-to-Bottom Floating Action Button (FAB) and Unread Badge features implemented in Story 8.12.2.

## Prerequisites
- **Test Environment:** Local dev server or staging.
- **Accounts:** Two active user accounts (Sender and Receiver) logged into the same conversation.

## Test Cases

### TC-8.12.2-1: FAB Visibility (Scrolling Up)
**Goal:** Verify the FAB appears only when the user scrolls away from the most recent messages.
1. Open a conversation with sufficient history.
2. Ensure you are at the absolute bottom of the chat.
3. **Expected Result:** The FAB is hidden.
4. Scroll upwards slowly.
5. **Expected Result:** The FAB fluidly appears (Framer Motion animation) once the view leaves the bottom threshold.

### TC-8.12.2-2: FAB Interaction (Scroll to Bottom)
**Goal:** Verify tapping the FAB returns the user to the newest messages.
1. Scroll up into the chat history so the FAB is visible.
2. Click/Tap the FAB.
3. **Expected Result:** The `react-virtuoso` viewport smoothly resets back to the absolute bottom index, displaying the most recent message. The FAB then hides itself.

### TC-8.12.2-3: Unread Badge Accumulation
**Goal:** Verify the FAB accurately tracks incoming messages while the user is scrolled up.
1. **Receiver:** Scroll up in the conversation (FAB appears).
2. **Sender:** Send 1 message.
3. **Expected Result:** The Receiver's FAB displays a badge with the number "1".
4. **Sender:** Send 4 more messages.
5. **Expected Result:** The Receiver's FAB badge updates to "5".

### TC-8.12.2-4: Unread Badge Cap (99+)
**Goal:** Verify the badge caps cleanly at 99+.
1. **Receiver:** Scroll up in the conversation.
2. **Sender:** Send 100+ messages (use a script or database injection for speed).
3. **Expected Result:** The Receiver's FAB badge displays "99+".

### TC-8.12.2-5: Badge Clearing on FAB Interaction
**Goal:** Verify returning to the bottom clears the unread count.
1. **Receiver:** Have an active unread badge on the FAB (e.g., "3").
2. Tap the FAB.
3. **Expected Result:** The view jumps to the bottom, the FAB hides, and the local unread count is cleared.

### TC-8.12.2-6: Jump to Reply Context
**Goal:** Verify clicking a quoted reply fetches history and jumps to the target message off-screen.
1. **User A:** Send an initial message ("Target Message").
2. **User B:** Send 60+ messages to push "Target Message" far off-screen.
3. **User A:** Reply specifically to "Target Message" quoting it.
4. **User B:** Click on the quoted "Target Message" inside User A's new reply bubble.
5. **Expected Result:** 
   - A background RPC fetch (`fetchMessagesAround`) triggers.
   - The local cache updates.
   - Virtuoso natively jumps the viewport up to the exact index of the original "Target Message" effortlessly, highlighting it briefly.
