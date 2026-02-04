# User Testing Guide - Story 12.6: Comments System 💬

This guide outlines the steps to verify the functionality of the new Comments System for products.

## 📋 Prerequisites
1.  Ensure you have run the **migration file**: `supabase/migrations/20260204_product_comments.sql`.
2.  Ensure you are **logged in** as a user (e.g., Test User 1).

---

## 🧪 Test Scenarios

### 1. Posting a Comment (Web Desktop)
- [ ] Open a product modal on Desktop.
- [ ] Locate the comment input at the bottom.
- [ ] Type a message (e.g., "This looks great!").
- [ ] Press **Post** or Enter.
- [ ] **Verify:** The comment appears **instantly** at the top of the list (Optimistic UI).
- [ ] **Verify:** The input field clears.
- [ ] **Verify:** The "No comments yet" message disappears if it was there.

### 2. Posting a Comment (Mobile View)
- [ ] Switch to Mobile View (Chrome Inspector or resize window <768px).
- [ ] Click a product to open the Mobile Modal.
- [ ] Scroll down to the Comments section.
- [ ] Type a comment in the input field.
- [ ] Press **Post**.
- [ ] **Verify:** The comment appears immediately in the preview list.
- [ ] **Verify:** The "X comments" count increases.

### 3. Real-Time Updates (The "Magic" Test) ✨
- [ ] Open the application in **two separate browser windows** (or one normal, one Incognito).
- [ ] Log in as **User A** in Window 1 and **User B** in Window 2.
- [ ] Open the **SAME product** in both windows.
- [ ] In Window 1 (User A), post a comment: "Hello from User A!"
- [ ] **Wa-lah!** Check Window 2.
- [ ] **Verify:** The new comment appears automatically in Window 2 **without refreshing**.

### 4. Character Limit & Validation
- [ ] Try to type a comment longer than 300 characters.
- [ ] **Verify:** The character counter turns **red** (e.g., "305/300").
- [ ] **Verify:** The **Post** button becomes disabled.
- [ ] Delete characters until under 300.
- [ ] **Verify:** The Post button becomes enabled again.
- [ ] Try to post an empty comment (just spaces).
- [ ] **Verify:** The Post button is disabled logic works.

### 5. Deleting Comments
- [ ] Find a comment **you** posted.
- [ ] Click/Tap the "..." (Options) icon next to it.
- [ ] Select **Delete**.
- [ ] **Verify:** The comment is removed from the list immediately.
- [ ] **Verify:** The total comment count decreases.

### 6. Reporting Comments (Mock)
- [ ] Find a comment posted by **another user**.
- [ ] Click/Tap the "..." (Options) icon.
- [ ] Select **Report**.
- [ ] **Verify:** A confirmation toast appears ("Comment reported. We will review it.").

### 7. Empty State
- [ ] Open a product that has NO comments.
- [ ] **Verify:** You see the "No comments yet. Be the first to say something!" empty state (Web) or simple "No comments" text (Mobile).
