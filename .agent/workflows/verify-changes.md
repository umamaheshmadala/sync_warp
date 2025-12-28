---
description: Verification checklist to run after making code changes to prevent breaking other modules
---

# Post-Change Verification Workflow

// turbo-all

This workflow should be followed after making any code changes, especially to shared components.

## 1. Build Verification
```bash
npm run build
```
This catches TypeScript errors and compilation issues.

## 2. Smoke Test Checklist

After changes to **shared UI components** (`src/components/ui/`), verify ALL modules:

### Friends Module
- [ ] View friends list (`/friends`)
- [ ] Open friend profile modal
- [ ] Send/accept/reject friend request
- [ ] Block/unblock user
- [ ] Unfriend user

### Messages Module
- [ ] View conversations list (`/messages`)
- [ ] Open a conversation
- [ ] Send a message
- [ ] Message input visible and working
- [ ] Delete conversation

### Profile Module
- [ ] View own profile (`/profile`)
- [ ] Edit profile
- [ ] View other user's profile modal

### Deals/Business Module
- [ ] View deals list (`/deals`)
- [ ] Open deal details
- [ ] Like/save/share deal

### Navigation
- [ ] Bottom navigation works
- [ ] All routes accessible

## 3. Component Impact Matrix

When editing these files, verify the corresponding modules:

| File Changed | Modules to Test |
|--------------|-----------------|
| `dialog.tsx` | ALL modals (Friends, Profile, Deals, Settings) |
| `button.tsx` | ALL pages |
| `dropdown-menu.tsx` | Profile modal, Settings, Navigation |
| `input.tsx` | Messages, Search, Forms |
| `card.tsx` | Friends, Deals, Business profiles |

## 4. Browser Testing
- [ ] Test in Chrome
- [ ] Test in mobile viewport (responsive)
- [ ] If applicable, test in alternative browsers (Safari, Firefox)

## 5. Quick Commands
```bash
# Full verification
npm run build && npm run dev

# Run existing tests (if available)
npm run test
```
