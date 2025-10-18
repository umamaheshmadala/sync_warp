# Story 4.9 – Social Sharing Actions: Implementation Plan (Remaining 60%)

Status: Planned | Owner: Dev Team | Effort: 5–8 days | Priority: Medium (Post‑MVP)

Objective
- Deliver the missing functionality for storefront/product sharing with tracking and analytics, aligned with Enhanced Docs and current industry standards.

Scope (remaining)
- Storefront share button + integration
- Reusable Web Share hook (with clipboard fallback)
- Share tracking (DB schema + service + RPC)
- Product share integration in cards/details
- Enhanced desktop-friendly ShareModal (platform buttons, QR)
- Basic analytics (counts/method breakdown) and UTM tagging

Workstreams, tasks, deliverables, estimates

Phase 1 — Foundation (2 days)
1) Reusable hook
   - File: src/hooks/useWebShare.ts
   - Features: navigator.share with AbortError handling; clipboard fallback; success/error toasts; capability detection; optional files support where available.
   - Deliverables: unit tests for Web Share available/unavailable; clipboard fallback; cancel behavior.
2) DB schema + RPC
   - File: supabase/migrations/20xx_xx_xx_shares_table.sql
   - DDL: shares(id, user_id, type, entity_id, method, referral_code, created_at); indexes (user, entity+type, method, created_at, referral_code); RLS (view/insert own + anon insert allowed with NULL user_id); RPC track_share(p_user_id, p_type, p_entity_id, p_method) returns id.
   - Deliverables: migration applied; advisors clean; basic seed and select verified.
3) Tracking service
   - File: src/services/shareTracker.ts
   - Functions: trackShare(event), getShareStats(entityId, type), buildUtm(url, source, medium, campaign).
   - Deliverables: happy-path unit tests; error handling paths.

Phase 2 — Storefront sharing (1–2 days)
4) StorefrontShareButton
   - File: src/components/social/StorefrontShareButton.tsx
   - Props: businessId, businessName, description?, image?, variant (icon|button)
   - Behavior: builds canonical URL /business/:id with UTM; calls useWebShare.share; on success → trackShare({type:'storefront', ...}).
5) Integrate into BusinessProfile
   - Add button in header actions (mobile FAB optional); a11y labels and tooltip; smoke test.
   - E2E: storefront can be shared; toast shown; DB has one share row.

Phase 3 — Product integration & enhancements (1–2 days)
6) Product share entry points
   - Add ProductShareButton to product cards and product details headers (opens native or uses modal fallback as needed).
   - Refactor ProductShareModal to use useWebShare (single source for share + clipboard logic).
   - Ensure canonical URL /business/:businessId/product/:productId with UTM.
7) Tracking wiring
   - After successful share/copy, call trackShare({type:'product', method, entity_id}).
   - Basic telemetry events sent to analytics (if present) under event name share_attempt/share_success.

Phase 4 — Analytics & desktop UX polish (1–2 days)
8) Enhanced ShareModal (desktop fallback)
   - File: src/components/social/ShareModal.tsx
   - Features: copy link; WhatsApp/Facebook/X/Email deep-links (open in new tab); QR code (e.g., qrcode.react); small footprint, a11y; theming.
9) Basic analytics surfaces
   - Owner view (optional lightweight): show total shares + method breakdown from getShareStats in Business dashboard card.
   - Validate performance (indexes used; queries <150ms dev DB).

Cross-cutting requirements
- URL canonicalization & UTM: append utm_source=share_button, utm_medium=native|copy|platform, utm_campaign=storefront|product.
- Accessibility: aria-labels, focus traps in modals, keyboard support.
- Performance: share actions under 500ms (excluding native dialog wait); code-split modal.
- Privacy: no PII in URLs or UTM; respect clipboard permissions; guard navigator APIs.
- Localization-ready strings (button text, toasts).

Testing plan
- Unit: useWebShare (3–4 tests), shareTracker (2–3 tests), URL builder with UTM (edge cases).
- E2E (Playwright):
  - Storefront sharing (native mocked): success toast + DB row created
  - Product sharing from card and details: native + clipboard fallback
  - Desktop fallback ShareModal: platform buttons open correct URLs; QR renders
- Cross‑browser matrix: Chrome, Edge, Safari (mobile), Firefox (expects clipboard fallback).
- Mobile devices: iOS Safari, Android Chrome (native share).

Definition of Done
- Storefront and product share buttons present and functional in all intended locations.
- Web Share + clipboard fallback unified via useWebShare.
- Shares recorded with method and type; UTM parameters added to URLs.
- Basic share stats retrievable via getShareStats; optional owner card shows counts.
- A11y checks pass; lint/typecheck pass; E2E green.

Risk & mitigation
- Web Share API variability → robust fallback path; capability checks.
- Clipboard permissions errors → clear error toasts and manual copy UI.
- Social platform URL changes → centralize link builders; minimal dependencies.

Deliverables checklist
- [ ] useWebShare.ts with tests
- [ ] shares migration + RPC applied
- [ ] shareTracker.ts with tests
- [ ] StorefrontShareButton.tsx integrated into BusinessProfile
- [ ] ProductShareButton integrated into cards/details; ProductShareModal refactored
- [ ] ShareModal.tsx (desktop) with QR and platform links
- [ ] getShareStats hook/usage and optional owner card
- [ ] E2E: storefront/product share (native + clipboard)

PR plan
- PR1: Foundation (hook + DB + service)
- PR2: Storefront share button + integration + E2E
- PR3: Product share integration + refactor + tracking + E2E
- PR4: ShareModal (desktop) + analytics surfacing + docs

Docs to update
- docs/stories/STORY_4.9_Social_Sharing_Actions.md (mark items as implemented)
- docs/stories/STORY_4.9_IMPLEMENTATION_STATUS.md (progress updates)
- README or developer guide: sharing conventions & UTM
