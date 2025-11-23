/**
 * In-Memory Rate Limiter
 * 
 * Simple rate limiting without external dependencies.
 * Suitable for single-server deployments or development.
 * 
 * For production with multiple servers, consider:
 * - Upstash Redis (@upstash/ratelimit)
 * - Vercel KV
 * - Cloudflare Rate Limiting
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private limits = new Map<string, RateLimitRecord>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 3600000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs; // Default: 1 hour
    
    // Cleanup expired entries every 5 minutes
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), 300000);
    }
  }

  /**
   * Check if request is allowed under rate limit
   */
  check(identifier: string): {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  } {
    const now = Date.now();
    const record = this.limits.get(identifier);

    // No record or expired - allow and create new
    if (!record || now > record.resetAt) {
      const resetAt = now + this.windowMs;
      this.limits.set(identifier, { count: 1, resetAt });
      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        reset: resetAt,
      };
    }

    // Under limit - increment and allow
    if (record.count < this.maxRequests) {
      record.count++;
      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - record.count,
        reset: record.resetAt,
      };
    }

    // Over limit - deny
    return {
      success: false,
      limit: this.maxRequests,
      remaining: 0,
      reset: record.resetAt,
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, record] of this.limits.entries()) {
      if (now > record.resetAt) {
        this.limits.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[RateLimiter] Cleaned up ${cleaned} expired entries`);
    }
  }

  /**
   * Get current stats (for monitoring)
   */
  getStats() {
    return {
      totalEntries: this.limits.size,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
    };
  }

  /**
   * Reset all limits (for testing)
   */
  reset() {
    this.limits.clear();
  }
}

// Singleton instance for KYC proof submissions
// 10 requests per hour per IP
export const kycRateLimiter = new RateLimiter(10, 3600000);

// Log stats on startup
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  console.log('[RateLimiter] Initialized:', kycRateLimiter.getStats());
}

