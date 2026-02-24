# STORY 18.7 — Create Cloudflare Worker Proxy for API Key Security

**Epic:** [EPIC 18 — Native Mobile Feel & Production Hardening](../epics/EPIC_18_Native_Mobile_Feel_Production_Hardening.md)  
**Status:** 📋 Ready  
**Priority:** 🟠 High  
**Estimate:** 5 story points  
**Dependencies:** None (18.6 depends on THIS story)  
**Audit Findings:** 5.7  

---

## 🎯 Goal

Create a Cloudflare Worker that proxies all Google API calls, keeping API keys server-side. Currently, two API keys are exposed in client code:

1. `VITE_GOOGLE_MAPS_API_KEY` — embedded in 6 source files
2. `VITE_GOOGLE_SAFE_BROWSING_KEY` — embedded in `LinkValidationService.ts`

Both are visible in browser DevTools (source code and Network tab). A Cloudflare Worker proxy sits between the client and Google's APIs, injecting the API key on the server side.

---

## 📍 Current State (What Exists)

### API keys exposed in client code — 7 locations

| File | Line | Key | Usage |
|------|------|-----|-------|
| [businessSearchService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/businessSearchService.ts) | 98 | `VITE_GOOGLE_MAPS_API_KEY` | Google Places Autocomplete + Details |
| [environment.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/config/environment.ts) | 108 | `VITE_GOOGLE_MAPS_API_KEY` | Environment config |
| [TargetingEditor.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/campaign/TargetingEditor.tsx) | 358 | `VITE_GOOGLE_MAPS_API_KEY` | Map component prop |
| [BusinessSearchInput.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/business/BusinessSearchInput.tsx) | 31 | `VITE_GOOGLE_MAPS_API_KEY` | autocomplete loader |
| [BusinessProfile.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/business/BusinessProfile.tsx) | 873, 875 | `VITE_GOOGLE_MAPS_API_KEY` | Map embed |
| [Step0_SmartSearch.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/business/onboarding/steps/Step0_SmartSearch.tsx) | 51 | `VITE_GOOGLE_MAPS_API_KEY` | autocomplete loader |
| [LinkValidationService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/LinkValidationService.ts) | 148, 156 | `VITE_GOOGLE_SAFE_BROWSING_KEY` | Safe Browsing REST API |

### How Google Maps JS SDK works (important constraint)

The Google Maps JavaScript SDK (`@react-google-maps/api`) loads via a `<script>` tag:
```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_KEY&libraries=places"></script>
```

**This cannot be fully proxied** — the Google Maps JS SDK requires the API key in the script URL, and the script is loaded directly from Google's CDN. However, you can restrict the key to specific domains/referrers via the Google Cloud Console.

**What CAN be proxied:**
- Safe Browsing API calls (REST API → proxy → Google)
- Google Places Details API (REST API → proxy → Google)
- Any future REST API calls

**What CANNOT be proxied:**
- Google Maps JavaScript SDK script tag loading (requires API key in URL)
- Client-side `google.maps.places.PlacesService` calls (SDK handles key internally after script load)

### Recommended strategy:

1. **Google Maps API key:** Restrict to app domains in Google Cloud Console (domain-locked)
2. **Safe Browsing API key:** Move to Cloudflare Worker proxy (full server-side)
3. **Future REST APIs:** Route through proxy

---

## 🔧 Implementation Details

### Step 1: Create Cloudflare Worker project

```bash
# Create a new Worker project
npx wrangler init sync-api-proxy
cd sync-api-proxy
```

### Step 2: Implement the proxy worker

**File:** `sync-api-proxy/src/index.ts` — **NEW**

```typescript
export interface Env {
  GOOGLE_SAFE_BROWSING_KEY: string;
  GOOGLE_MAPS_API_KEY: string;
  ALLOWED_ORIGINS: string; // comma-separated: "https://app.sync.com,http://localhost:5173"
}

// CORS headers
function corsHeaders(origin: string, env: Env): Record<string, string> {
  const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
  const isAllowed = allowedOrigins.includes(origin) || origin.startsWith('http://localhost');

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin, env),
      });
    }

    // Route: /api/safe-browsing
    if (url.pathname === '/api/safe-browsing' && request.method === 'POST') {
      return handleSafeBrowsing(request, env, origin);
    }

    // Route: /api/places/details
    if (url.pathname === '/api/places/details' && request.method === 'POST') {
      return handlePlacesDetails(request, env, origin);
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function handleSafeBrowsing(
  request: Request,
  env: Env,
  origin: string
): Promise<Response> {
  try {
    const { url: targetUrl } = await request.json<{ url: string }>();

    const response = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${env.GOOGLE_SAFE_BROWSING_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: { clientId: 'sync-app', clientVersion: '1.0.0' },
          threatInfo: {
            threatTypes: [
              'MALWARE',
              'SOCIAL_ENGINEERING',
              'UNWANTED_SOFTWARE',
              'POTENTIALLY_HARMFUL_APPLICATION',
            ],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{ url: targetUrl }],
          },
        }),
      }
    );

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin, env),
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Proxy error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin, env),
      },
    });
  }
}

async function handlePlacesDetails(
  request: Request,
  env: Env,
  origin: string
): Promise<Response> {
  try {
    const { placeId, fields } = await request.json<{
      placeId: string;
      fields: string[];
    }>();

    const fieldMask = fields.join(',');
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}?fields=${fieldMask}&key=${env.GOOGLE_MAPS_API_KEY}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-FieldMask': fieldMask,
        },
      }
    );

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin, env),
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Proxy error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin, env),
      },
    });
  }
}
```

### Step 3: Configure Cloudflare Worker secrets

```bash
# Set secrets (never stored in code)
npx wrangler secret put GOOGLE_SAFE_BROWSING_KEY
npx wrangler secret put GOOGLE_MAPS_API_KEY
npx wrangler secret put ALLOWED_ORIGINS
```

### Step 4: Deploy the Worker

```bash
npx wrangler deploy
```

The worker will be available at `https://sync-api-proxy.<your-account>.workers.dev`.

### Step 5: Update client to use proxy URL

Add the proxy URL to the app environment:

```env
VITE_API_PROXY_URL=https://sync-api-proxy.<your-account>.workers.dev/api
```

### Step 6: Lock down the Google Maps API key

In Google Cloud Console → API Credentials:
- Restrict `GOOGLE_MAPS_API_KEY` to:
  - **Application restriction:** HTTP referrers
  - **Allowed referrers:** `https://app.sync.com/*`, `http://localhost:*/*`, your Netlify URL
  - **API restrictions:** Maps JavaScript API, Places API only
- The Safe Browsing key no longer needs client restrictions (it's server-side)

---

## 🧪 Verification

### Proxy Deployment Test
1. Deploy the Worker: `npx wrangler deploy`
2. Test Safe Browsing endpoint:
   ```bash
   curl -X POST https://sync-api-proxy.<account>.workers.dev/api/safe-browsing \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com"}'
   ```
3. **Expected:** JSON response with no threat matches

### Client Integration Test
1. Update `LinkValidationService.ts` to use proxy (Story 18.6)
2. Send a message with a URL
3. Open DevTools → Network → filter for `safe-browsing`
4. **Before fix:** Request to `safebrowsing.googleapis.com` with `?key=...`
5. **After fix:** Request to proxy URL — no API key visible

### CORS Test
1. Open app from `http://localhost:5173` (dev)
2. Trigger a Safe Browsing check
3. **Expected:** No CORS errors (localhost is in allowed origins)

### Security Scan
1. Search dist/ for API key patterns:
   ```bash
   grep -rE "AIza[0-9A-Za-z_-]{35}" dist/assets/
   ```
2. **Expected:** No API keys in bundle (Safe Browsing key removed from client)
3. **Note:** Google Maps API key will still be in the script tag — this is acceptable because it's domain-locked

---

## ✅ Acceptance Criteria

- [ ] Cloudflare Worker deployed with `/api/safe-browsing` endpoint operational
- [ ] Safe Browsing API key fully server-side (not in client code)
- [ ] CORS configured correctly for production domain and localhost
- [ ] Google Maps API key restricted to specific domains in Google Cloud Console
- [ ] Client `LinkValidationService.ts` calls proxy instead of Google directly (Story 18.6)
- [ ] No `VITE_GOOGLE_SAFE_BROWSING_KEY` in client bundle
- [ ] Worker secrets properly configured via `wrangler secret`
- [ ] Error handling for proxy failures (fail-open for Safe Browsing)

---

## 📁 Files to Create / Modify

| File | Action |
|------|--------|
| `sync-api-proxy/src/index.ts` | **NEW** — Cloudflare Worker proxy |
| `sync-api-proxy/wrangler.toml` | **NEW** — Worker configuration |
| `.env` | MODIFY — add `VITE_API_PROXY_URL` |
| Google Cloud Console | MODIFY — restrict Maps API key to specific referrers |

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Cloudflare Worker cold start latency | Workers use V8 isolates, not containers. Cold starts are <5ms — negligible. |
| Worker downtime | Cloudflare Workers have 99.99% uptime SLA. Safe Browsing fails open (returns `true`) if proxy unreachable. |
| Google Maps JS SDK still needs client-side key | Restrict key to specific domains/referrers + limit to Maps JavaScript API only. This is the industry-standard approach for client-side map libraries. |
| Proxy adds extra network hop | The Worker runs on Cloudflare's edge network close to the user. Latency increase is <10ms. |

---

## 📝 Important Note on Google Maps API Key

The `VITE_GOOGLE_MAPS_API_KEY` used by `@react-google-maps/api` **cannot be fully removed from the client** because the Google Maps JavaScript SDK requires it in the `<script>` tag for authentication. The industry-standard mitigation is:

1. **Domain-lock the key** in Google Cloud Console (HTTP referrer restrictions)
2. **Limit API access** to only Maps JavaScript API and Places API
3. **Set quota limits** to prevent abuse

This is how major companies (Airbnb, Uber, DoorDash) handle Google Maps API keys in their web apps.
