import { supabase } from '../lib/supabase'

/**
 * Spam detection result with details
 */
export interface SpamCheckResult {
    isSpam: boolean
    reason?: string
    severity?: 'low' | 'medium' | 'high'
    score?: number // 0.00-1.00
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
    allowed: boolean
    reason?: string
    retryAfter?: number // seconds
    violationType?: 'global' | 'conversation'
}

/**
 * Spam keyword from database
 */
interface SpamKeyword {
    id: string
    keyword: string
    severity: 'low' | 'medium' | 'high'
    action: 'flag' | 'block'
    is_active: boolean
}

/**
 * Spam pattern from database
 */
interface SpamPattern {
    id: string
    name: string
    pattern: string // Regex pattern
    severity: 'low' | 'medium' | 'high'
    is_active: boolean
}

/**
 * Spam statistics for admin dashboard
 */
export interface SpamStats {
    totalFlagged: number
    totalBlocked: number
    topKeywords: Array<{ keyword: string; count: number }>
    rateLimit违ations: number
    avgSpamScore: number
}

/**
 * SpamDetectionService
 * 
 * Provides spam detection functionality with:
 * - Keyword-based detection (dynamic from DB)
 * - Pattern matching (URLs, caps, repetition)
 * - Rate limiting checks (client-side pre-flight)
 * - Admin integration points for review workflow
 * 
 * @note This service includes placeholder functions for admin features
 * that will be implemented when the admin panel is ready.
 */
class SpamDetectionService {
    private keywordsCache: SpamKeyword[] | null = null
    private patternsCache: SpamPattern[] | null = null
    private cacheExpiry: number = 0
    private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

    /**
     * Main spam check - combines keyword and pattern detection
     * @param content Message content to check
     * @param senderId User ID of sender
     * @returns Spam check result with details
     */
    async isSpam(content: string, senderId: string): Promise<SpamCheckResult> {
        try {
            // 1. Check spam keywords
            const keywordResult = await this.checkKeywords(content)
            if (keywordResult.isSpam && keywordResult.severity === 'high') {
                return keywordResult // Block high-severity keywords immediately
            }

            // 2. Check spam patterns
            const patternResult = await this.checkPatterns(content)
            if (patternResult.isSpam) {
                return patternResult
            }

            // 3. Check for excessive links
            const linkResult = this.checkExcessiveLinks(content)
            if (linkResult.isSpam) {
                return linkResult
            }

            // 4. Check for repetitive text
            const repetitionResult = this.checkRepetitiveText(content)
            if (repetitionResult.isSpam) {
                return repetitionResult
            }

            // 5. Check for excessive caps
            const capsResult = this.checkExcessiveCaps(content)
            if (capsResult.isSpam) {
                return capsResult
            }

            // If keyword flagged (but not blocked), return flag result
            if (keywordResult.isSpam) {
                return keywordResult
            }

            return { isSpam: false }
        } catch (error) {
            console.error('[SpamDetection] Error checking spam:', error)
            // Fail open - don't block on error
            return { isSpam: false }
        }
    }

    /**
     * Check message content against spam keywords from database
     */
    private async checkKeywords(content: string): Promise<SpamCheckResult> {
        const keywords = await this.fetchKeywords()
        const lowerContent = content.toLowerCase()

        for (const kw of keywords) {
            if (lowerContent.includes(kw.keyword.toLowerCase())) {
                console.warn(`[SpamDetection] Keyword match: "${kw.keyword}" (${kw.severity})`)

                return {
                    isSpam: true,
                    reason: `Contains prohibited keyword: "${kw.keyword}"`,
                    severity: kw.severity,
                    score: kw.severity === 'high' ? 1.0 : kw.severity === 'medium' ? 0.7 : 0.4
                }
            }
        }

        return { isSpam: false }
    }

    /**
     * Check message against regex patterns
     */
    private async checkPatterns(content: string): Promise<SpamCheckResult> {
        const patterns = await this.fetchPatterns()

        for (const pattern of patterns) {
            try {
                const regex = new RegExp(pattern.pattern, 'gi')
                if (regex.test(content)) {
                    console.warn(`[SpamDetection] Pattern match: ${pattern.name}`)

                    return {
                        isSpam: true,
                        reason: `Matches spam pattern: ${pattern.name}`,
                        severity: pattern.severity,
                        score: pattern.severity === 'high' ? 0.9 : pattern.severity === 'medium' ? 0.6 : 0.3
                    }
                }
            } catch (error) {
                console.error(`[SpamDetection] Invalid regex pattern: ${pattern.name}`, error)
            }
        }

        return { isSpam: false }
    }

    /**
     * Check for excessive links (>3 URLs)
     */
    private checkExcessiveLinks(content: string): SpamCheckResult {
        const urlRegex = /https?:\/\/[^\s]+/gi
        const urls = content.match(urlRegex) || []

        if (urls.length > 3) {
            console.warn(`[SpamDetection] Excessive links detected: ${urls.length}`)
            return {
                isSpam: true,
                reason: `Too many links (${urls.length}). Maximum allowed: 3`,
                severity: 'high',
                score: 0.8
            }
        }

        return { isSpam: false }
    }

    /**
     * Check for repetitive text patterns
     */
    private checkRepetitiveText(content: string): SpamCheckResult {
        // Check for same character repeated 10+ times
        const repetitiveRegex = /(.)\1{9,}/g
        if (repetitiveRegex.test(content)) {
            console.warn('[SpamDetection] Repetitive characters detected')
            return {
                isSpam: true,
                reason: 'Message contains repetitive patterns',
                severity: 'medium',
                score: 0.6
            }
        }

        // Check for whole words repeated 5+ times
        const words = content.toLowerCase().split(/\s+/)
        const wordCounts = new Map<string, number>()

        for (const word of words) {
            if (word.length < 3) continue // Skip short words
            wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
        }

        for (const [word, count] of wordCounts.entries()) {
            if (count >= 5) {
                console.warn(`[SpamDetection] Word repeated ${count} times: "${word}"`)
                return {
                    isSpam: true,
                    reason: `Word "${word}" repeated too many times`,
                    severity: 'low',
                    score: 0.5
                }
            }
        }

        return { isSpam: false }
    }

    /**
     * Check for excessive capital letters
     */
    private checkExcessiveCaps(content: string): SpamCheckResult {
        if (content.length < 20) return { isSpam: false } // Skip short messages

        const letters = content.replace(/[^a-zA-Z]/g, '')
        if (letters.length === 0) return { isSpam: false }

        const caps = content.replace(/[^A-Z]/g, '')
        const capsRatio = caps.length / letters.length

        if (capsRatio > 0.7) {
            console.warn(`[SpamDetection] Excessive caps: ${Math.round(capsRatio * 100)}%`)
            return {
                isSpam: true,
                reason: 'Message contains excessive capital letters',
                severity: 'low',
                score: 0.4
            }
        }

        return { isSpam: false }
    }

    /**
     * Client-side rate limit check (pre-flight)
     * Prevents unnecessary network calls if rate limit would be hit
     */
    async checkRateLimits(conversationId: string): Promise<RateLimitResult> {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                return { allowed: false, reason: 'Not authenticated' }
            }

            const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()

            // Check global limit (10 messages/minute)
            const { count: globalCount } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('sender_id', user.id)
                .gte('created_at', oneMinuteAgo)

            if ((globalCount || 0) >= 10) {
                console.warn(`[RateLimit] Global limit exceeded for user ${user.id}`)
                return {
                    allowed: false,
                    reason: 'You are sending messages too quickly. Please wait a moment.',
                    retryAfter: 60,
                    violationType: 'global'
                }
            }

            // Check per-conversation limit (20 messages/minute)
            const { count: convoCount } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('sender_id', user.id)
                .eq('conversation_id', conversationId)
                .gte('created_at', oneMinuteAgo)

            if ((convoCount || 0) >= 20) {
                console.warn(`[RateLimit] Conversation limit exceeded for user ${user.id}`)
                return {
                    allowed: false,
                    reason: 'Too many messages in this chat. Please slow down.',
                    retryAfter: 60,
                    violationType: 'conversation'
                }
            }

            return { allowed: true }
        } catch (error) {
            console.error('[RateLimit] Error checking limits:', error)
            // Fail open - allow on error
            return { allowed: true }
        }
    }

    /**
     * Fetch spam keywords from database (with caching)
     */
    private async fetchKeywords(): Promise<SpamKeyword[]> {
        if (this.keywordsCache && Date.now() < this.cacheExpiry) {
            return this.keywordsCache
        }

        const { data, error } = await supabase
            .from('spam_keywords')
            .select('*')
            .eq('is_active', true)
            .order('severity', { ascending: false }) // High severity first

        if (error) {
            console.error('[SpamDetection] Error fetching keywords:', error)
            return []
        }

        this.keywordsCache = data || []
        this.cacheExpiry = Date.now() + this.CACHE_TTL
        return this.keywordsCache
    }

    /**
     * Fetch spam patterns from database (with caching)
     */
    private async fetchPatterns(): Promise<SpamPattern[]> {
        if (this.patternsCache && Date.now() < this.cacheExpiry) {
            return this.patternsCache
        }

        const { data, error } = await supabase
            .from('spam_patterns')
            .select('*')
            .eq('is_active', true)

        if (error) {
            console.error('[SpamDetection] Error fetching patterns:', error)
            return []
        }

        this.patternsCache = data || []
        return this.patternsCache
    }

    /**
     * Clear keyword and pattern cache (call after admin updates)
     */
    clearCache(): void {
        this.keywordsCache = null
        this.patternsCache = null
        this.cacheExpiry = 0
    }

    // ============================================================
    // ADMIN INTEGRATION POINTS
    // ⏸️ These functions are placeholders for future admin panel
    // ============================================================

    /**
     * Flag message for admin review
     * @note Admin Feature - Full implementation requires admin panel
     */
    async flagMessageForReview(
        messageId: string,
        reason: string,
        score: number
    ): Promise<void> {
        try {
            await supabase
                .from('messages')
                .update({
                    is_spam_flagged: true,
                    spam_reason: reason,
                    spam_score: score,
                    spam_flagged_at: new Date().toISOString()
                })
                .eq('id', messageId)

            console.log(`[SpamDetection] Flagged message ${messageId} for admin review`)
        } catch (error) {
            console.error('[SpamDetection] Error flagging message:', error)
        }
    }

    /**
     * Get spam statistics for admin dashboard
     * @note Admin Feature - Returns metrics for admin panel
     */
    async getSpamStats(): Promise<SpamStats> {
        try {
            // Count flagged messages
            const { count: flaggedCount } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('is_spam_flagged', true)

            // Count rate limit violations
            const { count: violationsCount } = await supabase
                .from('rate_limit_violations')
                .select('*', { count: 'exact', head: true })

            // Get average spam score
            const { data: avgData } = await supabase
                .from('messages')
                .select('spam_score')
                .eq('is_spam_flagged', true)

            const avgScore = avgData?.length
                ? avgData.reduce((sum, msg) => sum + (msg.spam_score || 0), 0) / avgData.length
                : 0

            return {
                totalFlagged: flaggedCount || 0,
                totalBlocked: 0, // TODO: Track blocked messages separately
                topKeywords: [], // TODO: Aggregate keyword triggers
                rateLimit违ations: violationsCount || 0,
                avgSpamScore: avgScore
            }
        } catch (error) {
            console.error('[SpamDetection] Error getting stats:', error)
            return {
                totalFlagged: 0,
                totalBlocked: 0,
                topKeywords: [],
                rateLimit违ations: 0,
                avgSpamScore: 0
            }
        }
    }

    /**
     * Get user's reputation score
     * @note Admin Feature - For admin review of user trustworthiness
     */
    async getUserReputation(userId: string): Promise<number> {
        try {
            const { data } = await supabase
                .from('user_reputation_scores')
                .select('reputation_score')
                .eq('user_id', userId)
                .single()

            return data?.reputation_score || 100
        } catch {
            return 100 // Default: trusted
        }
    }
}

export const spamDetectionService = new SpamDetectionService()
