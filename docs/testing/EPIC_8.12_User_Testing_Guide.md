# 🧪 Epic 8.12: Chat Scroll UX — User Testing Guide

**Date:** February 18, 2026  
**Tester:** _______________  
**Platform tested:** Web / iOS / Android _(circle one)_  
**Browser/Device:** _______________

> **Prerequisites for all tests:**
> 1. Dev server running (`npm run dev`)
> 2. Two user accounts logged in (use separate browser tabs/devices)
> 3. A conversation between the two users with **50+ messages** spanning **multiple days**
> 4. At least **2–3 image messages** sent in the conversation

---

## Story 8.12.1: Smart Scroll Detection & Auto-Scroll

### Test 1.1 — Bottom Detection (AC#1)
**Steps:**
1. Open a conversation
2. Scroll to the very bottom of the chat
3. Observe the console (DevTools → Console)

**Expected:** System reports `isAtBottom = true` when within ~80px of the bottom.

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

### Test 1.2 — Auto-Scroll on New Message (At Bottom) (AC#2)
**Steps:**
1. Open the conversation and ensure you're at the **very bottom**
2. From the **other user's account** (second tab), send a message
3. Observe the first user's chat

**Expected:** The chat smoothly auto-scrolls to show the new message. No manual scrolling needed.

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

### Test 1.3 — No Auto-Scroll When Scrolled Up (AC#3)
**Steps:**
1. Open the conversation
2. **Scroll up** at least 3–4 screens worth of messages
3. Note which message is currently at the top of your viewport
4. From the other user's account, send **3 messages** rapidly

**Expected:** The chat does **NOT** auto-scroll. The message you were looking at stays in the exact same position. No jumping at all.

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

### Test 1.4 — Auto-Scroll on Own Message Send (AC#4)
**Steps:**
1. Open the conversation
2. Scroll **up** 3–4 screens
3. Type and send a message

**Expected:** The chat immediately scrolls to the bottom, showing your newly sent message — even though you were scrolled up.

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

### Test 1.5 — Default Loading Position (AC#6)
**Steps:**
1. Navigate away from the conversation (go to the messages list)
2. Tap/click back into the conversation

**Expected:** The conversation opens at the **very bottom** showing the most recent messages.

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

### Test 1.6 — Keyboard Interaction (AC#5) _(Web only)_
**Steps:**
1. At the bottom of the chat, click the message input to focus it
2. If on a mobile device/emulator, observe when the keyboard appears

**Expected:** The viewport adjusts so you remain at the bottom. No messages get hidden behind the keyboard.

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

## Story 8.12.2: Unread Badge & Scroll-to-Bottom FAB

### Test 2.1 — FAB Appears on Scroll Up (AC#1)
**Steps:**
1. Open a conversation and scroll to the bottom
2. Scroll **up** beyond 100px
3. From the other user's account, send 1 message

**Expected:** A floating circular button (↓) appears at the bottom-right of the chat area.

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

### Test 2.2 — Unread Counter Badge (AC#2)
**Steps:**
1. While still scrolled up from Test 2.1, have the other user send **3 more messages**

**Expected:** The FAB now shows a badge with the number **4** (or total messages received while scrolled up). The counter updates in real-time with each new message.

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

### Test 2.3 — Tap FAB to Scroll (AC#3)
**Steps:**
1. While the FAB with a counter badge is visible, **tap/click the FAB**

**Expected:**
- Chat smoothly scrolls to the very bottom
- The badge counter resets to 0
- The FAB disappears

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

### Test 2.4 — Auto-Dismiss on Manual Scroll (AC#4)
**Steps:**
1. Scroll up again so the FAB appears (no need for new messages this time — just scroll up)
2. **Manually scroll back down** to the bottom

**Expected:** The FAB disappears automatically when you reach the bottom.

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

### Test 2.5 — FAB Doesn't Overlap Composer (AC#5)
**Steps:**
1. Trigger the FAB (scroll up, receive a message)
2. Observe the FAB position relative to the message composer (input field)

**Expected:** The FAB is positioned **above** the composer. It does not overlap the input field or cover any UI controls.

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

### Test 2.6 — Jump to Reply (AC#6)
**Steps:**
1. Find a **reply message** (a message that quotes another message) in the conversation
2. If none exists, send a reply: long-press a message → Reply → type and send
3. Tap the **quoted/reply preview** in the reply message

**Expected:**
- Chat scrolls to the original quoted message
- The original message **highlights/flashes** briefly (~1 second fade animation)
- If the quoted message was off-screen, it loads and scrolls into view

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

### Test 2.7 — Jump to Reply for Distant Message (AC#6 — Fetch-Around)
**Steps:**
1. Ensure the conversation has **100+ messages**
2. Scroll to the bottom
3. Send a **reply to a very old message** (scroll up, find an old message, long-press → Reply, then scroll back to bottom and send the reply)
4. Tap the reply preview in your just-sent message

**Expected:** The chat fetches the old message (which was not loaded in the DOM), scrolls to it, and highlights it with a flash animation.

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

## Story 8.12.3: History Pagination & Anchor Maintenance

### Test 3.1 — Auto-Load Older Messages (AC#1)
**Steps:**
1. Open a conversation with **50+ messages**
2. Scroll up slowly toward the top of the loaded messages
3. Watch for a loading spinner as you approach the top

**Expected:** When you get close to the top (~200px), a loading spinner appears and older messages are loaded automatically.

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

### Test 3.2 — Scroll Anchor Maintenance — THE Critical Test (AC#2)
**Steps:**
1. Scroll up until older messages load (from Test 3.1)
2. **Before the load starts**, note the exact message at the **top edge of your viewport**
3. Watch what happens when the new batch of older messages appears above

**Expected:** The message you were reading stays in **exactly the same visual position**. There should be **zero jump/shift** despite 50 new messages being added above. This is the most important test — try scrolling up to trigger 2–3 more loads and verify the anchor holds every time.

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

### Test 3.3 — No Double Fetch (AC#3)
**Steps:**
1. While scrolling up, trigger a load of older messages
2. **Immediately keep scrolling up** fast while messages are still loading

**Expected:** Only **one** fetch request fires. No duplicate API calls. The spinner shows but doesn't trigger a second batch until the first one completes.

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

### Test 3.4 — End of History (AC#4)
**Steps:**
1. In a conversation with a **small number of messages** (or scroll all the way to the very top of a long conversation)
2. Continue scrolling up past the first message

**Expected:** No further fetches happen. Optionally, a "Start of conversation" label may appear. No spinner reappears.

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

### Test 3.5 — Smooth Loading UX (AC#5)
**Steps:**
1. Scroll up to trigger older message loading
2. Observe the loading indicator

**Expected:** A small, unobtrusive loading spinner appears at the **top** of the message list. It does **NOT** push existing messages down while visible.

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

## Story 8.12.4: Sticky Date Headers

### Test 4.1 — Date Bubble Visibility (AC#1)
**Steps:**
1. Open a conversation with messages spanning **multiple dates**
2. Scroll up through the messages

**Expected:** A small rounded "Date Bubble" appears at the top-center of the chat showing the date of the messages currently on screen (e.g., "Today", "Yesterday", "Feb 14, 2026").

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

### Test 4.2 — Smooth Date Transition (AC#2)
**Steps:**
1. Scroll up slowly past a date boundary (e.g., from "Today" to "Yesterday")

**Expected:** The sticky date header smoothly transitions to show the new date. No layout shift or flicker. The "push" transition between date headers is visually smooth.

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

### Test 4.3 — Relative Date Labels (AC#3)
**Steps:**
1. Scroll through messages from different dates
2. Observe the date labels for:
   - Today's messages
   - Yesterday's messages
   - Messages from 3–4 days ago
   - Messages from more than 7 days ago

**Expected:**
- Today → shows "Today"
- Yesterday → shows "Yesterday"
- 3 days ago → shows day name (e.g., "Saturday")
- 8+ days ago → shows full date (e.g., "February 10, 2026")

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

### Test 4.4 — Visibility When All Same Date (AC#4)
**Steps:**
1. Scroll within messages that are all from the **same date** (e.g., all "Today")
2. Observe the date header at the top

**Expected:** The date header still shows (semi-transparent or normal) showing the current date group label. It should fade in/out gracefully, not appear/disappear abruptly.

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

### Test 4.5 — Non-Interactive (AC#5)
**Steps:**
1. While the date bubble is visible, try to tap/click on it

**Expected:** Nothing happens. The date bubble is purely informational — no action, tooltip, or navigation occurs.

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

## Story 8.12.5: Media Placeholders & Zero Layout Shift

### Test 5.1 — Placeholder Dimensions (AC#1)
**Steps:**
1. Open Chrome DevTools → Network tab
2. Set throttling to **"Slow 3G"**
3. Open a conversation that contains image messages
4. Observe the image area **before** the image fully loads

**Expected:** A placeholder (grey skeleton shimmer or blurred thumbnail) appears with the **correct aspect ratio** matching the final image. The placeholder is not a tiny dot or full-width strip.

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

### Test 5.2 — Zero Layout Shift (AC#2)
**Steps:**
1. Keep the network throttled to "Slow 3G"
2. Scroll to a position where an image message is **near** but not yet loaded
3. Watch the messages **above and below** the image as the image finishes loading

**Expected:** When the image replaces the placeholder, the surrounding messages do **NOT shift** position. Zero jump, zero pixel change. The image slots perfectly into the space the placeholder reserved.

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

### Test 5.3 — Aspect Ratio Preservation (AC#3)
**Steps:**
1. Send an image with a known aspect ratio (e.g., a landscape photo — 16:9)
2. Observe the image message in the chat

**Expected:** The image renders maintaining its original aspect ratio, constrained within the message bubble width (max ~300px). A 16:9 photo should appear wide, a portrait photo should appear tall.

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

### Test 5.4 — Fallback for Unknown Dimensions (AC#4)
**Steps:**
1. If there are any legacy messages or external images without stored width/height metadata, observe how they render
2. Alternatively, check any image where the server doesn't provide dimension data

**Expected:** A default fallback placeholder renders at approximately 280×200 pixels (~4:3 aspect ratio). When the actual image loads, the transition is smooth (no jarring jump).

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

### Test 5.5 — Blur-to-Clear Transition (AC#5)
**Steps:**
1. Keep network throttled to "Slow 3G"
2. Scroll to an image message that has a thumbnail (most sent images should)
3. Watch the image loading sequence carefully

**Expected:** 
- First, a **blurred thumbnail** appears (low-res, blurry)
- When the full-resolution image loads, it **sharpens into view** with a smooth ~300ms transition from blur to clear
- No abrupt switch from placeholder to image

| Result | ☐ Pass | ☐ Fail |
|--------|--------|--------|
| Notes: | | |

---

## Summary

| Story | Tests | Passed | Failed |
|-------|-------|--------|--------|
| 8.12.1 Smart Scroll | 6 | __ / 6 | __ / 6 |
| 8.12.2 FAB & Badge | 7 | __ / 7 | __ / 7 |
| 8.12.3 Pagination | 5 | __ / 5 | __ / 5 |
| 8.12.4 Sticky Dates | 5 | __ / 5 | __ / 5 |
| 8.12.5 Media Placeholders | 5 | __ / 5 | __ / 5 |
| **Total** | **28** | **__ / 28** | **__ / 28** |

**Overall Verdict:** ☐ All Passed — Ready for ✅ | ☐ Issues Found — Return to Dev

**Tester Signature:** _______________  
**Date:** _______________
