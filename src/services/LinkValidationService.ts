import { toast } from 'react-hot-toast'

interface ValidationResult {
    valid: boolean
    reason?: string
}

interface CacheEntry {
    safe: boolean
    timestamp: number
}

class LinkValidationService {
    private blockedDomains = [
        'bit.ly', // URL shorteners can be expanded first, but blocking for now as per story
        'tinyurl.com',
        'known-phishing-site.com',
        'malicious-example.com'
    ]

    private cache: Map<string, CacheEntry> = new Map()
    private readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

    /**
     * Validate all URLs in content
     */
    async validateUrls(content: string): Promise<ValidationResult> {
        const urlRegex = /(https?:\/\/[^\s]+)/g
        const urls = content.match(urlRegex) || []

        for (const url of urls) {
            try {
                const validation = await this.validateSingleUrl(url)
                if (!validation.valid) {
                    return validation
                }
            } catch (error) {
                console.error(`Invalid URL: ${url}`, error)
                // We technically shouldn't block for parsing errors unless strict, 
                // but for safety let's flag obvious malformed generic URLs if needed.
                // For now, if URL constructor fails, it might just be text resembling URL.
                // We continue gracefully.
            }
        }

        return { valid: true }
    }

    /**
     * Validate single URL with multiple checks
     */
    private async validateSingleUrl(url: string): Promise<ValidationResult> {
        let domain: string
        try {
            domain = new URL(url).hostname
        } catch {
            return { valid: true } // Not a valid URL structure, ignore
        }

        // 1. Check local blocklist (instant)
        // We check if the hostname *includes* the blocked domain to catch subdomains
        if (this.blockedDomains.some(blocked => domain.includes(blocked))) {
            return { valid: false, reason: `Link not allowed: ${domain}` }
        }

        // 2. Homograph/Punycode attack detection
        if (this.detectHomographAttack(url)) {
            return {
                valid: false,
                reason: 'Suspicious link detected (potential phishing)'
            }
        }

        // 3. Google Safe Browsing API (with cache)
        const isSafe = await this.checkSafeBrowsing(url)
        if (!isSafe) {
            return {
                valid: false,
                reason: 'This link has been flagged as unsafe'
            }
        }

        return { valid: true }
    }

    /**
     * Detect homograph/punycode phishing attacks (Industry Standard)
     */
    private detectHomographAttack(url: string): boolean {
        let domain: string
        try {
            domain = new URL(url).hostname
        } catch {
            return false
        }

        // Check 1: Punycode domains (xn--)
        if (domain.startsWith('xn--')) {
            console.warn(`⚠️ Punycode domain detected: ${domain}`)
            return true
        }

        // Check 2: Mixed scripts (e.g., Latin + Cyrillic)
        const hasCyrillic = /[\u0400-\u04FF]/.test(domain)
        const hasLatin = /[a-zA-Z]/.test(domain)
        const hasGreek = /[\u0370-\u03FF]/.test(domain)

        if ((hasCyrillic && hasLatin) || (hasGreek && hasLatin)) {
            console.warn(`⚠️ Mixed-script domain detected: ${domain}`)
            return true
        }

        // Check 3: Common phishing patterns in domain string
        const phishingPatterns = [
            /paypal.*secure/i,
            /amazon.*login/i,
            /facebook.*verify/i,
            /google.*account/i,
            /apple.*id/i
        ]

        if (phishingPatterns.some(pattern => pattern.test(domain))) {
            console.warn(`⚠️ Phishing pattern detected: ${domain}`)
            return true
        }

        return false
    }

    /**
     * Check URL against Google Safe Browsing API v4
     */
    private async checkSafeBrowsing(url: string): Promise<boolean> {
        let domain: string
        try {
            domain = new URL(url).hostname
        } catch {
            return true
        }

        // Check cache first
        const cached = this.cache.get(domain)
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.safe
        }

        try {
            const apiKey = import.meta.env.VITE_GOOGLE_SAFE_BROWSING_KEY
            if (!apiKey) {
                // Warn only once or in debug to avoid console spam, effectively failing open
                // console.warn('Safe Browsing API key not configured. Skipping API check.')
                return true
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
            )

            if (!response.ok) {
                throw new Error(`Safe Browsing API Error: ${response.statusText}`)
            }

            const data = await response.json()
            // If matches found, it's unsafe. If empty/no matches, it's safe.
            const isSafe = !data.matches || data.matches.length === 0

            // Cache result
            this.cache.set(domain, { safe: isSafe, timestamp: Date.now() })

            if (!isSafe) {
                console.error(`🚨 Malicious URL detected by Safe Browsing: ${url}`)
            }

            return isSafe
        } catch (error) {
            console.error('Safe Browsing integration error:', error)
            return true // Fail open
        }
    }
}

export const linkValidationService = new LinkValidationService()
