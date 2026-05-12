# 🧪 Test Plan: STORY 8.12.5 - Media Placeholders & Zero Layout Shift

## Overview
This document outlines the testing procedures to verify the image Placeholder constraints and intrinsic layout shift prevention mechanisms implemented in Story 8.12.5.

## Prerequisites
- **Test Environment:** Local dev server running with browser developer tools enabled.
- **Accounts:** Two active user accounts logged into the same conversation.
- **Data Requirement:** Several JPG/PNG test image files with varying aspect ratios (Square 1:1, Landscape 16:9, Portrait 9:16).

## Test Cases

### TC-8.12.5-1: Intrinsic Data Harvesting (Upload Pipeline)
**Goal:** Verify sending an image reliably extracts and saves the native pixel dimensions client-side.
1. **Sender:** Attach a heavy 4K test image (e.g., exactly `3840x2160` resolution) and send it over the chat UI.
2. Check the browser Network Tab / inspect the active WebSocket/HTTP payload to the backend database.
3. **Expected Result:** The payload explicitly captures the source geometry properties. The `media_width` property should intrinsically equal `3840` and `media_height` should equal `2160`.

### TC-8.12.5-2: Pre-Rendered Viewport Blockers (Placeholders)
**Goal:** Verify `MediaPlaceholder` components instantaneously mount mathematically accurate aspect-ratio skeletal wrappers onto the DOM.
1. Enable browser Network Throttling (e.g., artificially throttle to Slow 3G).
2. **Sender:** Send an image with a specific portrait aspect ratio (e.g., 9:16).
3. Wait for the realtime database webhook to synchronize down to the local client *before* the huge image payload bytes finish streaming globally.
4. **Expected Result:** The target bubble should instantly spawn an empty grey/shimmering block in the chat timeline. Evaluating this block proves its layout aspect ratio evaluates strictly to exactly 9-to-16 proportional constraints derived purely from backend dimensions.

### TC-8.12.5-3: Zero-CLS Mitigation (Thwart Layout Shift)
**Goal:** Verify image byte hydration completing locally does not alter the DOM geometry height mid-read.
1. Continuing from the throttled 3G environment under TC-8.12.5-2.
2. Wait patiently (10+ seconds) staring intently at the message timeline position immediately *below* the empty media placeholder.
3. The image bytes finally conclude downloading completely, and the actual `<img>` visually injects over top of the placeholder wrapper.
4. **Expected Result:** The content below the image does absolutely not shift, jolt, or resize. The layout is 100% mathematically cemented in place at `0.0 CLS` (Cumulative Layout Shift) perfectly pre-empting the delivery. 

### TC-8.12.5-4: Non-Standard Dimension Fallbacks
**Goal:** Verify legacy messages lacking structural dimensions fallback gracefully.
1. Manually inject a legacy message payload into the backend missing any `media_width` or `media_height` schema keys, yet referencing a valid image URL.
2. Refresh the chat interface on the local frontend to hydrate.
3. **Expected Result:** The client handles the missing mathematical data flawlessly by evaluating a static hardcoded placeholder dimension (e.g., 200x200 placeholder). When the heavy image actually resolves moments later, it simply pops natively overtop the generic box overriding the dimension smoothly. The app does not crash evaluating NaN constraints.
