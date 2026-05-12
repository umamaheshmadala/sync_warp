# 🧪 Test Plan: STORY 8.12.4 - Sticky Date Headers

## Overview
This document outlines the testing procedures to verify the Sticky Date Headers grouping and relative formatting logic implemented in Story 8.12.4.

## Prerequisites
- **Test Environment:** Local dev server or staging.
- **Data Requirement:** A conversation containing messages spanning several consecutive and distinct calendar dates (e.g., a message sent today, one sent yesterday, one sent 5 days ago, one sent 30 days ago).

## Test Cases

### TC-8.12.4-1: Date Grouping Logistics
**Goal:** Verify messages are cleanly separated into date-based arrays at hydration time.
1. Load a conversation spanning multiple days.
2. Scroll through the history.
3. **Expected Result:** Visually distinct separator blocks appear vertically isolating messages sent on different days. Day partitions never randomly split continuous streams of identical-day messages.

### TC-8.12.4-2: Relative Date Format Integrity 
**Goal:** Verify date blocks display intelligent localized relative text instead of raw timestamps.
1. Review the data separator blocks within recent message history.
2. **Expected Result:**
   - Messages sent within the last 24 hours (of the user's localized device clock) must render the string "Today".
   - Messages sent between 24-48 hours ago must render the string "Yesterday".
   - Messages sent e.g., 5 days ago must render "Tuesday" or similar localized relative variants up to a specific cutoff.
   - Older messages display a standard absolute localized format (e.g., "Feb 10, 2026").

### TC-8.12.4-3: Sticky Ceiling Confinement (Smooth Transitions)
**Goal:** Verify native CSS constraints seamlessly dock the date header to the top of the viewport frame during continuous scrolling.
1. Find a large partition of messages sent on a given day (e.g., a wall of "Today" messages).
2. Scroll upwards.
3. **Expected Result:** As the "Today" wrapper bubble hits the very top `y = 0` coordinate of the chat container, it effectively freezes/anchors (`position: sticky`) there. The user continues to aggressively scroll the message bubbles underneath it flawlessly yielding immense context.

### TC-8.12.4-4: Header Exchanging (Collision Override)
**Goal:** Verify a new scrolling day partition smoothly pushes the preceding one out of the docking bay.
1. Position a sticky date header (e.g., "Yesterday") at the top ceiling.
2. Scroll upwards until a *new* older date partition (e.g., "Tuesday") slides into view from off-screen above.
3. **Expected Result:** The "Tuesday" bubble collides seamlessly with the "Yesterday" bubble at `y = 0`, gracefully pushing the "Yesterday" bubble out of existence upward beyond the bounds, inheriting the top docking slot smoothly. There is zero layout flicker.
