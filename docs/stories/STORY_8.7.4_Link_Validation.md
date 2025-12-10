# 🛡️ STORY 8.7.4: Link Validation Safety

**Parent Epic:** [EPIC 8.7 - Moderation & Safety](../epics/EPIC_8.7_Moderation_Safety.md)
**Priority:** P2 - Medium
**Estimated Effort:** 1 Day

---

## 🎯 **Goal**
Prevent the spread of malicious links, phishing scams, and unwanted URL shorteners. Validate all URLs before they are sent and block known bad domains.

---

## 📋 **Acceptance Criteria**

### 1. Validation Logic
- [ ] **Domain Blocklist**: Block known malicious domains  
- [ ] **Protocol Check**: Ensure URLs are well-formed (http/https)
- [ ] **Homograph Detection**: Detect punycode and mixed-script phishing attempts
- [ ] **Safe Browsing API**: Integrate Google Safe Browsing API for real-time threat detection

### 2. User Feedback
- [ ] If link is blocked → Toast: "This link is not allowed for safety reasons"
- [ ] If link is suspicious → Warning badge/tooltip (non-blocking)

---

## 🧩 **Implementation Details**

### 1. Link Validation Service (Enhanced)

**Industry Standard:** Hybrid approach (local blocklist + API + homograph detection)

```typescript
class LinkValidationService {
  private blockedDomains = [
    'bit.ly', // URL shorteners can be expanded first (see deep analysis)
    'tinyurl.com',
    'known-phishing-site.com'
  ];

  private cache: Map<string, { safe: boolean; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Validate all URLs in content
   */
  async validateUrls(content: string): Promise<{ valid: boolean; reason?: string }> {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlRegex) || [];

    for (const url of urls) {
      try {
        const validation = await this.validateSingleUrl(url);
        if (!validation.valid) {
          return validation;
        }
      } catch (error) {
        console.error(`Invalid URL: ${url}`, error);
        return { valid: false, reason: 'Malformed URL detected' };
      }
    }

    return { valid: true };
  }

  /**
   * Validate single URL with multiple checks
   */
  private async validateSingleUrl(url: string): Promise<{ valid: boolean; reason?: string }> {
    const domain = new URL(url).hostname;

    // 1. Check local blocklist (instant)
    if (this.blockedDomains.some(blocked => domain.includes(blocked))) {
      return { valid: false, reason: `Blocked domain: ${domain}` };
    }

    // 2. Homograph/Punycode attack detection
    if (this.detectHomographAttack(url)) {
      return { 
        valid: false, 
        reason: 'Suspicious domain detected (possible phishing)' 
      };
    }

    // 3. Google Safe Browsing API (with cache)
    const isSafe = await this.checkSafeBrowsing(url);
    if (!isSafe) {
      return { 
        valid: false, 
        reason: 'This link has been flagged as malicious' 
      };
    }

    return { valid: true };
  }

  /**
   * Detect homograph/punycode phishing attacks (Industry Standard)
   */
  private detectHomographAttack(url: string): boolean {
    const domain = new URL(url).hostname;

    // Check 1: Punycode domains (xn--)
    if (domain.startsWith('xn--')) {
      console.warn(`⚠️ Punycode domain detected: ${domain}`);
      return true;
    }

    // Check 2: Mixed scripts (e.g., Latin + Cyrillic)
    const hasCyrillic = /[\u0400-\u04FF]/.test(domain);
    const hasLatin = /[a-zA-Z]/.test(domain);
    const hasGreek = /[\u0370-\u03FF]/.test(domain);

    if ((hasCyrillic && hasLatin) || (hasGreek && hasLatin)) {
      console.warn(`⚠️ Mixed-script domain detected: ${domain}`);
      return true;
    }

    // Check 3: Common phishing patterns
    const phishingPatterns = [
      /paypal.*secure/i,
      /amazon.*login/i,
      /facebook.*verify/i,
      /google.*account/i
    ];

    if (phishingPatterns.some(pattern => pattern.test(domain))) {
      console.warn(`⚠️ Phishing pattern detected: ${domain}`);
      return true;
    }

    return false;
  }

  /**
   * Check URL against Google Safe Browsing API v4
   */
  private async checkSafeBrowsing(url: string): Promise<boolean> {
    const domain = new URL(url).hostname;

    // Check cache first
    const cached = this.cache.get(domain);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.safe;
    }

    try {
      const apiKey = import.meta.env.VITE_GOOGLE_SAFE_BROWSING_KEY;
      if (!apiKey) {
        console.warn('Safe Browsing API key not configured. Skipping API check.');
        return true; // Fail open if no API key
      }

      const response = await fetch(
        `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client: {
              clientId: 'sync-app',
              clientVersion: '1.0.0'
            },
            threatInfo: {
              threatTypes: [
                'MALWARE',
                'SOCIAL_ENGINEERING',
                'UNWANTED_SOFTWARE',
                'POTENTIALLY_HARMFUL_APPLICATION'
              ],
              platformTypes: ['ANY_PLATFORM'],
              threatEntryTypes: ['URL'],
              threatEntries: [{ url }]
            }
          })
        }
      );

      const data = await response.json();
      const isSafe = !data.matches || data.matches.length === 0;

      // Cache result
      this.cache.set(domain, { safe: isSafe, timestamp: Date.now() });

      if (!isSafe) {
        console.error(`🚨 Malicious URL detected by Safe Browsing: ${url}`);
      }

      return isSafe;
    } catch (error) {
      console.error('Safe Browsing API error:', error);
      return true; // Fail open on API errors
    }
  }
}

export const linkValidationService = new LinkValidationService();
```

### 2. Environment Configuration

```bash
# Add to .env
VITE_GOOGLE_SAFE_BROWSING_KEY=your_api_key_here
```

**Get API Key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable "Safe Browsing API"
3. Create API Key (restrict to Safe Browsing API only)
4. Free tier: 10,000 lookups/day

### 3. Integration

```typescript
// In useSendMessage.ts
const linkValidation = await linkValidationService.validateUrls(data.content);
if (!linkValidation.valid) {
  toast.error(linkValidation.reason || 'Message contains invalid links');
  return;
}
```

---
---

## 🤖 **MCP Integration Strategy**

### Chrome DevTools MCP
- **Debug**: `warp mcp run chrome "console.log(linkValidationService.validateUrls('http://bit.ly/test'))"`

---

## 🧪 **Testing Plan**

### Manual Verification
1.  **Blocklist**: Try to send "Check this http://bit.ly/123". Verify error toast.
2.  **Valid Link**: Send "Check google.com". Verify success.
3.  **Mixed Content**: "Hello bit.ly/123 world". Verify block.

---

## ✅ **Definition of Done**
- [ ] `LinkValidationService` implemented.
- [ ] Local blocklist configured.
- [ ] Users prevented from sending blocked links.
