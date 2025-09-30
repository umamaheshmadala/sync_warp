/**
 * Rate Limiting Service
 * 
 * Provides rate limiting functionality to prevent API abuse and ensure fair usage.
 * Integrates with Supabase database functions for distributed rate limiting.
 * 
 * Features:
 * - Per-user and per-IP rate limiting
 * - Configurable limits per endpoint
 * - Sliding window algorithm
 * - Automatic cleanup of expired logs
 * 
 * @module rateLimitService
 */

import { supabase } from '@/lib/supabase';

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number | null;
  remaining: number | null;
  resetAt: string | null;
  retryAfter: number | null;
  endpoint: string;
}

/**
 * Rate limit error class
 */
export class RateLimitError extends Error {
  public readonly statusCode: number = 429;
  public readonly retryAfter: number | null;
  public readonly limit: number | null;
  public readonly resetAt: string | null;

  constructor(message: string, retryAfter: number | null = null, limit: number | null = null, resetAt: string | null = null) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    this.limit = limit;
    this.resetAt = resetAt;
  }
}

/**
 * Rate limiting service class
 */
class RateLimitService {
  /**
   * Check if a request is allowed based on rate limits
   * 
   * @param endpoint - The API endpoint being accessed
   * @param userId - Optional user ID (for authenticated requests)
   * @param ipAddress - Optional IP address (for unauthenticated requests)
   * @returns Rate limit result
   */
  async checkRateLimit(
    endpoint: string,
    userId?: string,
    ipAddress?: string
  ): Promise<RateLimitResult> {
    try {
      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_user_id: userId || null,
        p_ip_address: ipAddress || null,
        p_endpoint: endpoint
      });

      if (error) {
        console.error('Rate limit check error:', error);
        // On error, allow the request but log the issue
        return {
          allowed: true,
          limit: null,
          remaining: null,
          resetAt: null,
          retryAfter: null,
          endpoint
        };
      }

      return {
        allowed: data.allowed,
        limit: data.limit,
        remaining: data.remaining,
        resetAt: data.reset_at,
        retryAfter: data.retry_after,
        endpoint: data.endpoint
      };
    } catch (err) {
      console.error('Rate limit check exception:', err);
      // On exception, allow the request but log the issue
      return {
        allowed: true,
        limit: null,
        remaining: null,
        resetAt: null,
        retryAfter: null,
        endpoint
      };
    }
  }

  /**
   * Record a request for rate limiting purposes
   * 
   * @param endpoint - The API endpoint being accessed
   * @param userId - Optional user ID (for authenticated requests)
   * @param ipAddress - Optional IP address (for unauthenticated requests)
   */
  async recordRequest(
    endpoint: string,
    userId?: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('record_rate_limit_request', {
        p_user_id: userId || null,
        p_ip_address: ipAddress || null,
        p_endpoint: endpoint
      });

      if (error) {
        console.error('Rate limit record error:', error);
      }
    } catch (err) {
      console.error('Rate limit record exception:', err);
    }
  }

  /**
   * Check rate limit and throw error if exceeded
   * Use this as a middleware-style function
   * 
   * @param endpoint - The API endpoint being accessed
   * @param userId - Optional user ID (for authenticated requests)
   * @param ipAddress - Optional IP address (for unauthenticated requests)
   * @throws RateLimitError if rate limit is exceeded
   */
  async enforceRateLimit(
    endpoint: string,
    userId?: string,
    ipAddress?: string
  ): Promise<void> {
    const result = await this.checkRateLimit(endpoint, userId, ipAddress);

    if (!result.allowed) {
      const retryAfterSeconds = result.retryAfter || 60;
      const message = `Rate limit exceeded. Please try again in ${retryAfterSeconds} seconds.`;
      
      throw new RateLimitError(
        message,
        retryAfterSeconds,
        result.limit,
        result.resetAt
      );
    }

    // Record the request
    await this.recordRequest(endpoint, userId, ipAddress);
  }

  /**
   * Get rate limit info without recording a request
   * Useful for displaying rate limit status to users
   * 
   * @param endpoint - The API endpoint being accessed
   * @param userId - Optional user ID (for authenticated requests)
   * @param ipAddress - Optional IP address (for unauthenticated requests)
   * @returns Rate limit result
   */
  async getRateLimitInfo(
    endpoint: string,
    userId?: string,
    ipAddress?: string
  ): Promise<RateLimitResult> {
    return this.checkRateLimit(endpoint, userId, ipAddress);
  }

  /**
   * Clean up expired rate limit logs
   * Should be called periodically (e.g., via cron job or scheduled task)
   * 
   * @returns Number of deleted log entries
   */
  async cleanupExpiredLogs(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('cleanup_expired_rate_limits');

      if (error) {
        console.error('Rate limit cleanup error:', error);
        return 0;
      }

      return data || 0;
    } catch (err) {
      console.error('Rate limit cleanup exception:', err);
      return 0;
    }
  }

  /**
   * Extract IP address from request headers
   * Handles common proxy headers
   * 
   * @param headers - Request headers
   * @returns IP address or undefined
   */
  getIpAddress(headers: Headers | Record<string, string>): string | undefined {
    // Try common proxy headers first
    const forwardedFor = 
      headers instanceof Headers 
        ? headers.get('x-forwarded-for')
        : headers['x-forwarded-for'];
    
    if (forwardedFor) {
      // x-forwarded-for can contain multiple IPs, use the first one
      return forwardedFor.split(',')[0].trim();
    }

    // Try other common headers
    const realIp = 
      headers instanceof Headers
        ? headers.get('x-real-ip')
        : headers['x-real-ip'];
    
    if (realIp) {
      return realIp;
    }

    // Cloudflare
    const cfConnectingIp = 
      headers instanceof Headers
        ? headers.get('cf-connecting-ip')
        : headers['cf-connecting-ip'];
    
    if (cfConnectingIp) {
      return cfConnectingIp;
    }

    return undefined;
  }

  /**
   * Format rate limit headers for HTTP responses
   * Compatible with standard rate limit headers
   * 
   * @param result - Rate limit result
   * @returns Headers object
   */
  formatRateLimitHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {};

    if (result.limit !== null) {
      headers['X-RateLimit-Limit'] = result.limit.toString();
    }

    if (result.remaining !== null) {
      headers['X-RateLimit-Remaining'] = result.remaining.toString();
    }

    if (result.resetAt) {
      const resetTimestamp = Math.floor(new Date(result.resetAt).getTime() / 1000);
      headers['X-RateLimit-Reset'] = resetTimestamp.toString();
    }

    if (!result.allowed && result.retryAfter !== null) {
      headers['Retry-After'] = result.retryAfter.toString();
    }

    return headers;
  }
}

// Export singleton instance
export const rateLimitService = new RateLimitService();

// Export class for testing
export { RateLimitService };