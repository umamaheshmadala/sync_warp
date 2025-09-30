/**
 * Tests for useRateLimit Hook
 * 
 * Tests the React hook that integrates rate limiting into components
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRateLimit, useRateLimitStatus } from '../useRateLimit';
import { rateLimitService, RateLimitError } from '../../services/rateLimitService';

// Mock the rate limit service
vi.mock('../../services/rateLimitService', () => ({
  rateLimitService: {
    getRateLimitInfo: vi.fn(),
    enforceRateLimit: vi.fn(),
  },
  RateLimitError: class extends Error {
    constructor(message: string, public retryAfter: number) {
      super(message);
      this.name = 'RateLimitError';
    }
  },
}));

// Mock the auth store
vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'test-user-id' }
  })),
}));

describe('useRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useRateLimit({ endpoint: 'test/endpoint' }));

      expect(result.current.rateLimitInfo).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isRateLimited).toBe(false);
      expect(result.current.remainingRequests).toBeNull();
      expect(result.current.resetAt).toBeNull();
      expect(result.current.retryAfter).toBeNull();
    });

    it('should have check and enforce methods', () => {
      const { result } = renderHook(() => useRateLimit({ endpoint: 'test/endpoint' }));

      expect(typeof result.current.checkRateLimit).toBe('function');
      expect(typeof result.current.enforceRateLimit).toBe('function');
    });
  });

  describe('autoCheck', () => {
    it('should automatically check rate limit when autoCheck is true', async () => {
      const mockRateLimitInfo = {
        allowed: true,
        remaining: 10,
        limit: 10,
        resetAt: new Date().toISOString(),
        endpoint: 'test/endpoint',
      };

      vi.mocked(rateLimitService.getRateLimitInfo).mockResolvedValue(mockRateLimitInfo);

      const { result } = renderHook(() => 
        useRateLimit({ endpoint: 'test/endpoint', autoCheck: true })
      );

      await waitFor(() => {
        expect(result.current.rateLimitInfo).toEqual(mockRateLimitInfo);
      });

      expect(rateLimitService.getRateLimitInfo).toHaveBeenCalledWith(
        'test/endpoint',
        'test-user-id'
      );
    });

    it('should not check automatically when autoCheck is false', () => {
      renderHook(() => 
        useRateLimit({ endpoint: 'test/endpoint', autoCheck: false })
      );

      expect(rateLimitService.getRateLimitInfo).not.toHaveBeenCalled();
    });
  });

  describe('checkRateLimit', () => {
    it('should fetch rate limit information', async () => {
      const mockRateLimitInfo = {
        allowed: true,
        remaining: 5,
        limit: 10,
        resetAt: new Date().toISOString(),
        endpoint: 'test/endpoint',
      };

      vi.mocked(rateLimitService.getRateLimitInfo).mockResolvedValue(mockRateLimitInfo);

      const { result } = renderHook(() => useRateLimit({ endpoint: 'test/endpoint' }));

      let returnedInfo;
      await act(async () => {
        returnedInfo = await result.current.checkRateLimit();
      });

      expect(returnedInfo).toEqual(mockRateLimitInfo);
      expect(result.current.rateLimitInfo).toEqual(mockRateLimitInfo);
      expect(result.current.remainingRequests).toBe(5);
    });

    it('should set loading state during check', async () => {
      let resolvePromise: any;
      vi.mocked(rateLimitService.getRateLimitInfo).mockImplementation(() => 
        new Promise(resolve => { resolvePromise = resolve; })
      );

      const { result } = renderHook(() => useRateLimit({ endpoint: 'test/endpoint' }));

      let checkPromise: Promise<any>;
      act(() => {
        checkPromise = result.current.checkRateLimit();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await act(async () => {
        resolvePromise({
          allowed: true,
          remaining: 5,
          limit: 10,
          resetAt: new Date().toISOString(),
          endpoint: 'test/endpoint',
        });
        await checkPromise!;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Check failed');
      vi.mocked(rateLimitService.getRateLimitInfo).mockRejectedValue(error);

      const { result } = renderHook(() => useRateLimit({ endpoint: 'test/endpoint' }));

      await expect(result.current.checkRateLimit()).rejects.toThrow('Check failed');

      await waitFor(() => {
        expect(result.current.error).toEqual(error);
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('enforceRateLimit', () => {
    it('should enforce rate limit successfully when allowed', async () => {
      const mockRateLimitInfo = {
        allowed: true,
        remaining: 9,
        limit: 10,
        resetAt: new Date().toISOString(),
        endpoint: 'test/endpoint',
      };

      vi.mocked(rateLimitService.enforceRateLimit).mockResolvedValue(undefined);
      vi.mocked(rateLimitService.getRateLimitInfo).mockResolvedValue(mockRateLimitInfo);

      const { result } = renderHook(() => useRateLimit({ endpoint: 'test/endpoint' }));

      await act(async () => {
        await result.current.enforceRateLimit();
      });

      expect(rateLimitService.enforceRateLimit).toHaveBeenCalledWith(
        'test/endpoint',
        'test-user-id'
      );
      expect(result.current.rateLimitInfo).toEqual(mockRateLimitInfo);
    });

    it('should throw RateLimitError when limit exceeded', async () => {
      const rateLimitError = new RateLimitError('Rate limit exceeded', 60);
      vi.mocked(rateLimitService.enforceRateLimit).mockRejectedValue(rateLimitError);

      const { result } = renderHook(() => useRateLimit({ endpoint: 'test/endpoint' }));

      await expect(result.current.enforceRateLimit()).rejects.toThrow('Rate limit exceeded');

      await waitFor(() => {
        expect(result.current.error).toEqual(rateLimitError);
      });
    });

    it('should set loading state during enforcement', async () => {
      let resolveEnforce: any;
      vi.mocked(rateLimitService.enforceRateLimit).mockImplementation(() => 
        new Promise(resolve => { resolveEnforce = resolve; })
      );
      vi.mocked(rateLimitService.getRateLimitInfo).mockResolvedValue({
        allowed: true,
        remaining: 9,
        limit: 10,
        resetAt: new Date().toISOString(),
        endpoint: 'test/endpoint',
      });

      const { result } = renderHook(() => useRateLimit({ endpoint: 'test/endpoint' }));

      let enforcePromise: Promise<any>;
      act(() => {
        enforcePromise = result.current.enforceRateLimit();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await act(async () => {
        resolveEnforce();
        await enforcePromise!;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('computed values', () => {
    it('should compute isRateLimited correctly when not allowed', async () => {
      const mockRateLimitInfo = {
        allowed: false,
        remaining: 0,
        limit: 10,
        resetAt: new Date().toISOString(),
        endpoint: 'test/endpoint',
        retryAfter: 60,
      };

      vi.mocked(rateLimitService.getRateLimitInfo).mockResolvedValue(mockRateLimitInfo);

      const { result } = renderHook(() => useRateLimit({ endpoint: 'test/endpoint' }));

      await result.current.checkRateLimit();

      await waitFor(() => {
        expect(result.current.isRateLimited).toBe(true);
        expect(result.current.remainingRequests).toBe(0);
        expect(result.current.retryAfter).toBe(60);
      });
    });

    it('should compute isRateLimited correctly when allowed', async () => {
      const mockRateLimitInfo = {
        allowed: true,
        remaining: 5,
        limit: 10,
        resetAt: new Date().toISOString(),
        endpoint: 'test/endpoint',
      };

      vi.mocked(rateLimitService.getRateLimitInfo).mockResolvedValue(mockRateLimitInfo);

      const { result } = renderHook(() => useRateLimit({ endpoint: 'test/endpoint' }));

      await result.current.checkRateLimit();

      await waitFor(() => {
        expect(result.current.isRateLimited).toBe(false);
        expect(result.current.remainingRequests).toBe(5);
      });
    });

    it('should parse resetAt as Date object', async () => {
      const resetTime = new Date('2025-01-30T12:00:00Z');
      const mockRateLimitInfo = {
        allowed: true,
        remaining: 5,
        limit: 10,
        resetAt: resetTime.toISOString(),
        endpoint: 'test/endpoint',
      };

      vi.mocked(rateLimitService.getRateLimitInfo).mockResolvedValue(mockRateLimitInfo);

      const { result } = renderHook(() => useRateLimit({ endpoint: 'test/endpoint' }));

      await result.current.checkRateLimit();

      await waitFor(() => {
        expect(result.current.resetAt).toEqual(resetTime);
      });
    });
  });

  describe('pollInterval', () => {
    it('should poll rate limit status at specified interval', async () => {
      vi.useFakeTimers();
      
      const mockRateLimitInfo = {
        allowed: true,
        remaining: 5,
        limit: 10,
        resetAt: new Date().toISOString(),
        endpoint: 'test/endpoint',
      };

      vi.mocked(rateLimitService.getRateLimitInfo).mockResolvedValue(mockRateLimitInfo);

      renderHook(() => 
        useRateLimit({ endpoint: 'test/endpoint', pollInterval: 100 })
      );

      // After 100ms - first poll
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(rateLimitService.getRateLimitInfo).toHaveBeenCalledTimes(1);

      // After another 100ms - second poll
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(rateLimitService.getRateLimitInfo).toHaveBeenCalledTimes(2);
      
      vi.useRealTimers();
    });
  });
});

describe('useRateLimitStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('status messages', () => {
    it('should return null message when rate limit not checked', async () => {
      vi.mocked(rateLimitService.getRateLimitInfo).mockResolvedValue({
        allowed: true,
        remaining: 10,
        limit: 10,
        resetAt: new Date().toISOString(),
        endpoint: 'test/endpoint',
      });

      const { result } = renderHook(() => useRateLimitStatus('test/endpoint'));

      // Initially null
      expect(result.current.statusMessage).toBeNull();

      // Wait for auto-check, should still be null (remaining > 5)
      await waitFor(() => {
        expect(result.current.rateLimitInfo).not.toBeNull();
      });
      expect(result.current.statusMessage).toBeNull();
    });

    it('should show warning when remaining requests are low', async () => {
      vi.mocked(rateLimitService.getRateLimitInfo).mockResolvedValue({
        allowed: true,
        remaining: 3,
        limit: 10,
        resetAt: new Date().toISOString(),
        endpoint: 'test/endpoint',
      });

      const { result } = renderHook(() => useRateLimitStatus('test/endpoint'));

      await waitFor(() => {
        expect(result.current.statusMessage).toContain('3 requests remaining');
      }, { timeout: 10000 });
      
      expect(result.current.shouldShowWarning).toBe(true);
    });

    it('should show error when rate limited with retry time in seconds', async () => {
      vi.mocked(rateLimitService.getRateLimitInfo).mockResolvedValue({
        allowed: false,
        remaining: 0,
        limit: 10,
        resetAt: new Date().toISOString(),
        endpoint: 'test/endpoint',
        retryAfter: 30,
      });

      const { result } = renderHook(() => useRateLimitStatus('test/endpoint'));

      await waitFor(() => {
        expect(result.current.statusMessage).toContain('Try again in 30 seconds');
      }, { timeout: 10000 });
      
      expect(result.current.shouldShowError).toBe(true);
    });

    it('should show error when rate limited with retry time in minutes', async () => {
      vi.mocked(rateLimitService.getRateLimitInfo).mockResolvedValue({
        allowed: false,
        remaining: 0,
        limit: 10,
        resetAt: new Date().toISOString(),
        endpoint: 'test/endpoint',
        retryAfter: 180, // 3 minutes
      });

      const { result } = renderHook(() => useRateLimitStatus('test/endpoint'));

      await waitFor(() => {
        expect(result.current.statusMessage).toContain('Try again in 3 minutes');
      }, { timeout: 10000 });
    });
  });

  describe('formatted reset time', () => {
    it('should format reset time for display', async () => {
      const resetTime = new Date('2025-01-30T14:30:00Z');
      vi.mocked(rateLimitService.getRateLimitInfo).mockResolvedValue({
        allowed: true,
        remaining: 5,
        limit: 10,
        resetAt: resetTime.toISOString(),
        endpoint: 'test/endpoint',
      });

      const { result } = renderHook(() => useRateLimitStatus('test/endpoint'));

      await waitFor(() => {
        expect(result.current.resetTimeFormatted).toBeTruthy();
      }, { timeout: 10000 });
      // Format will depend on locale, just check it exists
    });
  });

  describe('warning and error flags', () => {
    it('should set shouldShowWarning when remaining <= 5', async () => {
      vi.mocked(rateLimitService.getRateLimitInfo).mockResolvedValue({
        allowed: true,
        remaining: 5,
        limit: 10,
        resetAt: new Date().toISOString(),
        endpoint: 'test/endpoint',
      });

      const { result } = renderHook(() => useRateLimitStatus('test/endpoint'));

      await waitFor(() => {
        expect(result.current.shouldShowWarning).toBe(true);
      }, { timeout: 10000 });
      
      expect(result.current.shouldShowError).toBe(false);
    });

    it('should set shouldShowError when rate limited', async () => {
      vi.mocked(rateLimitService.getRateLimitInfo).mockResolvedValue({
        allowed: false,
        remaining: 0,
        limit: 10,
        resetAt: new Date().toISOString(),
        endpoint: 'test/endpoint',
        retryAfter: 60,
      });

      const { result } = renderHook(() => useRateLimitStatus('test/endpoint'));

      await waitFor(() => {
        expect(result.current.shouldShowError).toBe(true);
      }, { timeout: 10000 });
      
      expect(result.current.shouldShowWarning).toBe(false);
    });
  });
});
