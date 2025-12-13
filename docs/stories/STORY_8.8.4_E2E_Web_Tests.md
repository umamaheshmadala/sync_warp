# 🧪 STORY 8.8.4: E2E Web Testing (Playwright)

**Parent Epic:** [EPIC 8.8 - Testing & QA](../epics/EPIC_8.8_Testing_QA.md)
**Priority:** P1 - High
**Estimated Effort:** 3 Days
**Dependencies:** Story 8.8.1 (Test Infrastructure), Story 8.8.3 (Integration Tests)
**Status:** ✅ Complete

---

## 🎯 **Goal**
Automate critical user journeys on the web platform using **Playwright** (already configured in project), utilizing **Programmatic Login** for speed and `data-testid` selectors for robustness.

---

## 📋 **Acceptance Criteria**

### 1. Test Architecture
- [x] **Programmatic Login**: Bypass the UI login form. Use Playwright's `storageState` to persist authenticated sessions across tests.
- [x] **Selectors**: Frontend updated to include `data-testid="xyz"` on critical elements (send button, input, message bubble).
- [x] **Trace on Failure**: Configure `playwright.config.ts` to capture trace/video automatically when a test fails.

### 2. Critical Flows
- [x] **Messaging**: Send text/image, verify appearance.
- [x] **Blocking**: Block user via UI, verify messages stop arriving.
- [x] **Offline**: Simulate offline mode via Playwright's `page.route` to block network, verify queue processing.

---

## 🧩 **Implementation Details**

### Programmatic Login Pattern
```typescript
// e2e/auth-helper.ts
async function loginAndSaveState(page) {
  const { data } = await supabase.auth.signInWithPassword(...);
  await page.evaluate((token) => {
    localStorage.setItem('sb-access-token', token);
  }, data.session.access_token);
  await page.reload();
}
```

### Robust Selectors
**Frontend:** `<button data-testid="send-message-btn">Send</button>`
**Test:** `await page.click('[data-testid="send-message-btn"]');`

---

## 🤖 **MCP Integration Strategy**

### Browser Subagent (Playwright)
- **Execution**: Use Antigravity's `browser_subagent` tool to execute and validate E2E flows interactively.
- **Debugging**: Run `npm run test:e2e:debug` to launch Playwright Inspector for step-by-step debugging.

---

## 🧪 **Testing Plan**
1. `npm run test:e2e`
