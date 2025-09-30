/**
 * Rate Limit Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimitError } from '../rateLimitService';

// Mock supabase - must be done before importing the service
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

// Import after mocking
import { rateLimitService } from '../rateLimitService';

describe('RateLimitService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('should return allowed when under limit', async () => {
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          allowed: true,
          limit: 100,
          remaining: 95,
          reset_at: new Date(Date.now() + 60000).toISOString(),
          retry_after: null,
          endpoint: 'test/endpoint',
        },
        error: null,
      });

      const result = await rateLimitService.checkRateLimit(
        'test/endpoint',
        'user-123'
      );

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(95);
      expect(result.limit).toBe(100);
    });

    it('should return not allowed when limit exceeded', async () => {
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          allowed: false,
          limit: 100,
          remaining: 0,
          reset_at: new Date(Date.now() + 60000).toISOString(),
          retry_after: 60,
          endpoint: 'test/endpoint',
        },
        error: null,
      });

      const result = await rateLimitService.checkRateLimit(
        'test/endpoint',
        'user-123'
      );

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBe(60);
    });

    it('should handle errors gracefully', async () => {
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await rateLimitService.checkRateLimit(
        'test/endpoint',
        'user-123'
      );

      // Should allow on error
      expect(result.allowed).toBe(true);
    });
  });

  describe('enforceRateLimit', () => {
    it('should not throw when under limit', async () => {
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({
          data: {
            allowed: true,
            limit: 100,
            remaining: 95,
            reset_at: new Date(Date.now() + 60000).toISOString(),
            retry_after: null,
            endpoint: 'test/endpoint',
          },
          error: null,
        })
        .mockResolvedValueOnce({ data: null, error: null });

      await expect(
        rateLimitService.enforceRateLimit('test/endpoint', 'user-123')
      ).resolves.not.toThrow();
    });

    it('should throw RateLimitError when limit exceeded', async () => {
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          allowed: false,
          limit: 100,
          remaining: 0,
          reset_at: new Date(Date.now() + 60000).toISOString(),
          retry_after: 60,
          endpoint: 'test/endpoint',
        },
        error: null,
      });

      await expect(
        rateLimitService.enforceRateLimit('test/endpoint', 'user-123')
      ).rejects.toThrow(RateLimitError);
    });

    it('should include retry information in error', async () => {
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          allowed: false,
          limit: 100,
          remaining: 0,
          reset_at: new Date(Date.now() + 60000).toISOString(),
          retry_after: 120,
          endpoint: 'test/endpoint',
        },
        error: null,
      });

      try {
        await rateLimitService.enforceRateLimit('test/endpoint', 'user-123');
        expect.fail('Should have thrown RateLimitError');
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect((error as RateLimitError).retryAfter).toBe(120);
        expect((error as RateLimitError).limit).toBe(100);
      }
    });
  });

  describe('recordRequest', () => {
    it('should record request successfully', async () => {
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
      });

      await rateLimitService.recordRequest('test/endpoint', 'user-123');

      expect(supabase.rpc).toHaveBeenCalledWith(
        'record_rate_limit_request',
        expect.objectContaining({
          p_endpoint: 'test/endpoint',
          p_user_id: 'user-123',
        })
      );
    });

    it('should handle recording errors gracefully', async () => {
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Recording failed' },
      });

      // Should not throw
      await expect(
        rateLimitService.recordRequest('test/endpoint', 'user-123')
      ).resolves.not.toThrow();
    });
  });

  describe('getIpAddress', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const headers = new Headers();
      headers.set('x-forwarded-for', '192.168.1.1, 10.0.0.1');

      const ip = rateLimitService.getIpAddress(headers);

      expect(ip).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const headers = new Headers();
      headers.set('x-real-ip', '192.168.1.1');

      const ip = rateLimitService.getIpAddress(headers);

      expect(ip).toBe('192.168.1.1');
    });

    it('should extract IP from cf-connecting-ip header', () => {
      const headers = new Headers();
      headers.set('cf-connecting-ip', '192.168.1.1');

      const ip = rateLimitService.getIpAddress(headers);

      expect(ip).toBe('192.168.1.1');
    });

    it('should return undefined when no IP header present', () => {
      const headers = new Headers();

      const ip = rateLimitService.getIpAddress(headers);

      expect(ip).toBeUndefined();
    });

    it('should work with object headers', () => {
      const headers = {
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      };

      const ip = rateLimitService.getIpAddress(headers);

      expect(ip).toBe('192.168.1.1');
    });
  });

  describe('formatRateLimitHeaders', () => {
    it('should format rate limit headers correctly', () => {
      const result = {
        allowed: true,
        limit: 100,
        remaining: 95,
        resetAt: '2024-01-01T12:00:00Z',
        retryAfter: null,
        endpoint: 'test/endpoint',
      };

      const headers = rateLimitService.formatRateLimitHeaders(result);

      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(headers['X-RateLimit-Remaining']).toBe('95');
      expect(headers['X-RateLimit-Reset']).toBeDefined();
    });

    it('should include retry-after when rate limited', () => {
      const result = {
        allowed: false,
        limit: 100,
        remaining: 0,
        resetAt: '2024-01-01T12:00:00Z',
        retryAfter: 60,
        endpoint: 'test/endpoint',
      };

      const headers = rateLimitService.formatRateLimitHeaders(result);

      expect(headers['Retry-After']).toBe('60');
    });

    it('should handle null values', () => {
      const result = {
        allowed: true,
        limit: null,
        remaining: null,
        resetAt: null,
        retryAfter: null,
        endpoint: 'test/endpoint',
      };

      const headers = rateLimitService.formatRateLimitHeaders(result);

      expect(headers['X-RateLimit-Limit']).toBeUndefined();
      expect(headers['X-RateLimit-Remaining']).toBeUndefined();
      expect(headers['X-RateLimit-Reset']).toBeUndefined();
    });
  });

  describe('RateLimitError', () => {
    it('should create error with correct properties', () => {
      const error = new RateLimitError('Rate limit exceeded', 60, 100, '2024-01-01T12:00:00Z');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.statusCode).toBe(429);
      expect(error.retryAfter).toBe(60);
      expect(error.limit).toBe(100);
      expect(error.resetAt).toBe('2024-01-01T12:00:00Z');
    });

    it('should have correct error name', () => {
      const error = new RateLimitError('Test');

      expect(error.name).toBe('RateLimitError');
    });
  });
});