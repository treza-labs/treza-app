# Rate Limiting for KYC API

Since the KYC proof endpoint is open (no authentication), rate limiting is recommended to prevent abuse.

## Option 1: Upstash Redis (Recommended for Production)

### Installation

```bash
npm install @upstash/ratelimit @upstash/redis
```

### Setup

1. Create free Upstash account: https://console.upstash.com/
2. Create Redis database
3. Add to `.env`:

```bash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

### Implementation

Create `middleware.ts` in the app root:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create rate limiter
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 requests per hour
  analytics: true,
  prefix: '@treza/kyc',
});

export async function middleware(request: NextRequest) {
  // Only rate limit KYC proof endpoint
  if (!request.nextUrl.pathname.startsWith('/api/kyc/proof')) {
    return NextResponse.next();
  }

  // Get client IP
  const ip = request.ip ?? 
             request.headers.get('x-forwarded-for') ?? 
             request.headers.get('x-real-ip') ?? 
             'anonymous';

  // Check rate limit
  const { success, limit, reset, remaining } = await ratelimit.limit(
    `kyc_${ip}`
  );

  // Add rate limit headers
  const response = success 
    ? NextResponse.next() 
    : NextResponse.json(
        { 
          error: 'Too many proof submissions. Please try again later.',
          retryAfter: Math.floor((reset - Date.now()) / 1000),
        },
        { status: 429 }
      );

  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', reset.toString());

  return response;
}

export const config = {
  matcher: '/api/kyc/proof',
};
```

---

## Option 2: In-Memory Rate Limiting (Simple, Development)

Create `lib/rate-limiter.ts`:

```typescript
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private limits = new Map<string, RateLimitRecord>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 3600000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 300000);
  }

  check(identifier: string): {
    success: boolean;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();
    const record = this.limits.get(identifier);

    // No record or expired - allow and create new
    if (!record || now > record.resetAt) {
      const resetAt = now + this.windowMs;
      this.limits.set(identifier, { count: 1, resetAt });
      return {
        success: true,
        remaining: this.maxRequests - 1,
        resetAt,
      };
    }

    // Under limit - increment and allow
    if (record.count < this.maxRequests) {
      record.count++;
      return {
        success: true,
        remaining: this.maxRequests - record.count,
        resetAt: record.resetAt,
      };
    }

    // Over limit - deny
    return {
      success: false,
      remaining: 0,
      resetAt: record.resetAt,
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, record] of this.limits.entries()) {
      if (now > record.resetAt) {
        this.limits.delete(key);
      }
    }
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter(10, 3600000); // 10 requests per hour
```

Use in API route:

```typescript
// app/api/kyc/proof/route.ts
import { rateLimiter } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  // Get client IP
  const ip = request.headers.get('x-forwarded-for') ?? 
             request.headers.get('x-real-ip') ?? 
             'anonymous';

  // Check rate limit
  const { success, remaining, resetAt } = rateLimiter.check(ip);

  if (!success) {
    return NextResponse.json(
      {
        error: 'Too many proof submissions. Please try again later.',
        retryAfter: Math.floor((resetAt - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetAt.toString(),
        },
      }
    );
  }

  // Continue with proof submission...
  const body = await request.json();
  // ... rest of your code
}
```

**Pros:**
- ✅ Simple, no external dependencies
- ✅ No database needed
- ✅ Works immediately

**Cons:**
- ⚠️ Resets on server restart
- ⚠️ Doesn't work across multiple servers
- ⚠️ Memory usage grows over time

---

## Option 3: Cloudflare Rate Limiting (Enterprise)

If using Cloudflare:

1. Go to Cloudflare Dashboard → Security → WAF
2. Create rate limiting rule:
   - Path: `/api/kyc/proof`
   - Limit: 10 requests per hour
   - Action: Block with 429

**Pros:**
- ✅ Edge-level protection
- ✅ No backend code needed
- ✅ DDoS protection included

**Cons:**
- ⚠️ Requires Cloudflare Pro plan
- ⚠️ Less flexible than code-based

---

## Rate Limit Configuration

### Recommended Limits

| Use Case | Rate Limit | Window | Notes |
|----------|------------|--------|-------|
| **Development** | 100/hour | 1 hour | Generous for testing |
| **Production** | 10/hour | 1 hour | Sufficient for KYC |
| **Aggressive** | 5/hour | 1 hour | Very restrictive |

### Per-User vs Per-IP

```typescript
// Per-IP (current approach)
const identifier = ip;

// Per-User (if you add userId)
const identifier = body.userId || ip;

// Combined (most secure)
const identifier = `${ip}_${body.userId}`;
```

---

## Testing Rate Limiting

```bash
# Test rate limit (should block after 10 requests)
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/kyc/proof \
    -H "Content-Type: application/json" \
    -d '{
      "userId": "test-user",
      "proof": {
        "commitment": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "proof": "abcdef...",
        "publicInputs": ["country:US", "isAdult:true"],
        "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'",
        "algorithm": "Pedersen-SHA256"
      }
    }'
  echo ""
  sleep 1
done
```

Expected:
- First 10 requests: `201 Created`
- Request 11+: `429 Too Many Requests`

---

## Monitoring

Log rate limit hits:

```typescript
if (!success) {
  console.warn('Rate limit exceeded:', {
    ip,
    endpoint: '/api/kyc/proof',
    timestamp: new Date().toISOString(),
  });
}
```

Track metrics:
- Total requests per hour
- Rate limit hits
- Most active IPs
- Average requests per user

---

## Error Handling in Mobile App

Update Swift app to handle 429 responses:

```swift
// APIClient.swift
if httpResponse.statusCode == 429 {
    let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
    
    // Parse retry-after if available
    if let retryAfter = httpResponse.value(forHTTPHeaderField: "Retry-After") {
        throw APIError.rateLimitExceeded(retryAfter: Int(retryAfter) ?? 3600)
    }
    
    throw APIError.rateLimitExceeded(retryAfter: 3600)
}

// APIError enum
enum APIError: Error {
    case rateLimitExceeded(retryAfter: Int)
    
    var localizedDescription: String {
        switch self {
        case .rateLimitExceeded(let seconds):
            let minutes = seconds / 60
            return "Too many proof submissions. Please try again in \(minutes) minutes."
        }
    }
}
```

---

## Production Checklist

- [ ] Rate limiting implemented (Upstash or in-memory)
- [ ] Rate limit tested locally
- [ ] Error messages are user-friendly
- [ ] Mobile app handles 429 responses
- [ ] Monitoring/logging in place
- [ ] Rate limit headers included in response
- [ ] Documentation updated

---

## Recommended: Start with Option 2 (In-Memory)

For initial launch:
1. Use in-memory rate limiting (simple)
2. Monitor traffic patterns
3. Upgrade to Upstash if needed (multiple servers)

```bash
# Quick implementation (5 minutes)
1. Copy lib/rate-limiter.ts
2. Add rate limit check to route.ts
3. Test with curl
4. Deploy!
```

---

## Support

- Upstash Docs: https://upstash.com/docs/redis/overall/getstarted
- Rate Limit Headers: https://www.ietf.org/archive/id/draft-ietf-httpapi-ratelimit-headers-07.html
- Next.js Middleware: https://nextjs.org/docs/app/building-your-application/routing/middleware

