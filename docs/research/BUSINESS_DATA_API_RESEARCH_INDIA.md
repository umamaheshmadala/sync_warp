# Business Data API Research for India Market

> **Research Date:** January 11, 2026  
> **Purpose:** Evaluate cost-effective options for business data integration in SynC's business onboarding flow  
> **Status:** ✅ Research Complete

---

## Executive Summary

This document evaluates options for populating business data (names, addresses, phone numbers) in SynC's business onboarding flow for the Indian market. The goal is to provide Yelp-like autocomplete functionality while minimizing costs during the MVP stage.

### Recommended Approach

**Hybrid Model using Google Places API + Manual Fallback**

1. **Primary:** Google Places API Autocomplete (10,000 free requests/month)
2. **Fallback:** User-generated "Add Your Business" manual entry
3. **Future:** Migrate to own database + Foursquare as backup

---

## How Yelp Gets Business Data (Reference)

Yelp does NOT pull from Google. They use independent data aggregators:

| Aggregator | Status | Data Provided |
|------------|--------|---------------|
| **Data Axle** (formerly Infogroup) | Active | Names, addresses, phone numbers, categories |
| **Neustar Localeze** | Active | Business listings, verification |
| **Acxiom** | Retired (2019) | Previously provided directory data |

### Data Sources for These Aggregators:
- Phone company business registrations
- Yellow Pages directories
- Chamber of Commerce registrations
- Business license registries (government records)
- Secretary of State business filings
- Post Office business address data

---

## Options Evaluated for India

### Option 1: Google Places API ⭐ RECOMMENDED

#### Pricing Changes (Important!)

**Until February 28, 2025:**
- $200 free credit/month across all Google Maps Platform APIs
- ~70,000 Autocomplete requests/month included free

**From March 1, 2025 (New Pricing):**
| Tier | Free Monthly Requests | Best For |
|------|----------------------|----------|
| **Essentials** | **10,000 requests/month** | Basic place search, autocomplete |
| Pro | 5,000 requests/month | Detailed place info |
| Enterprise | 1,000 requests/month | Premium features |

#### Features Available:
- ✅ Business name autocomplete (search as you type)
- ✅ Phone numbers
- ✅ Addresses
- ✅ Business hours
- ✅ Categories
- ✅ Photos
- ✅ Ratings & reviews
- ✅ **Excellent India coverage** (especially in cities)

#### Cost Analysis for SynC MVP:
```
Scenario: 100 businesses onboard per month
- Each business = ~3 autocomplete requests (typing, refining)
- Total = 300 requests/month
- Free tier: 10,000 requests
- VERDICT: ✅ MORE THAN ENOUGH for MVP
```

#### Limitations:
- ⚠️ Cannot cache/store data permanently (ToS restriction)
- ⚠️ Must display "Powered by Google" attribution
- ⚠️ After free tier: ~$2.83 per 1,000 requests

#### Implementation:
```typescript
// src/services/businessSearchService.ts
const GOOGLE_PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_KEY;

export async function searchBusinesses(query: string) {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?` +
    `input=${encodeURIComponent(query)}` +
    `&types=establishment` +
    `&components=country:in` + // Restrict to India
    `&key=${GOOGLE_PLACES_API_KEY}`
  );
  return (await response.json()).predictions;
}

export async function getBusinessDetails(placeId: string) {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?` +
    `place_id=${placeId}` +
    `&fields=name,formatted_phone_number,formatted_address,opening_hours,website,types` +
    `&key=${GOOGLE_PLACES_API_KEY}`
  );
  return (await response.json()).result;
}
```

---

### Option 2: Foursquare Places API

#### Free Tier:
- $200 free credits/month OR 10,000 Pro endpoint calls/month
- ~40,000 Core attribute requests/month

#### Pros:
- ✅ Good India coverage for restaurants, cafes, retail
- ✅ More permissive caching policies than Google
- ✅ Similar quality to Google

#### Cons:
- ⚠️ Less comprehensive than Google for Indian businesses
- ⚠️ Weaker coverage in Tier-2/Tier-3 cities

#### Verdict: Good backup option if Google becomes too expensive

---

### Option 3: OpenStreetMap + Nominatim (100% Free)

#### Cost: $0 (completely free and open source)

#### Data Sources:
- Download India OSM data from Geofabrik (updated daily)
- Self-host Nominatim for geocoding
- Use Overpass API for POI queries

#### Pros:
- ✅ Completely free forever
- ✅ Can store/cache data permanently (ODbL license)
- ✅ No API limits (self-hosted)

#### Cons:
- ⚠️ **Very limited business data in India** (mostly roads, landmarks)
- ⚠️ No phone numbers for most businesses
- ⚠️ No business hours
- ⚠️ Requires server infrastructure to self-host
- ⚠️ Data quality varies significantly by region

#### Verdict: ❌ Not suitable for business onboarding in India

---

### Option 4: Indian Directory Scrapers

#### Available Options:
| Provider | Source | Free Tier | Legal Status |
|----------|--------|-----------|--------------|
| Piloterr JustDial API | JustDial | 50 free requests | Grey area |
| Oxylabs Scraper | JustDial/IndiaMART | Free trial | Grey area |
| Apify Scraper | Multiple | Free trial | Grey area |
| BrightData | Multiple | Free trial | Grey area |

#### Data Available:
- Business names, phone numbers, addresses
- Customer reviews, ratings
- Business hours, categories

#### Pros:
- ✅ Excellent India-specific business data
- ✅ Covers local businesses not on Google

#### Cons:
- ⚠️ **Legal grey area** (ToS violations)
- ⚠️ Not sustainable for production
- ⚠️ Risk of being blocked
- ⚠️ Data can become stale

#### Verdict: ⛔ NOT RECOMMENDED for legitimate business

---

### Option 5: IndiaMART API

- **Cost:** Paid subscription only (Leader/Star membership required)
- **Focus:** B2B manufacturers, suppliers, wholesalers
- **Verdict:** ❌ Not relevant for SynC's local consumer business focus

---

### Option 6: Pure User-Generated (Manual Entry)

#### Cost: $0

#### How It Works:
1. User types business name manually
2. User enters phone number manually
3. User enters address manually
4. Verify via OTP/call

#### Pros:
- ✅ Zero external API costs
- ✅ Full data ownership
- ✅ Works anywhere in India (including rural areas)

#### Cons:
- ⚠️ More friction for users
- ⚠️ Slower onboarding experience
- ⚠️ Higher chance of typos/errors

#### Verdict: ✅ Essential as fallback, not primary

---

## Recommended Implementation

### Phase 1: MVP Launch (Hybrid Model)

```
┌─────────────────────────────────────────────────────────────┐
│                    User Flow Diagram                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User Types Business Name                                   │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────────────┐                               │
│  │ Google Places Autocomplete│                              │
│  └─────────────────────────┘                               │
│           │                                                 │
│     ┌─────┴─────┐                                          │
│     │           │                                          │
│     ▼           ▼                                          │
│  Match Found  No Match                                      │
│     │           │                                          │
│     ▼           ▼                                          │
│  Show         Show "Add New                                 │
│  Suggestions  Business" Option                              │
│     │           │                                          │
│     ▼           ▼                                          │
│  User Selects  User Enters                                  │
│  Business      Details Manually                             │
│     │           │                                          │
│     └─────┬─────┘                                          │
│           ▼                                                 │
│  Pre-fill/Collect Form Data                                │
│           │                                                 │
│           ▼                                                 │
│  OTP Verification via Phone                                 │
│           │                                                 │
│           ▼                                                 │
│  Business Onboarded & Stored in Supabase!                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Phase 2: Growth Stage (1000+ businesses)

When exceeding 10,000 requests/month:

| Option | Cost | Effort |
|--------|------|--------|
| **A: Pay Google** | ~$2.83/1K requests | None |
| **B: Switch to Foursquare** | Similar free tier | Medium |
| **C: Use Own Database First** | $0 | High |

**Recommended:** Option C - Query your own verified business database first, use Google only for NEW businesses not yet in your DB.

---

## Cost Projections

| Phase | Timeline | Monthly Businesses | API Calls | Monthly Cost |
|-------|----------|-------------------|-----------|--------------|
| MVP | 0-6 months | 0-500 | <5,000 | **$0** |
| Growth | 6-12 months | 500-2,000 | 5,000-15,000 | **$0-15** |
| Scale | 12+ months | 2,000+ | 15,000+ | **$15-50** |

---

## Action Items

- [ ] Create Google Cloud Project
- [ ] Enable Places API (New) 
- [ ] Set up billing with **$0 budget alert** (prevent accidental charges)
- [ ] Get API key and add to `.env`
- [ ] Implement hybrid onboarding flow
- [ ] Add "Powered by Google" attribution
- [ ] Set up usage monitoring dashboard
- [ ] Implement fallback manual entry flow

---

## Environment Variables Required

```env
# .env.local
VITE_GOOGLE_PLACES_KEY=your_api_key_here
```

---

## References

- [Google Maps Platform Pricing](https://mapsplatform.google.com/pricing/)
- [Google Places API Documentation](https://developers.google.com/maps/documentation/places/web-service)
- [Foursquare Places API](https://location.foursquare.com/developer/reference/places-api-overview)
- [OpenStreetMap India](https://openstreetmap.in/)

---

## Related Documents

- [Yelp Business Onboarding Guide](../research/YELP_BUSINESS_ONBOARDING_GUIDE.md) - Detailed analysis of Yelp's onboarding flow
- [Business Registration Flow](../stories/STORY_4.1_Business_Registration.md) - Current SynC implementation

---

*Last Updated: January 11, 2026*
