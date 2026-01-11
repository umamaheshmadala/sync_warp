# SynC Business Onboarding Implementation Plan

> **Version:** 2.0 (Enhanced with Yelp-like Experience)  
> **Created:** January 11, 2026  
> **Status:** 📋 Ready for Implementation  
> **Based On:** [Yelp Onboarding Research](./YELP_BUSINESS_ONBOARDING_GUIDE.md) | [India API Research](./BUSINESS_DATA_API_RESEARCH_INDIA.md)

---

## Executive Summary

This plan enhances SynC's existing business registration flow with Yelp-inspired UX patterns and Google Places API integration for a smoother, more intuitive onboarding experience that reduces friction and data entry errors.

### Key Enhancements
1. **Smart Business Search** - Google Places autocomplete to pre-fill data
2. **Phone OTP Verification** - Prove business ownership like Yelp
3. **Progressive Disclosure** - Simpler initial steps, details later
4. **Live Preview** - Show business page preview during registration
5. **Claim vs Create** - Allow claiming existing businesses

---

## Current State Analysis

### Existing Flow (4 Steps)
```
Step 1: Basic Information
├── Business Name (manual entry)
├── Business Type (dropdown)
├── Category (dropdown)
├── Description (textarea)
├── Email (optional)
└── Phone (optional, no verification)

Step 2: Location & Contact
├── Address (manual entry)
├── City (manual entry)
├── State (manual entry)
├── Postal Code (optional)
├── Get Location button (OpenStreetMap geocoding)
├── Website URL
└── Social Media (Facebook, Instagram, Twitter)

Step 3: Operating Hours
└── 7-day schedule with open/close times

Step 4: Media & Tags
├── Logo upload
├── Cover image upload
└── Tags for discoverability
```

### Current Gaps
| Gap | Issue | Impact |
|-----|-------|--------|
| No autocomplete | Users type everything manually | High friction, typos |
| No phone verification | Can't prove ownership | Fake listings possible |
| No claim flow | Can't adopt existing businesses | Duplicate listings |
| All fields at once | Overwhelming for mobile users | Drop-off |
| No preview | Users don't know what they're building | Low engagement |

---

## Proposed Enhanced Flow

### New 5-Step Flow with Smart Features

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ENHANCED ONBOARDING FLOW                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  STEP 0: SMART SEARCH (NEW)                                            │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  "Let's find your business!"                                      │ │
│  │  ┌─────────────────────────────────────────────┐                  │ │
│  │  │ 🔍 Search your business name...            │ ← Google Places   │ │
│  │  └─────────────────────────────────────────────┘   Autocomplete   │ │
│  │                                                                    │ │
│  │  → Match Found: Pre-fill name, address, phone, category           │ │
│  │  → No Match: "Add [Business Name] as new business"                │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                              │                                          │
│                              ▼                                          │
│  STEP 1: VERIFY OWNERSHIP (NEW)                                        │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  "Verify you own this business"                                   │ │
│  │                                                                    │ │
│  │  Phone: +91 98765 43210    [Edit]                                 │ │
│  │                                                                    │ │
│  │  [📱 Send OTP]  ←── Uses existing Supabase phone auth             │ │
│  │                                                                    │ │
│  │  ┌──────────────────────────────────────────┐                     │ │
│  │  │  Enter 6-digit OTP: [_][_][_][_][_][_]  │                     │ │
│  │  └──────────────────────────────────────────┘                     │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                              │                                          │
│                              ▼                                          │
│  STEP 2: BASIC DETAILS (Simplified)                                    │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Business Name: [Pre-filled or editable]                          │ │
│  │  Category: [Dropdown - required]                                  │ │
│  │  Business Type: [Sole Prop / LLP / Pvt Ltd]                       │ │
│  │  Description: [Textarea - 500 chars max]                          │ │
│  │                                                                    │ │
│  │  ┌─────────────────────┐  ← Live Preview Panel (Desktop)          │ │
│  │  │  [Business Card     │                                          │ │
│  │  │   Preview Here]     │                                          │ │
│  │  └─────────────────────┘                                          │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                              │                                          │
│                              ▼                                          │
│  STEP 3: LOCATION (Enhanced with Maps)                                 │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Address: [Pre-filled from Google Places or manual]               │ │
│  │  City: [Auto-filled]  State: [Auto-filled]  PIN: [Auto-filled]   │ │
│  │                                                                    │ │
│  │  ┌─────────────────────────────────────────────────────┐          │ │
│  │  │        📍 Map Preview with Pin                       │          │ │
│  │  │        [Drag to adjust location]                    │          │ │
│  │  └─────────────────────────────────────────────────────┘          │ │
│  │                                                                    │ │
│  │  Website: [Optional]                                               │ │
│  │  Email: [Optional]                                                 │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                              │                                          │
│                              ▼                                          │
│  STEP 4: HOURS & MEDIA (Combined)                                      │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Operating Hours:                                                  │ │
│  │  ┌─────────────────────────────────────────────┐                  │ │
│  │  │ Mon-Fri: 9:00 AM - 6:00 PM  [Edit]          │ ← Quick Template │ │
│  │  │ Sat: 10:00 AM - 4:00 PM     [Edit]          │                  │ │
│  │  │ Sun: Closed                  [Edit]          │                  │ │
│  │  └─────────────────────────────────────────────┘                  │ │
│  │                                                                    │ │
│  │  Logo: [Upload]     Cover: [Upload]                               │ │
│  │                                                                    │ │
│  │  [Skip for now - Complete Later]  [Submit]                        │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                              │                                          │
│                              ▼                                          │
│  COMPLETION SCREEN                                                      │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  ✅ Your business is now live on SynC!                            │ │
│  │                                                                    │ │
│  │  [View My Business Page]  [Go to Dashboard]                       │ │
│  │                                                                    │ │
│  │  Next Steps:                                                       │ │
│  │  • Add more photos to attract customers                           │ │
│  │  • Create your first offer or coupon                              │ │
│  │  • Share your page on social media                                │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### Phase 1: Google Places Integration

#### 1.1 Environment Setup
```env
# .env.local
VITE_GOOGLE_PLACES_API_KEY=your_key_here
```

#### 1.2 New Service: `businessSearchService.ts`
```typescript
// src/services/businessSearchService.ts

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface PlaceDetails {
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  opening_hours?: {
    weekday_text: string[];
    periods: Array<{
      open: { day: number; time: string };
      close: { day: number; time: string };
    }>;
  };
  geometry: {
    location: { lat: number; lng: number };
  };
  types: string[];
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

export async function searchBusinesses(
  query: string,
  sessionToken?: string
): Promise<PlacePrediction[]> {
  if (!query || query.length < 3) return [];

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?` +
    `input=${encodeURIComponent(query)}` +
    `&types=establishment` +
    `&components=country:in` +
    `&key=${API_KEY}` +
    (sessionToken ? `&sessiontoken=${sessionToken}` : '')
  );

  const data = await response.json();
  return data.predictions || [];
}

export async function getPlaceDetails(
  placeId: string
): Promise<PlaceDetails | null> {
  const fields = [
    'name',
    'formatted_address',
    'formatted_phone_number',
    'international_phone_number',
    'website',
    'opening_hours',
    'geometry',
    'types',
    'address_components'
  ].join(',');

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?` +
    `place_id=${placeId}` +
    `&fields=${fields}` +
    `&key=${API_KEY}`
  );

  const data = await response.json();
  return data.result || null;
}

export function parseAddressComponents(
  components: PlaceDetails['address_components']
): {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
} {
  const getComponent = (type: string) =>
    components.find(c => c.types.includes(type))?.long_name || '';

  return {
    street: `${getComponent('street_number')} ${getComponent('route')}`.trim(),
    city: getComponent('locality') || getComponent('administrative_area_level_2'),
    state: getComponent('administrative_area_level_1'),
    postalCode: getComponent('postal_code'),
    country: getComponent('country')
  };
}

export function mapGoogleCategoryToSynC(types: string[]): string | null {
  const categoryMap: Record<string, string> = {
    restaurant: 'food_dining',
    cafe: 'food_dining',
    bakery: 'food_dining',
    bar: 'food_dining',
    store: 'retail',
    shopping_mall: 'retail',
    clothing_store: 'retail',
    beauty_salon: 'health_beauty',
    spa: 'health_beauty',
    gym: 'health_beauty',
    doctor: 'healthcare',
    hospital: 'healthcare',
    pharmacy: 'healthcare',
    school: 'education',
    university: 'education',
    hotel: 'hospitality',
    lodging: 'hospitality',
    car_repair: 'automotive',
    car_dealer: 'automotive',
    lawyer: 'professional_services',
    accounting: 'professional_services',
    real_estate_agency: 'real_estate'
  };

  for (const type of types) {
    if (categoryMap[type]) {
      return categoryMap[type];
    }
  }
  return null;
}
```

#### 1.3 New Hook: `useBusinessSearch.ts`
```typescript
// src/hooks/useBusinessSearch.ts
import { useState, useCallback, useRef } from 'react';
import { searchBusinesses, getPlaceDetails, parseAddressComponents } from '../services/businessSearchService';
import { useDebouncedCallback } from 'use-debounce';

export function useBusinessSearch() {
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const sessionToken = useRef(crypto.randomUUID());

  const search = useDebouncedCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const results = await searchBusinesses(query, sessionToken.current);
      setSuggestions(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, 300);

  const selectPlace = useCallback(async (placeId: string) => {
    setLoading(true);
    try {
      const details = await getPlaceDetails(placeId);
      if (details) {
        const address = parseAddressComponents(details.address_components);
        // Reset session token after selection
        sessionToken.current = crypto.randomUUID();
        return {
          name: details.name,
          phone: details.formatted_phone_number || '',
          website: details.website || '',
          address: address.street || details.formatted_address,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          latitude: details.geometry.location.lat,
          longitude: details.geometry.location.lng,
          openingHours: details.opening_hours?.weekday_text,
          googlePlaceId: placeId
        };
      }
    } catch (error) {
      console.error('Failed to get place details:', error);
    } finally {
      setLoading(false);
    }
    return null;
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    loading,
    search,
    selectPlace,
    clearSuggestions
  };
}
```

---

### Phase 2: Phone OTP Verification

#### 2.1 New Component: `BusinessPhoneVerification.tsx`
```typescript
// src/components/business/onboarding/BusinessPhoneVerification.tsx
import React, { useState, useRef } from 'react';
import { Phone, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

interface Props {
  phoneNumber: string;
  onPhoneChange: (phone: string) => void;
  onVerified: () => void;
  isVerified: boolean;
}

export function BusinessPhoneVerification({
  phoneNumber,
  onPhoneChange,
  onVerified,
  isVerified
}: Props) {
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const sendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`,
      });

      if (error) throw error;
      
      setOtpSent(true);
      toast.success('OTP sent to your phone!');
    } catch (error) {
      console.error('OTP send error:', error);
      toast.error('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`,
        token: otpString,
        type: 'sms'
      });

      if (error) throw error;

      toast.success('Phone verified successfully!');
      onVerified();
    } catch (error) {
      console.error('OTP verification error:', error);
      toast.error('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when complete
    if (newOtp.every(d => d) && newOtp.join('').length === 6) {
      verifyOTP();
    }
  };

  if (isVerified) {
    return (
      <div className="bg-green-50 p-4 rounded-lg flex items-center gap-3">
        <CheckCircle className="w-6 h-6 text-green-600" />
        <div>
          <p className="font-medium text-green-800">Phone Verified</p>
          <p className="text-sm text-green-600">{phoneNumber}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Business Phone Number *
        </label>
        <div className="flex gap-2">
          <div className="flex items-center px-3 bg-gray-100 border border-gray-300 rounded-l-lg">
            <span className="text-gray-600">+91</span>
          </div>
          <input
            type="tel"
            value={phoneNumber.replace('+91', '')}
            onChange={(e) => onPhoneChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="98765 43210"
            disabled={otpSent}
          />
          {!otpSent && (
            <button
              onClick={sendOTP}
              disabled={loading || phoneNumber.length < 10}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          )}
        </div>
      </div>

      {otpSent && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Enter the 6-digit code sent to +91 {phoneNumber}
          </p>
          <div className="flex gap-2 justify-center">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !digit && index > 0) {
                    inputRefs.current[index - 1]?.focus();
                  }
                }}
                className="w-12 h-12 text-center text-xl font-semibold border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                maxLength={1}
              />
            ))}
          </div>
          <button
            onClick={sendOTP}
            className="text-sm text-indigo-600 hover:underline"
          >
            Didn't receive code? Resend
          </button>
        </div>
      )}
    </div>
  );
}
```

---

### Phase 3: Enhanced Registration Flow

#### 3.1 New Step Components Structure
```
src/components/business/onboarding/
├── BusinessOnboardingWizard.tsx   # Main wizard container
├── steps/
│   ├── Step0_SmartSearch.tsx      # NEW: Google Places search
│   ├── Step1_PhoneVerify.tsx      # NEW: OTP verification
│   ├── Step2_BasicDetails.tsx     # Enhanced with pre-fill
│   ├── Step3_Location.tsx         # Enhanced with map
│   └── Step4_HoursMedia.tsx       # Combined hours + media
├── components/
│   ├── BusinessPreviewCard.tsx    # Live preview panel
│   ├── QuickHoursTemplate.tsx     # Quick hours selection
│   └── ProgressStepper.tsx        # Step indicator
└── hooks/
    └── useBusinessOnboarding.ts   # Shared state management
```

---

### Phase 4: Database Schema Updates

#### 4.1 New Columns for `businesses` Table
```sql
-- Add Google Places reference and verification status
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS google_place_id TEXT,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS claim_status TEXT DEFAULT 'manual' 
  CHECK (claim_status IN ('manual', 'claimed', 'google_matched'));

-- Index for Google Place ID lookups
CREATE INDEX IF NOT EXISTS idx_businesses_google_place_id 
ON businesses(google_place_id) WHERE google_place_id IS NOT NULL;

-- Comments
COMMENT ON COLUMN businesses.google_place_id IS 'Reference to Google Places API place_id for data linking';
COMMENT ON COLUMN businesses.phone_verified IS 'Whether business ownership was verified via phone OTP';
COMMENT ON COLUMN businesses.claim_status IS 'How the business was registered: manual entry, claimed from search, or matched from Google';
```

---

## Implementation Roadmap

### Sprint 1 (Week 1-2): Foundation
| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Set up Google Cloud Project | High | 2h | ⬜ |
| Get Places API key | High | 1h | ⬜ |
| Create `businessSearchService.ts` | High | 4h | ⬜ |
| Create `useBusinessSearch` hook | High | 3h | ⬜ |
| Add env variables | High | 0.5h | ⬜ |

### Sprint 2 (Week 3-4): UI Components
| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Build `Step0_SmartSearch` | High | 6h | ⬜ |
| Build `Step1_PhoneVerify` | High | 4h | ⬜ |
| Update `Step2_BasicDetails` with pre-fill | Medium | 3h | ⬜ |
| Add `BusinessPreviewCard` | Medium | 4h | ⬜ |
| Add `QuickHoursTemplate` | Low | 2h | ⬜ |

### Sprint 3 (Week 5-6): Integration
| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Integrate all steps into wizard | High | 4h | ⬜ |
| Add database migrations | High | 2h | ⬜ |
| Update submission logic | High | 3h | ⬜ |
| Testing & bug fixes | High | 8h | ⬜ |
| Mobile responsiveness | Medium | 4h | ⬜ |

---

## API Cost Monitoring

### Google Places API Budget
```
Free Tier (after March 2025): 10,000 requests/month

Expected Usage:
- Autocomplete: ~3 requests per business (typing)
- Place Details: 1 request per business (selection)
- Total per business: ~4 requests

Monthly Capacity: 10,000 / 4 = 2,500 businesses

Alert Thresholds:
- 50% (5,000 requests): Email notification
- 80% (8,000 requests): Slack alert
- 95% (9,500 requests): Disable autocomplete, show manual form
```

### Monitoring Dashboard
```javascript
// Track API usage in app
const trackPlacesApiCall = async (endpoint: string) => {
  await supabase.from('api_usage_logs').insert({
    api: 'google_places',
    endpoint,
    timestamp: new Date().toISOString()
  });
};
```

---

## Fallback Strategy

### When Google API is Unavailable or Limit Reached
```typescript
// src/services/businessSearchService.ts

export async function searchBusinessesWithFallback(query: string) {
  try {
    // Check if we have quota remaining
    const quotaCheck = await checkApiQuota('google_places');
    if (!quotaCheck.available) {
      throw new Error('API quota exceeded');
    }

    return await searchBusinesses(query);
  } catch (error) {
    // Fallback: Search our own database
    return await searchOwnDatabase(query);
  }
}

async function searchOwnDatabase(query: string) {
  const { data } = await supabase
    .from('businesses')
    .select('id, business_name, city, address')
    .ilike('business_name', `%${query}%`)
    .limit(5);

  return data?.map(b => ({
    place_id: `sync_${b.id}`,
    description: `${b.business_name}, ${b.city}`,
    structured_formatting: {
      main_text: b.business_name,
      secondary_text: b.address
    },
    isInternalResult: true
  })) || [];
}
```

---

## Success Metrics

### KPIs to Track
| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Onboarding completion rate | ~60% | 85% | Funnel analytics |
| Avg. time to complete | 8 min | 4 min | Session timing |
| Data accuracy | Unknown | 95% | Validation checks |
| Phone verification rate | 0% | 80% | OTP completion |
| Drop-off at Step 1 | ~20% | <10% | Funnel analytics |

---

## Security Considerations

### Phone Verification
- Rate limit OTP requests: 3 per hour per number
- OTP expiry: 5 minutes
- Block after 5 failed attempts
- Log all verification attempts

### Google API Key
- Restrict to referrer URLs
- Enable only Places API
- Set daily quota limits
- Monitor for unusual usage

---

## Related Documents

- [Yelp Business Onboarding Guide](./YELP_BUSINESS_ONBOARDING_GUIDE.md)
- [Business Data API Research - India](./BUSINESS_DATA_API_RESEARCH_INDIA.md)
- [Current Business Registration](../stories/STORY_4.1_Business_Registration.md)

---

*Last Updated: January 11, 2026*
