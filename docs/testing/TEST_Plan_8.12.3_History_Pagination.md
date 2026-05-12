# 🧪 Test Plan: STORY 8.12.3 - History Pagination & Anchor Maintenance

## Overview
This document outlines the testing procedures to verify the History Pagination with Scroll Anchor Maintenance features implemented in Story 8.12.3.

## Prerequisites
- **Test Environment:** Local dev server or staging.
- **Data Requirement:** A conversation with at least 150-200 messages to ensure multiple pagination pages exist.

## Test Cases

### TC-8.12.3-1: Pagination Trigger (Intersection Observer)
**Goal:** Verify scrolling to the top apex automatically triggers the fetch for older messages.
1. Open a conversation with deep history (e.g., 200+ messages).
2. Scroll to the absolute top of the current message list container.
3. **Expected Result:** Upon hitting the ceiling, a loading state (spinner or indicator) briefly appears at the top. The Tanstack Query `loadOlderMessages` function is transparently triggered in the background.

### TC-8.12.3-2: Pixel-Perfect Scroll Anchor Stability
**Goal:** Verify a batch of older messages prepending to the DOM does NOT shift the user's reading position.
1. Scroll upwards continuously until the top is reached.
2. Carefully note the exact message bubble visible at the very top edge of the screen. Keep your eyes locked on it.
3. Allow the pagination fetch to trigger.
4. **Expected Result:** When the batch of 50 older messages suddenly mounts above your viewport natively, the message you were staring at holds its pixel coordinates perfectly. There is zero Layout Shift; the view does not violently yank upwards. React Virtuoso seamlessly manages the anchor.

### TC-8.12.3-3: Query Deduplication (No Double Fetching)
**Goal:** Verify rapid scrolling or bouncing at the top apex does not spam duplicate network requests.
1. Open the browser Network tab.
2. Scroll to the top apex of the chat.
3. While the initial fetch is still resolving (network pending status), vigorously swipe/scroll downwards against the top edge multiple times to aggressively trigger the `IntersectionObserver`.
4. **Expected Result:** Only a *single* pagination network request is dispatched. React Query's `isFetching` lock correctly suppresses all subsequent parallel triggers until the first fetch resolves flawlessly.

### TC-8.12.3-4: End of History Resolution 
**Goal:** Verify scrolling to the start of the conversation stops further pagination logic.
1. Scroll to the absolute top of the message history (Message index 1, the very first message ever sent in the chat).
2. The UI attempts a final fetch.
3. **Expected Result:** The backend returns an empty array or signal signifying no more data. The `hasMoreMessages` boolean flag permanently locks the `IntersectionObserver`. Subsequent scrolls against the top ceiling yield absolutely no network activity and no loading spinners.
