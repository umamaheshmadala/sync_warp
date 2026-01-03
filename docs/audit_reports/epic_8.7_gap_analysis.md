# Epic 8.7 Gap Analysis & Industry Standards Review

## 1. Industry Practice & Recommended Solutions

I have analyzed the proposed stories for "Moderation & Safety" against current industry standards (e.g., Trust & Safety practices at major social platforms).

### **A. Block/Unblock (Story 8.7.1)**
- **Standard**: Blocking should be "mutual" and "invisible" (shadow). The blocked user isn't notified but messages appear to send (or fail silently) to prevent retaliation. RLS policies blocks read access immediately.
- **Our Plan**: We implemented visible blocking (toast error).
- **Recommendation**: Ensure RLS policies strictly enforce blocking so a blocked user cannot bypass the UI using API calls.
- **Gap**: The current story focuses on Service/UI. **Action**: Added strong emphasis on RLS enforcement in Acceptance Criteria.

### **B. Report System (Story 8.7.2)**
- **Standard**: Reporting needs a "Trust & Safety" tooling backend (admin panel). Reports without review actions are useless. "Auto-flagging" is risky (mass-report attacks).
- **Our Plan**: Basic table logging + simple auto-flag logic.
- **Recommendation**: Implement `reviewed_by` and `actioned_at` timestamps. Use specific "Report Types" (DSA/GDPR compliance categories).
- **Gap**: No Admin Dashboard in MVP. **Action**: Acceptable for v1, but noted as technical debt.

### **C. Spam Detection (Story 8.7.3) & Link Validation (Story 8.7.4)**
- **Standard**: Client-side checks are good for UX (instant feedback), but **Server-Side** (Edge Function / Middleware) is mandatory for security. Client checks can be bypassed by `curl` requests.
- **Our Plan**: Deeply integrated into `useSendMessage` (Client-side hook).
- **Recommendation**: Move critical checks (Link limits, Rate limits) to a Database Trigger or Edge Function to ensure API integrity.
- **Gap**: Client-side heavy. **Action**: Marked as a "Gap" in the summary but proceeded with client-side for faster MVP delivery. Ideally, `supabase_functions` would handle this.

---

## 2. Epic vs. Stories Coverage Check

| Epic Requirement | Covered By | Status |
| :--- | :--- | :--- |
| **Block and unblock users** | Story 8.7.1 | ✅ Covered (Full) |
| **Report inappropriate messages** | Story 8.7.2 | ✅ Covered (Full) |
| **Detect and filter spam** | Story 8.7.3 | ✅ Covered (Client-side) |
| **Validate links** | Story 8.7.4 | ✅ Covered |
| **Rate limiting** | Story 8.7.3 | ✅ Covered |
| **Native confirmation dialogs** | Story 8.7.1 & 8.7.2 | ✅ Covered (Capacitor) |
| **Admin moderation dashboard** | *Omitted* | ⚠️ Omitted (Marked Optional in Epic) |

**Conclusion**: The stories cover 100% of the *mandatory* requirements of Epic 8.7. The optional Admin Dashboard is excluded to fit the 1-week timeline.
