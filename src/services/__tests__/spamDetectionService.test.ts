
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { spamDetectionService } from '../spamDetectionService';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn(),
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    order: vi.fn().mockResolvedValue({ data: [], error: null }), // fetchKeywords
                    gte: vi.fn().mockResolvedValue({ count: 5 }), // checkRateLimits
                })),
                gte: vi.fn().mockResolvedValue({ count: 5 }), // checkRateLimits global
            })),
            update: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
            })),
        })),
    },
}));

describe('SpamDetectionService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset cache between tests
        (spamDetectionService as any).keywordsCache = null;
        (spamDetectionService as any).patternsCache = null;
    });

    it('checkExcessiveCaps should flag messages with too many caps', async () => {
        const result = await spamDetectionService.isSpam('THIS IS A VERY LOUD MESSAGE WITH TOO MANY CAPITAL LETTERS', 'user-1');
        expect(result.isSpam).toBe(true);
        expect(result.reason).toContain('excessive capital letters');
    });

    it('checkExcessiveLinks should flag messages with >3 links', async () => {
        const content = 'Check out https://a.com, https://b.com, https://c.com, and https://d.com';
        const result = await spamDetectionService.isSpam(content, 'user-1');
        expect(result.isSpam).toBe(true);
        expect(result.reason).toContain('Too many links');
    });

    it('checkRepetitiveText should flag repeated characters', async () => {
        const content = 'Heeeeeeeeeeeeeeeeeeello';
        const result = await spamDetectionService.isSpam(content, 'user-1');
        expect(result.isSpam).toBe(true);
        expect(result.reason).toContain('repetitive patterns');
    });

    it('checkRateLimits should pass if count is low', async () => {
        (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'user-1' } } });

        // Mock DB response for rate limit count
        const selectMock = vi.fn().mockReturnValue({
            // Global limit check
            gte: vi.fn().mockResolvedValue({ count: 5 }),
            // Conversation limit check
            eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockResolvedValue({ count: 10 })
            })
        });

        (supabase.from as any).mockReturnValue({
            select: vi.fn(() => ({
                eq: selectMock
            }))
        });

        const result = await spamDetectionService.checkRateLimits('conv-1');
        expect(result.allowed).toBe(true);
    });
});
