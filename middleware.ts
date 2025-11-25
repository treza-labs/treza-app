/**
 * Next.js Middleware for Rate Limiting
 * 
 * Protects the KYC proof submission endpoint from abuse.
 * Rate limit: 10 proof submissions per hour per IP address.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { kycRateLimiter } from './lib/rate-limiter';

export function middleware(request: NextRequest) {
  // Only rate limit KYC proof submission endpoint
  if (!request.nextUrl.pathname.startsWith('/api/kyc/proof')) {
    return NextResponse.next();
  }

  // Only rate limit POST requests (submissions)
  if (request.method !== 'POST') {
    return NextResponse.next();
  }

  // Get client IP address
  const ip = getClientIP(request);

  // Check rate limit
  const { success, limit, remaining, reset } = kycRateLimiter.check(ip);

  // Calculate retry-after in seconds
  const retryAfterSeconds = Math.ceil((reset - Date.now()) / 1000);

  if (!success) {
    // Rate limit exceeded
    console.warn('[RateLimit] Blocked request:', {
      ip,
      endpoint: request.nextUrl.pathname,
      timestamp: new Date().toISOString(),
      resetAt: new Date(reset).toISOString(),
    });

    return NextResponse.json(
      {
        error: 'Too many proof submissions. Please try again later.',
        retryAfter: retryAfterSeconds,
        limit,
        remaining: 0,
        reset,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': reset.toString(),
          'Retry-After': retryAfterSeconds.toString(),
        },
      }
    );
  }

  // Allow request and add rate limit headers
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', reset.toString());

  // Log successful request (optional, for monitoring)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[RateLimit] Allowed request:', {
      ip,
      endpoint: request.nextUrl.pathname,
      remaining,
      resetAt: new Date(reset).toISOString(),
    });
  }

  return response;
}

/**
 * Get client IP address from request
 * Handles various proxy configurations
 */
function getClientIP(request: NextRequest): string {
  // Try various headers in order of preference
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = request.headers.get('cf-connecting-ip'); // Cloudflare
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback to anonymous (request.ip removed in Next.js 15)
  return 'anonymous';
}

// Configure which routes the middleware should run on
export const config = {
  matcher: '/api/kyc/proof',
};

