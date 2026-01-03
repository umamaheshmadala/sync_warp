---
description: Run smoke tests to verify core app functionality after changes
---

# Smoke Test Workflow

// turbo-all

Run this workflow to quickly verify that core app features are working after making changes.

## Prerequisites
Ensure dev server is running:
```bash
npm run dev
```

## Test Steps

### 1. Test Friends Module
1. Navigate to http://localhost:5173/friends
2. Click on a friend card to open profile modal
3. Verify buttons are visible and clickable (Message, Unfriend, Share)
4. Click the three-dot menu and verify Block option appears
5. Close the modal

### 2. Test Messages Module
1. Navigate to http://localhost:5173/messages
2. Click on a conversation
3. Type a message and send it
4. Verify message appears in the chat
5. Return to conversation list

### 3. Test Profile Module
1. Navigate to http://localhost:5173/profile
2. Verify profile information displays correctly
3. Click Edit if available
4. Verify edit form/modal opens

### 4. Test Navigation
1. Verify bottom navigation bar is visible
2. Click each navigation item and verify page loads
3. Test back button functionality

## Expected Results
- All pages load without errors
- All modals open and close correctly
- All buttons are visible and clickable
- No console errors in browser dev tools

## If Tests Fail
1. Check browser console for errors
2. Review recent code changes
3. Run `npm run build` to check for TypeScript errors
4. Revert problematic changes if needed with `git checkout <file>`
