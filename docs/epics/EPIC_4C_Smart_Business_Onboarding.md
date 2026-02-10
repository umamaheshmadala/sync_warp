# Epic 4C: Smart Business Onboarding & Verification

**Epic Owner:** Development Team  
**Created:** 2026-01-11  
**Source:** [Yelp Research](../research/YELP_BUSINESS_ONBOARDING_GUIDE.md) | [India API Research](../research/BUSINESS_DATA_API_RESEARCH_INDIA.md)  
**Priority:** 🔴 HIGH - Improves acquisition funnel and trust  
**Target:** Production-Ready Smart Business Onboarding with Verification

---

## 🎯 Epic Goal

Transform SynC's business registration from a manual data-entry process into a Yelp-inspired smart onboarding experience that:

1. **Reduces Friction** - Auto-fill business data via Google Places API
2. **Proves Ownership** - Phone OTP verification like Yelp
3. **Prevents Fraud** - Only verified owners can manage listings
4. **Improves Data Quality** - Pre-validated addresses and phone numbers
5. **Enables Future Claims** - Allow claiming existing unverified businesses

---

## 📊 Epic Scope

### Current State (Story 4.1)
- ✅ 4-step registration wizard
- ✅ Manual entry of all fields
- ✅ Optional phone number (no verification)
- ✅ OpenStreetMap geocoding
- ❌ No business search/autocomplete
- ❌ No phone verification
- ❌ No ownership proof
- ❌ No claim flow for existing businesses

### New Features (This Epic)
- ✅ **Google Places API integration** (autocomplete + details)
- ✅ **Phone OTP verification** (Supabase auth)
- ✅ **Smart search step** (find or add business)
- ✅ **Live preview** (business card during registration)
- ✅ **Claim flow** (adopt existing unverified listings)
- ✅ **Fallback to manual entry** (when API unavailable)
- ✅ **Verification badges** (verified owner indicator)
- ✅ **API usage monitoring** (quota tracking)

**Impact:** Reduces registration time from 8min → 4min, increases completion rate from 60% → 85%

---

## 🗂️ Stories in This Epic

### Story 4C.1: Google Places API Integration
**Priority:** 🔴 P0 - CRITICAL  
**Effort:** 3 days  
**Dependencies:** None  

**User Stories:**
- As a business owner, I want to search for my business by name and see suggestions
- As a business owner, I want my business details auto-filled when I select a suggestion
- As a business owner, I want to add a new business if mine isn't found

**What Will Be Built:**
- `businessSearchService.ts` - API wrapper with session tokens
- `useBusinessSearch.ts` - React hook for search state
- Environment variable setup for API key
- Error handling and rate limiting
- Category mapping (Google → SynC)

**Acceptance Criteria:**
- [ ] Search returns suggestions after 3+ characters
- [ ] Suggestions include business name and address
- [ ] Selecting a suggestion populates form fields
- [ ] "Add new business" option appears when no match
- [ ] Rate limiting prevents excessive API calls
- [ ] Fallback to manual entry works when API fails

---

### Story 4C.2: Phone OTP Verification System
**Priority:** 🔴 P0 - CRITICAL  
**Effort:** 3 days  
**Dependencies:** None  
**Status:** ✅ Completed  

**User Stories:**
- As a business owner, I want to verify I own the business phone number
- As a platform, I want to prevent fake business listings
- As a customer, I want to trust that businesses are legitimate

**What Will Be Built:**
- `BusinessPhoneVerification.tsx` - OTP input component
- Integration with Supabase phone auth
- 6-digit OTP input with auto-focus
- Resend functionality with rate limiting
- Verification status tracking in database

**Database Changes:**
```sql
ALTER TABLE businesses
ADD COLUMN phone_verified BOOLEAN DEFAULT false,
ADD COLUMN phone_verified_at TIMESTAMPTZ,
ADD COLUMN google_place_id TEXT,
ADD COLUMN claim_status TEXT DEFAULT 'manual';
```

**Acceptance Criteria:**
- [ ] OTP is sent to valid Indian phone numbers (+91)
- [ ] 6-digit input with auto-focus between digits
- [ ] Auto-submit when all digits entered
- [ ] "Resend OTP" with 60-second cooldown
- [ ] Verification status stored in database
- [ ] Maximum 5 failed attempts before lockout

---

### Story 4C.3: Smart Search Step (Step 0)
**Priority:** 🔴 P0 - CRITICAL  
**Effort:** 2 days  
**Dependencies:** Story 4C.1  
**Status:** ✅ Completed  

**User Stories:**
- As a business owner, I want to start by searching for my business
- As a business owner, I want to see if my business already exists on SynC
- As a business owner, I want a clean, focused first step

**What Will Be Built:**
- `Step0_SmartSearch.tsx` - New first step component
- Debounced search input
- Suggestion dropdown with business cards
- "Add new business" option
- Pre-fill logic when business selected

**UI/UX Requirements:**
- Clean interface inspired by Yelp ("Let's find your business!")
- Autocomplete dropdown appears after 3 characters
- Each suggestion shows: Name, Address, Category icon
- Clear "Can't find your business?" link
- Mobile-responsive design

**Acceptance Criteria:**
- [ ] Search input with placeholder "Search your business name..."
- [ ] Dropdown shows max 5 suggestions
- [ ] Clicking suggestion pre-fills Steps 2-4
- [ ] "Add [Business Name]" option when no match
- [ ] Loading state during API calls
- [ ] Error state with retry option

---

### Story 4C.4: Verification Step (Step 1)
**Priority:** 🔴 P0 - CRITICAL  
**Effort:** 2 days  
**Dependencies:** Story 4C.2, Story 4C.3  
**Status:** ✅ Completed  

**User Stories:**
- As a business owner, I want to prove I own this business
- As the platform, I want ownership verification before granting access
- As a business owner, I want multiple verification options

**What Will Be Built:**
- `Step1_PhoneVerify.tsx` - Verification step component
- Phone number display with edit option
- OTP flow integration
- Skip option for manual verification (admin review)

**Verification Methods:**
1. **Phone OTP** (Primary) - Instant verification
2. **Email Link** (Secondary) - Coming in future update
3. **Document Upload** (Fallback) - Admin review required

**Acceptance Criteria:**
- [ ] Phone number pre-filled from Step 0 or editable
- [ ] "Send OTP" button initiates verification
- [ ] OTP input appears after sending
- [ ] Success state shows green checkmark
- [ ] "Skip verification" option (marks as unverified)
- [ ] Unverified businesses have limited features

---

### Story 4C.5: Enhanced Steps 2-4 with Pre-fill
**Priority:** 🟠 P1 - HIGH  
**Effort:** 2 days  
**Dependencies:** Story 4C.3  

**User Stories:**
- As a business owner, I want my details auto-filled from Google
- As a business owner, I want to edit any pre-filled information
- As a business owner, I want to see a preview of my business page

**What Will Be Built:**
- Update `Step2_BasicDetails.tsx` with pre-fill support
- Update `Step3_Location.tsx` with map preview
- Update `Step4_HoursMedia.tsx` with quick templates
- `BusinessPreviewCard.tsx` - Live preview component
- `QuickHoursTemplate.tsx` - Common schedule presets

**Quick Hours Templates:**
- "Standard Business" (Mon-Fri 9-6, Sat 10-4, Sun Closed)
- "Always Open" (24/7)
- "Restaurant Hours" (11-10 daily)
- "Retail Hours" (10-9 daily)
- "Custom" (current behavior)

**Acceptance Criteria:**
- [ ] Pre-filled fields are clearly marked
- [ ] User can edit any pre-filled value
- [ ] Preview card updates in real-time
- [ ] Quick hours templates reduce clicks
- [ ] Map shows pin at business location
- [ ] Drag pin to adjust location

---

### Story 4C.6: API Usage Monitoring
**Priority:** 🟡 P2 - MEDIUM  
**Effort:** 1 day  
**Dependencies:** Story 4C.1  
**Status:** ✅ Completed  

**User Stories:**
- As the platform, I want to track API usage against quotas
- As the platform, I want alerts before exceeding free tier
- As the platform, I want to disable features gracefully at quota

**What Will Be Built:**
- `api_usage_logs` table for tracking
- Usage tracking service
- Admin dashboard widget
- Alert system at 50%, 80%, 95% quota

**Database Schema:**
```sql
CREATE TABLE api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api VARCHAR(50) NOT NULL,
  endpoint VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_usage_api_date 
ON api_usage_logs(api, created_at);
```

**Acceptance Criteria:**
- [ ] Every Places API call is logged
- [ ] Daily/monthly aggregation available
- [ ] Email alert at 80% usage
- [ ] Autocomplete disables at 95% (fallback to manual)
- [ ] Admin can view usage in dashboard

---

### Story 4C.7: Claim Existing Business Flow
**Priority:** 🟡 P2 - MEDIUM  
**Effort:** 3 days  
**Dependencies:** Story 4C.2, Story 4C.4  

**User Stories:**
- As a business owner, I want to claim a business already in SynC
- As the platform, I want to verify ownership before transferring control
- As users, I want to see which businesses are verified

**What Will Be Built:**
- "Claim this business" button on unowned listings
- Ownership verification flow
- Transfer of ownership logic
- Verification badge display

**Claim Statuses:**
- `unclaimed` - No owner assigned
- `claimed_pending` - Verification in progress
- `claimed_verified` - Owner verified via OTP
- `claimed_manual` - Owner verified by admin

**Acceptance Criteria:**
- [ ] "Claim" button visible on unclaimed businesses
- [ ] Clicking triggers phone verification flow
- [ ] Successful verification transfers ownership
- [ ] Previous owner (if any) is notified
- [ ] Verification badge appears on profile
- [ ] Admin can override claims if disputed

---

## 📅 Implementation Roadmap

### Sprint 1 (Week 1): Foundation
| Day | Task | Story |
|-----|------|-------|
| 1 | Set up Google Cloud Project + API key | 4C.1 |
| 1 | Create `businessSearchService.ts` | 4C.1 |
| 2 | Create `useBusinessSearch.ts` hook | 4C.1 |
| 2 | Build `BusinessPhoneVerification.tsx` | 4C.2 |
| 3 | Integrate with Supabase phone auth | 4C.2 |
| 3 | Add database columns | 4C.2 |

### Sprint 2 (Week 2): UI Components
| Day | Task | Story |
|-----|------|-------|
| 1 | Build `Step0_SmartSearch.tsx` | 4C.3 |
| 2 | Build `Step1_PhoneVerify.tsx` | 4C.4 |
| 3 | Update Steps 2-4 with pre-fill | 4C.5 |
| 3 | Build `BusinessPreviewCard.tsx` | 4C.5 |
| 4 | Build `QuickHoursTemplate.tsx` | 4C.5 |

### Sprint 3 (Week 3): Integration & Polish
| Day | Task | Story |
|-----|------|-------|
| 1 | Integrate all steps into wizard | All |
| 2 | Add API usage monitoring | 4C.6 |
| 3 | Build claim flow | 4C.7 |
| 4 | Testing and bug fixes | All |
| 5 | Mobile responsiveness | All |

---

## 💰 Cost Analysis

### Google Places API — Field Tiers
| Tier | Fields Fetched | Free Requests/Month | Cost After |
|------|---------------|---------------------|------------|
| Essentials (Autocomplete) | Search suggestions | 10,000 | $2.83/1K |
| Basic (Place Details) | name, address, phone, website, hours, geometry, types, address_components, **business_status**, **url**, **photos** | Bundled with session | $0 extra |
| Atmosphere (Place Details) | **rating**, **user_ratings_total**, **price_level** | Bundled with session | $0 extra |
| Pro (Place Details) | paymentOptions, parkingOptions, editorialSummary | 5,000 | $17/1K |

> **Note:** Enhanced fields (Basic + Atmosphere) are fetched in the same Place Details call that's already made after autocomplete selection, so they add **zero extra cost** when using session tokens. Pro-tier fields are deferred to future stories.

### Expected Usage (MVP)
```
Monthly businesses: 500
Requests per business: ~4 (3 autocomplete + 1 details)
Total requests: 2,000/month
Cost: $0 (within free tier)
Enhanced fields: $0 extra (bundled with existing details call)
```

### Break-even Analysis
```
Free tier supports: 10,000 / 4 = 2,500 businesses/month
At 3,000 businesses: ~$2.83 extra cost
At 5,000 businesses: ~$8.50 extra cost
```

---

## 🔐 Security Considerations

### Phone Verification
- Rate limit: 3 OTP requests per hour per number
- OTP expiry: 5 minutes
- Lockout: 5 failed attempts
- Logging: All verification attempts tracked

### Google API Key
- Referrer restrictions enabled
- Only Places API enabled
- Daily quota limits set
- Usage monitored

### Data Privacy
- Phone numbers encrypted at rest
- Verification status is public (badge)
- Google Place ID stored for reference only
- No personal data shared with Google

---

## 📊 Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Registration completion | 60% | 85% | Funnel analytics |
| Time to complete | 8 min | 4 min | Session timing |
| Data accuracy | Unknown | 95% | Validation rate |
| Verification rate | 0% | 80% | OTP completion |
| Drop-off at Step 1 | 20% | <10% | Funnel analytics |

---

## 🔗 Dependencies

```
Story 4C.1 (Google API) ─────┐
                             ├──► Story 4C.3 (Smart Search)
Story 4C.2 (Phone OTP) ──────┤
                             ├──► Story 4C.4 (Verification)
                             │
Story 4C.3 ──────────────────┴──► Story 4C.5 (Enhanced Steps)
                                              │
Story 4C.1 + 4C.2 ───────────────────────────► Story 4C.6 (Monitoring)
                                              │
Story 4C.4 ──────────────────────────────────► Story 4C.7 (Claim Flow)
```

---

## 📁 File Structure

```
src/
├── services/
│   ├── businessSearchService.ts      [NEW] Story 4C.1
│   └── apiUsageService.ts            [NEW] Story 4C.6
├── hooks/
│   ├── useBusinessSearch.ts          [NEW] Story 4C.1
│   └── useBusinessOnboarding.ts      [NEW] Story 4C.5
├── components/
│   └── business/
│       └── onboarding/
│           ├── BusinessOnboardingWizard.tsx  [NEW]
│           ├── steps/
│           │   ├── Step0_SmartSearch.tsx     [NEW] Story 4C.3
│           │   ├── Step1_PhoneVerify.tsx     [NEW] Story 4C.4
│           │   ├── Step2_BasicDetails.tsx    [UPDATE] Story 4C.5
│           │   ├── Step3_Location.tsx        [UPDATE] Story 4C.5
│           │   └── Step4_HoursMedia.tsx      [UPDATE] Story 4C.5
│           └── components/
│               ├── BusinessPreviewCard.tsx   [NEW] Story 4C.5
│               ├── BusinessPhoneVerification.tsx [NEW] Story 4C.2
│               ├── QuickHoursTemplate.tsx    [NEW] Story 4C.5
│               └── ProgressStepper.tsx       [NEW]
└── types/
    └── businessOnboarding.ts          [NEW]

supabase/
└── migrations/
    ├── 20260111_smart_onboarding.sql  [NEW] Story 4C.2
    └── 20260210_add_google_places_enhanced_fields.sql  [NEW] Story 4C.1 (enhanced fields)

.env.local
└── VITE_GOOGLE_PLACES_API_KEY        [NEW] Story 4C.1
```

---

## ✅ Definition of Done

### Epic Complete When:
1. ✅ All 7 stories implemented and tested
2. ✅ Google Places autocomplete working
3. ✅ Phone OTP verification working
4. ✅ Pre-fill reduces manual entry by 80%
5. ✅ Verification badge visible on profiles
6. ✅ API usage tracked and alerts configured
7. ✅ Claim flow functional
8. ✅ Mobile-responsive design verified
9. ✅ Documentation updated

### MVP Launch Criteria (Minimum):
1. ✅ Story 4C.1 (Google API) - MUST HAVE
2. ✅ Story 4C.2 (Phone OTP) - MUST HAVE
3. ✅ Story 4C.3 (Smart Search) - MUST HAVE
4. ✅ Story 4C.4 (Verification) - MUST HAVE
5. ✅ Story 4C.5 (Enhanced Steps) - SHOULD HAVE
6. ✅ Story 4C.6 (Monitoring) - NICE TO HAVE
7. ⚪ Story 4C.7 (Claim Flow) - NICE TO HAVE

---

## 📚 Reference Documents

- [SynC Business Onboarding Implementation Plan](../research/SYNC_BUSINESS_ONBOARDING_PLAN.md)
- [Yelp Business Onboarding Research](../research/YELP_BUSINESS_ONBOARDING_GUIDE.md)
- [India Business Data API Research](../research/BUSINESS_DATA_API_RESEARCH_INDIA.md)
- [Current Business Registration](EPIC_4_Business_Features.md#story-41)
- [Enhanced Business Onboarding](EPIC_4B_Missing_Business_Owner_Features.md#story-4b4)

---

**Epic Status:** 📋 READY FOR IMPLEMENTATION  
**Total Effort:** 16 days (3 weeks)  
**Business Impact:** HIGH - Improves acquisition, trust, and data quality  
**Technical Risk:** LOW - Uses proven APIs and existing auth infrastructure  

**Ready to start with Story 4C.1!** 🚀
