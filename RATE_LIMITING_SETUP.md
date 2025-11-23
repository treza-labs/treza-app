# Rate Limiting Setup - Complete ✅

Rate limiting has been implemented for the KYC proof submission endpoint using Next.js middleware.

## What Was Implemented

### 1. Rate Limiter (`lib/rate-limiter.ts`)
- In-memory rate limiting (no external dependencies)
- 10 requests per hour per IP address
- Automatic cleanup of expired entries
- Monitoring and stats tracking

### 2. Middleware (`middleware.ts`)
- Intercepts all POST requests to `/api/kyc/proof`
- Checks rate limit before allowing request
- Returns 429 status when limit exceeded
- Adds rate limit headers to all responses

### 3. Mobile App Updates (`APIClient.swift`)
- Handles 429 rate limit responses
- Shows user-friendly error messages
- Displays retry time in minutes

### 4. Test Script (`scripts/test-rate-limit.sh`)
- Automated testing of rate limit functionality
- Sends 15 requests, expects 10 to succeed and 5 to be blocked

---

## How It Works

```
┌─────────────────────────────────────┐
│  Client (iOS App or Browser)        │
└─────────────┬───────────────────────┘
              │ POST /api/kyc/proof
              ▼
┌─────────────────────────────────────┐
│  Next.js Middleware                 │
│  • Get client IP                    │
│  • Check rate limit (10/hour)       │
│  • Add headers                      │
└─────────────┬───────────────────────┘
              │
        ┌─────┴─────┐
        │           │
   ✅ Allowed   🚫 Blocked
        │           │
        ▼           ▼
   Continue    Return 429
   to API      + Retry-After
```

---

## Testing

### Option 1: Automated Test Script

```bash
# Start your Next.js server
cd /Users/adaro/PROJECTS/TREZA/DEV/treza-app
npm run dev

# In another terminal, run the test
./scripts/test-rate-limit.sh

# Expected output:
# ✅ PASS: Rate limiting working correctly!
#    - First 10 requests allowed
#    - Next 5 requests blocked
```

### Option 2: Manual Testing with curl

```bash
# Send requests until rate limited
for i in {1..15}; do
  echo "Request #$i"
  curl -X POST http://localhost:3000/api/kyc/proof \
    -H "Content-Type: application/json" \
    -d '{
      "userId": "test-user",
      "proof": {
        "commitment": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "proof": "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        "publicInputs": ["country:US", "isAdult:true"],
        "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'",
        "algorithm": "Pedersen-SHA256"
      }
    }'
  echo -e "\n---"
  sleep 1
done
```

### Option 3: Test from iOS App

1. Build and run the iOS app
2. Complete KYC flow 10 times quickly
3. On the 11th attempt, you should see:
   ```
   "Too many proof submissions. Please try again in 60 minutes."
   ```

---

## Rate Limit Response

When rate limited, clients receive:

**Status Code:** `429 Too Many Requests`

**Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1700000000000
Retry-After: 3600
```

**Body:**
```json
{
  "error": "Too many proof submissions. Please try again later.",
  "retryAfter": 3600,
  "limit": 10,
  "remaining": 0,
  "reset": 1700000000000
}
```

---

## Configuration

### Change Rate Limit

Edit `lib/rate-limiter.ts`:

```typescript
// Current: 10 requests per hour
export const kycRateLimiter = new RateLimiter(10, 3600000);

// More restrictive: 5 per hour
export const kycRateLimiter = new RateLimiter(5, 3600000);

// More permissive: 20 per hour
export const kycRateLimiter = new RateLimiter(20, 3600000);

// Different window: 10 per 30 minutes
export const kycRateLimiter = new RateLimiter(10, 1800000);
```

### Disable Rate Limiting (Development)

Comment out the matcher in `middleware.ts`:

```typescript
export const config = {
  // matcher: '/api/kyc/proof', // Commented out = disabled
};
```

Or add environment check:

```typescript
export function middleware(request: NextRequest) {
  // Skip rate limiting in development
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }
  
  // ... rest of middleware
}
```

---

## Monitoring

### View Rate Limiter Stats

Add to your API route or create a monitoring endpoint:

```typescript
// GET /api/admin/rate-limit-stats
import { kycRateLimiter } from '@/lib/rate-limiter';

export async function GET() {
  return Response.json(kycRateLimiter.getStats());
}

// Output:
// {
//   "totalEntries": 42,
//   "maxRequests": 10,
//   "windowMs": 3600000
// }
```

### Log Rate Limit Events

Middleware already logs blocked requests:

```
[RateLimit] Blocked request: {
  ip: '192.168.1.100',
  endpoint: '/api/kyc/proof',
  timestamp: '2025-11-23T...',
  resetAt: '2025-11-23T...'
}
```

Enable verbose logging in development:

```typescript
// In middleware.ts
if (process.env.NODE_ENV !== 'production') {
  console.log('[RateLimit] Allowed request:', {
    ip,
    endpoint: request.nextUrl.pathname,
    remaining,
    resetAt: new Date(reset).toISOString(),
  });
}
```

---

## Production Deployment

### Vercel

No additional configuration needed! Rate limiting works out of the box.

**Note:** Each Vercel serverless function instance has its own memory, so rate limits are per-instance. For global rate limiting across all instances, consider:
- Vercel KV (Redis)
- Upstash Redis
- Cloudflare Workers KV

### Self-Hosted

Rate limiter works perfectly for single-server deployments.

For multi-server (load balanced), upgrade to Redis-backed rate limiting:

```bash
npm install @upstash/ratelimit @upstash/redis
```

See `RATE_LIMITING.md` for Upstash setup instructions.

---

## Troubleshooting

### Rate Limit Not Working

1. **Check middleware is running:**
   ```bash
   # Should see in console:
   [RateLimiter] Initialized: { totalEntries: 0, maxRequests: 10, ... }
   ```

2. **Verify matcher:**
   ```typescript
   // middleware.ts
   export const config = {
     matcher: '/api/kyc/proof', // Make sure this is correct
   };
   ```

3. **Check IP detection:**
   ```typescript
   // Add logging in middleware
   console.log('Client IP:', getClientIP(request));
   ```

### Rate Limit Resets on Server Restart

This is expected with in-memory rate limiting. To persist across restarts:
- Use Redis (Upstash, Vercel KV)
- Accept the limitation (usually not a problem)

### Multiple Users Behind Same IP

This can happen with:
- Corporate networks
- Shared Wi-Fi
- Mobile carriers (CGNAT)

**Solutions:**
1. Increase limit (e.g., 20/hour instead of 10)
2. Rate limit by `userId` + IP combined
3. Add authentication and rate limit per user

```typescript
// Rate limit by userId + IP
const identifier = `${body.userId}_${ip}`;
const result = kycRateLimiter.check(identifier);
```

---

## Security Considerations

### ✅ What This Protects Against

- Spam/abuse of proof submission
- DDoS attacks (basic protection)
- Resource exhaustion
- Malicious users

### ⚠️ What This Doesn't Protect Against

- Distributed attacks (many IPs)
- Sophisticated DDoS (need Cloudflare/CDN)
- Attacks from authenticated users (need per-user limits)

### Additional Protections

Layer rate limiting with:
1. **Cloudflare** - DDoS protection at edge
2. **WAF** - Web Application Firewall rules
3. **Captcha** - For suspicious activity
4. **Authentication** - Per-user rate limits (future)

---

## Files Created/Modified

```
treza-app/
├── lib/
│   └── rate-limiter.ts          ✅ NEW - Rate limiting logic
├── middleware.ts                 ✅ NEW - Next.js middleware
├── scripts/
│   └── test-rate-limit.sh       ✅ NEW - Test script
├── RATE_LIMITING.md             ✅ UPDATED - Implementation guide
└── RATE_LIMITING_SETUP.md       ✅ NEW - This file

treza-mobile/
└── treza-mobile/
    └── APIClient.swift          ✅ UPDATED - Handle 429 responses
```

---

## Quick Commands

```bash
# Test rate limiting
./scripts/test-rate-limit.sh

# Monitor logs while testing
npm run dev | grep -i "ratelimit"

# Reset rate limits (restart server)
# Rate limits reset automatically on server restart

# Check stats in Node REPL
node
> const { kycRateLimiter } = require('./lib/rate-limiter.ts')
> kycRateLimiter.getStats()
```

---

## Next Steps

- [x] Rate limiting implemented
- [x] Tests passing
- [x] Mobile app handles 429
- [ ] Deploy to production
- [ ] Monitor rate limit hits
- [ ] Adjust limits based on usage patterns

---

**Status: ✅ Ready for Production**

Rate limiting is fully implemented, tested, and ready to deploy!

