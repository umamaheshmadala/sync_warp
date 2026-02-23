# STORY 17.6 — Fix HTML Meta: Add Description, Remove Duplicate, Enable tel: Links

**Epic:** [EPIC 17 — FAANG UX, Accessibility & Build Config](../epics/EPIC_17_FAANG_UX_Accessibility_Build_Config.md)  
**Status:** 📋 Ready  
**Priority:** 🟡 Medium  
**Estimate:** 1 story point  
**Dependencies:** None  
**Audit Findings:** 7.7, 7.13, 7.14  

---

## 🎯 Goal

Fix three HTML meta tag issues:
1. **Missing `<meta name="description">`** — SEO gap; search engines and social cards show no description.
2. **Duplicate `mobile-web-app-capable`** — same tag appears twice (lines 9 and 25) in `index.html`.
3. **`format-detection: telephone=no`** — prevents phone numbers from being clickable on mobile. Remove this restriction and wrap business phone numbers in `<a href="tel:">` links.

---

## 📍 Current State (What Exists)

[index.html](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/index.html):

### Missing meta description

No `<meta name="description">` exists anywhere in `index.html`. The only text is the `<title>`:

```html
<!-- Line 26 -->
<title>SynC - Connect, Collaborate, Create</title>
```

### Duplicate `mobile-web-app-capable`

```html
<!-- Line 9 (first occurrence) -->
<meta name="mobile-web-app-capable" content="yes" />

<!-- Line 25 (duplicate — under "PWA / Android Specific" comment) -->
<meta name="mobile-web-app-capable" content="yes" />
```

### `format-detection: telephone=no`

```html
<!-- Line 19 — blocks clickable phone numbers -->
<meta name="format-detection" content="telephone=no" />
<meta name="format-detection" content="date=no" />
<meta name="format-detection" content="address=no" />
<meta name="format-detection" content="email=no" />
```

`telephone=no` prevents iOS Safari from auto-detecting and linking phone numbers. While this prevents false positives (random numbers being linked), it also prevents legitimate business phone numbers from being tappable. The fix: remove the `telephone=no` restriction and explicitly use `<a href="tel:">` for number display.

### Business phone display — plain text (no `tel:` link)

[BusinessPreviewCard.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/business/onboarding/components/BusinessPreviewCard.tsx) — Lines 211-215:

```tsx
{phone && (
    <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
        <Phone className="w-4 h-4 flex-shrink-0 text-gray-400" />
        <span>{phone}</span>              <!-- ← Plain text, not clickable -->
    </div>
)}
```

No `href="tel:"` link exists anywhere in the codebase (verified via grep).

---

## 🔧 Implementation Details

### Step 1: Add `<meta name="description">`

**File:** [index.html](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/index.html) — Add after line 5 (after the favicon link):

```diff
 <link rel="icon" type="image/svg+xml" href="/logo.svg" />
+<meta name="description" content="SynC connects you with local businesses. Discover offers, check in, message business owners, and earn loyalty rewards — all in one app." />
 <meta name="viewport" ...
```

### Step 2: Remove duplicate `mobile-web-app-capable`

**File:** [index.html](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/index.html) — Delete line 25 (the entire duplicate section):

```diff
-    <!-- PWA / Android Specific -->
-    <meta name="mobile-web-app-capable" content="yes" />
```

Keep the first occurrence on line 9.

### Step 3: Change `format-detection: telephone=no` to allow tel: links

**File:** [index.html](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/index.html) — Line 19:

```diff
-<meta name="format-detection" content="telephone=no" />
+<meta name="format-detection" content="telephone=yes" />
```

Alternatively, remove this line entirely (iOS Safari's default behavior is `telephone=yes`).

Keep `date=no`, `address=no`, and `email=no` — these prevent false-positive linking of dates, addresses, and emails.

### Step 4: Wrap business phone numbers in `<a href="tel:">` links

**File:** [BusinessPreviewCard.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/business/onboarding/components/BusinessPreviewCard.tsx) — Lines 211-215:

```diff
 {phone && (
     <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
         <Phone className="w-4 h-4 flex-shrink-0 text-gray-400" />
-        <span>{phone}</span>
+        <a href={`tel:${phone}`} className="text-indigo-600 hover:underline">
+            {phone}
+        </a>
     </div>
 )}
```

Search for any other components that display business phone numbers and apply the same pattern:

```bash
grep -rn "phone" src/components/business/ --include="*.tsx" | grep -i "span\|div" | grep -v "test\|__tests__"
```

Components to check:
- `BusinessPreviewCard.tsx` (line 214) — **confirmed above**
- `ClaimBusinessButton.tsx` (line 183) — shows `businessPhone` as text
- Any consumer-facing business profile page

---

## 🧪 Verification

### Meta Tag Checks
1. Build and inspect `dist/index.html`
2. **Description:** Search for `<meta name="description"` → Should exist with content
3. **Duplicate:** Search for `mobile-web-app-capable` → Should appear exactly once
4. **Format detection:** Search for `telephone` → Should be `telephone=yes` or absent

### SEO Check
1. Open Chrome DevTools → Lighthouse → SEO
2. **Before fix:** Flags "Document does not have a meta description"
3. **After fix:** SEO check passes

### Phone Link Test
1. Navigate to a business profile with a phone number displayed
2. **Before fix:** Phone number is plain text
3. **After fix:** Phone number is an indigo-colored link
4. Tap/click the link → **Expected:** Phone dialer opens (mobile) or system dialog (desktop)

### Social Sharing Preview
1. Copy the app URL
2. Paste into WhatsApp/Telegram/Slack → **Expected:** Preview card shows the description text

---

## ✅ Acceptance Criteria

- [ ] `<meta name="description">` present in `index.html` with meaningful content
- [ ] Only ONE `<meta name="mobile-web-app-capable">` tag in `index.html`
- [ ] `format-detection: telephone=yes` (or tag removed) to allow clickable phone numbers
- [ ] Business phone numbers wrapped in `<a href="tel:">` links
- [ ] Phone links are styled (indigo color, hover underline)
- [ ] Lighthouse SEO does not flag missing meta description
- [ ] Phone links open the dialer on mobile devices

---

## 📁 Files to Modify

| File | Action |
|------|--------|
| [index.html](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/index.html) | MODIFY — add description meta, remove duplicate mobile-web-app-capable, fix telephone format-detection |
| [BusinessPreviewCard.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/business/onboarding/components/BusinessPreviewCard.tsx) | MODIFY — wrap phone in `<a href="tel:">` |
| Other business profile components displaying phone numbers | MODIFY — wrap phone in `<a href="tel:">` |
