# SynC — Enhanced Unified Project Brief (Mermaid-Aligned v2.0)

**Version:** 2.0 • **Date:** September 17, 2025 • **Owner:** Umamahesh Madala

---

## 1) Vision & Problem

**Vision.** SynC connects city shoppers and hyperlocal businesses through a social, coupon-driven, "word-of-mouth at scale" experience, turning real in-store visits into measurable growth.

**Problem.** Physical stores can't push timely updates and struggle to stay connected between visits; users either miss offers or drown in irrelevant ads. SynC solves this with discovery, targeted offers, gamified sharing, and simple reviews that keep footfall high.

---

## 2) Users & Value

• **Consumers:** discover businesses, collect/share coupons, redeem in store, and follow only what matches interests. Reviews are binary (👍/👎) with a short note.

• **Merchants:** maintain storefronts, run coupons/ads, target "Drivers" (top advocates), and track analytics.

• **Platform Owner (Command Centre):** manage users/merchants/content, pricing, promotions, and revenue via admin subdomain.

---

## 3) Product Scope (MVP → Post-MVP)

### Core MVP (Enhanced with High Priority Fixes):

• **Auth & Profiles** (Customer & Merchant) via Supabase

• **Enhanced Customer Dashboard** with:
  - Search, city picker, notifications with deep-linking
  - Wallet, wishlist, **contacts sidebar** (friend list quick access)
  - Ad slots with organic fallbacks

• **Storefronts** with branding, hours/holidays, trending/top products, offers, and contact

• **Enhanced Coupons System:**
  - Discover, collect, share with **admin-configurable limits** (default: 3 per friend/day, 20 total/day)
  - Redeem via code/QR with validation
  - Wallet state tracks expiry/used

• **Social Features:**
  - Find friends via contacts sidebar
  - Requests/accept/decline with activity feed
  - Share coupons to friends with **daily limit enforcement**

• **Reviews:** only Recommend/Don't Recommend + ≤30 words; gated by GPS or redemption check-in

• **Enhanced Business Onboarding:**
  - Profile, location/map, photos, categories
  - **Demographics data, avg ticket size, seasonal patterns**
  - Target customer information

• **Targeted Campaigns:**
  - Driver targeting (top 10% active users per city)
  - Demographic-based targeting
  - Location and interest-based campaigns

• **Enhanced Command Centre (Admin)** at **admin.myproject.com**:
  - Content moderation, visibility controls
  - **Dynamic sharing limits configuration**
  - **Driver algorithm configuration**
  - Pricing management with actual values
  - Ad approvals, billing, archives

• **Performance/security:** <2s main screens; 99.9% uptime; responsive web (React/Vite/Tailwind)

### Post-MVP examples: 
Public coupon sharing; videos on storefronts; KYC; mobile/WhatsApp OTP; multi-city; advanced gamification and pricing tiers; wishlist-search integration; enhanced analytics; notification throttling.

---

## 4) Enhanced Monetization & Pricing Mechanics

### **Fixed Pricing Structure:**
• **Coupon generation:** ₹2 per coupon
• **Banner ads (dashboard):** ₹500/day
• **Search rank #1:** ₹500/day (daily billing)
• **Trending ads:** ₹300/day
• Push notifications: Phase 2 (not monetized in MVP)

### **Enhanced Pricing Engine**
A unified **Pricing Config → Overrides → Promotions → Context → Compute** pipeline determines the Effective Price per merchant, city, and tier. 

**Promotion stacking rules:** 1 global + 1 city/region + freebies/bundles; floor at ≥0. This feeds UI (current prices), approval, unbilled accruals, and monthly invoicing.

**Examples:**
• Promos: Hyderabad Launch (Sep 1–30, 2025, -25%), Bengaluru Festive (Oct 15–Nov 15, 2025, -15%), First-Week −50% (global), Telangana bundle (6 days → +1 free)
• Propagation: Publish pushes config, overrides, and promos system-wide; analytics and billing read Effective Pricing

---

## 5) Enhanced End-to-End Flows

### 5.1 Landing & Auth
• Landing → Public storefront allowed; gated actions route to login
• Customer/Business segmented auth; reset via OTP/link; first login requires City + ≥5 interests and optional tour

### 5.2 Enhanced Customer Dashboard & Navigation
• **Top sections:** Spotlight Businesses, Hot Offers, Trending Products, New Businesses/Events; up to 6 ad slots with labeled organic fallbacks
• **Contacts sidebar:** Quick access to friend list for easy sharing and social interactions
• **Enhanced notification routing:** Notifications route users to specific storefronts, products, wallet items, activity feed, or profile pages with deep-linking
• City picker updates context (also used by pricing engine for ad rates)

### 5.3 Search
• Results (≤20), filter/sort modal, promoted slots (max 2)
• Cards reveal people-recommended, map, "open until," nearby, and favourites
• Empty state offers trending in similar categories

### 5.4 Storefront (Authenticated)
• Info → Contact/Hours/Holidays; offers (T&Cs modal), products (4+ show; details page), reviews with infinite scroll
• GPS Check-in flow with permission prompt
• Actions notify merchants (check-ins, coupons, reviews)
• Reviews are only 👍/👎 + ≤30 words

### 5.5 Enhanced Wallet with Sharing Limits
• Filters/search/summary; open coupon → code+T&C
• **Enhanced sharing validation:** Check daily limits (3 per friend/day, 20 total/day, admin configurable)
• Share to friend (choose/confirm with limit validation)
• Offline redemption flow (merchant redeem page)
• Collect/reject incoming; favourites

### 5.6 Social
• Find/Manage Friends via contacts sidebar, Requests, Activity Feed
• Toast events for sent/accepted/removed
• Privacy: activity sharing is system-wide (no opt-out in MVP)

### 5.7 Favourites & Wishlist
• Separate tabs for businesses/coupons/products
• Wishlist is user-entered (Phase 2: wishlist can pre-fill search)

### 5.8 Enhanced Business Owner
• **Enhanced Onboarding:** profile, precise map pin, categories, **demographics, avg ticket size, seasons, target customer info**
• **Marketing Hub:** offers, coupons (ID series + barcode), ad requests (owner approval), **targeted campaigns with Driver/demographic targeting**, analytics
• **Targeted Campaign Options:** Target Drivers (top 10%), demographic targeting, location-based, interest-based
• Media rules: per display item ≤4 images, optional 1 video ≤60s (video priority), with upload/transcode states
• Data retention 365 days & override request flow
• Billing: unbilled/credits, disputes, applied credits

### 5.9 Coupons Lifecycle
States: **Not Issued → Issued → Not Collected → Collected → Expired (irreversible)**
• Merchants can mark expired (allowed only if NotIssued/NotCollected)
• Admin can archive/delete sets with audit logging
• Customer wallets keep expired/used (greyed) for history/benefit recall

### 5.10 Enhanced Command Centre / Admin (admin.myproject.com)
• **Subdomain separation:** admin.myproject.com for security
• **Queues:** Ad Requests (approve/reject), Flagged Content (from offers/products/reviews)
• **Management:** businesses/users tables; visibility toggles; block spammy accounts
• **Enhanced Configuration:**
  - **Dynamic sharing limits:** Configure coupons per friend/day, total per day
  - **Driver algorithm config:** Activity weightages, city-wise top 10%, targeting rules
  - Pricing config + overrides + promo rules with actual values
• Monthly invoicing; audit log; coupon archives

---

## 6) Enhanced Gamification: "Drivers"

Top 10% most active users per city are **Drivers**—measured by collecting/sharing coupons, check-ins, writing reviews, and interactions—eligible for:
• Exclusive perks and targeting by merchants
• Priority in targeted campaigns
• Enhanced visibility in social features

**Weightages configurable by platform owner** via Driver Algorithm Config in admin panel.

---

## 7) Enhanced Functional Requirements

**Core Features (with enhancements):**
• Auth, dashboards with contacts sidebar, enhanced search
• **Coupon wallet & redemption with sharing limits** (3 per friend/day, 20 total/day, admin configurable)
• Interests (min 5), favourites/wishlist
• **Enhanced social share with validation**
• Review rule (👍/👎 + ≤30 words), GPS/auto check-ins
• **Enhanced business profiling with demographics**
• **Targeted campaigns and Driver targeting**
• Storefronts with top products, analytics
• **Enhanced admin controls with subdomain separation**
• Monetization endpoints with fixed pricing

---

## 8) Non-Functional & Quality

• **Performance:** <2s main screens; Realtime feed/updates
• **Reliability:** 99.9% availability; backups/DR
• **Security/Privacy:** Supabase Auth; scoped RLS; **separate admin subdomain (admin.myproject.com)**
• **Accessibility & UX:** responsive web; WCAG 2.1 AA practices

---

## 9) Analytics & KPIs

• CAC reduction targets; footfall + engagement uplifts; retention
• Staged DAU/MAU and onboarding targets
• **Enhanced revenue tracking:** coupons/ads with fixed pricing
• **Driver engagement metrics:** activity levels, campaign effectiveness
• **Sharing limit effectiveness:** daily/weekly sharing patterns

---

## 10) Enhanced Data & Policy

• **Retention:** 365-day item retention; warnings and override request flow (business)
• **Enhanced Sharing Policy:** Admin-configurable daily limits (default: 3 per friend/day, 20 total/day)
• **Driver Algorithm:** Configurable weightages for activity scoring
• Disputes/Credits: billing disputes → admin review → credits applied to unbilled
• Notifications: basic throttling (advanced mechanisms targeted post-MVP)

---

## 11) Risks & Mitigations

• **Enhanced anti-spam:** Dynamic sharing limits, lifecycle state checks, admin flags
• Fake reviews: GPS + redemption-triggered check-ins only
• Ad abuse/non-payment: owner approval, soft-lock on default, auto-stop & prorate
• **Admin security:** Subdomain separation (admin.myproject.com)

---

## 12) Updated Execution Plan (12 Weeks)

### **Week 1–2 — Foundation**
• Finalize enhanced FRD/acceptance criteria; DB schema & RLS
• Auth flows; routing & layout; CI/CD
• **Admin subdomain setup**

### **Week 3–4 — Enhanced Customer Core**
• Dashboard surfaces with **contacts sidebar**
• **Enhanced notification routing** system
• Search; storefront read; wallet; notifications

### **Week 5–6 — Social & Enhanced Reviews**
• Friends/requests; activity feed
• **Enhanced coupon sharing with daily limits validation**
• GPS/auto check-ins; review composer (👍/👎 + 30 words)

### **Week 7–8 — Enhanced Merchant & Campaigns**
• **Enhanced business onboarding** (demographics, avg ticket, seasonal patterns)
• Storefront editor; offers & coupon templates
• **Targeted campaigns with Driver targeting**
• Ad requests (approval queue)

### **Week 9 — Enhanced Pricing & Billing**
• **Pricing engine with actual values** (₹2/coupon, ₹500/day banner, ₹500/day search)
• Unbilled ledger; monthly invoicing; soft-lock on default

### **Week 10 — Enhanced Admin & Moderation**
• **Admin panel on subdomain** (admin.myproject.com)
• Users/merchants tables; flagged content; ad approvals
• **Dynamic sharing limits configuration**
• **Driver algorithm settings**
• Coupon archive & audit

### **Week 11 — Hardening**
• Perf (<2s), security pen-pass
• **Enhanced validation systems** (sharing limits, Driver targeting)
• Data retention warnings, analytics dashboards

### **Week 12 — UAT & Launch**
• City pilot (Hyderabad); merchant playbook
• **Enhanced admin monitoring dashboard**
• Rollout checklist; go-live; post-launch monitoring

---

## 13) Enhanced Acceptance (Definition of Done) — MVP

• **All enhanced flows** in the Mermaid render have a live, tested counterpart (including Loading/Empty/Error/Toast states)
• **Contacts sidebar** integrated in customer dashboard with friend access
• **Enhanced notification routing** works for all content types (storefront/product/wallet/feed/profile)
• **Coupon sharing limits** are enforced and admin-configurable
• **Enhanced business onboarding** captures demographics and business intelligence
• **Targeted campaigns** can target Drivers and demographics effectively
• Coupons move through lifecycle correctly and are auditable
• **Enhanced pricing engine** shows actual rates (₹2, ₹500/day, etc.) consistently across UI, ledger, and invoice
• **Driver list** is reproducible from events and configurable by admin
• **Admin subdomain** (admin.myproject.com) provides secure, separated access
• **Admin can configure sharing limits and Driver algorithm dynamically**

---

## How we'll hit your enhanced goals

1. **Enhanced Navigation & UX:** Added contacts sidebar, notification deep-linking, and improved user flow
2. **Robust Social Features:** Implemented sharing limits with admin control and validation
3. **Advanced Business Tools:** Enhanced onboarding with demographics, targeted campaigns with Driver system
4. **Scalable Pricing System:** Fixed actual pricing values with flexible promotion system  
5. **Secure Admin Architecture:** Subdomain separation with enhanced configuration capabilities
6. **Production-Ready Specification:** Every enhancement mapped to Mermaid flowchart with comprehensive state management

The enhanced system now addresses all high-priority navigation gaps, implements robust sharing controls, provides comprehensive business intelligence gathering, and maintains security through architectural separation—all while preserving the core vision of social, coupon-driven local business discovery.

---

**Ready for immediate development with zero assumptions on high-priority features.**