#!/bin/bash

# Test Rate Limiting for KYC Proof Endpoint
# This script tests that rate limiting works correctly

set -e

API_URL="${1:-http://localhost:3000}"
ENDPOINT="$API_URL/api/kyc/proof"

echo "🧪 Testing Rate Limiting"
echo "======================="
echo "Endpoint: $ENDPOINT"
echo "Limit: 10 requests/hour"
echo ""

# Function to make a proof submission
make_request() {
    local num=$1
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
    
    response=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
        -H "Content-Type: application/json" \
        -d '{
            "userId": "test-user-'$num'",
            "proof": {
                "commitment": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
                "proof": "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
                "publicInputs": ["country:US", "isAdult:true", "documentValid:true"],
                "timestamp": "'$timestamp'",
                "algorithm": "Pedersen-SHA256"
            }
        }' 2>&1)
    
    # Split response body and status code
    body=$(echo "$response" | head -n -1)
    status=$(echo "$response" | tail -n 1)
    
    # Get rate limit headers if available
    headers=$(curl -s -I -X POST "$ENDPOINT" \
        -H "Content-Type: application/json" \
        -d '{"userId":"test"}' 2>&1 | grep -i "x-ratelimit" || true)
    
    echo "$status|$body|$headers"
}

# Test: Send 15 requests (should block after 10)
echo "📤 Sending 15 proof submissions..."
echo ""

SUCCESS_COUNT=0
BLOCKED_COUNT=0

for i in {1..15}; do
    echo "Request #$i:"
    
    result=$(make_request $i)
    status=$(echo "$result" | cut -d'|' -f1)
    body=$(echo "$result" | cut -d'|' -f2)
    
    if [ "$status" = "201" ]; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        echo "  ✅ Status: $status (Success)"
        
        # Try to parse remaining from response
        remaining=$(echo "$body" | grep -o '"remaining":[0-9]*' | grep -o '[0-9]*' || echo "?")
        if [ "$remaining" != "?" ]; then
            echo "  📊 Remaining: $remaining requests"
        fi
    elif [ "$status" = "429" ]; then
        BLOCKED_COUNT=$((BLOCKED_COUNT + 1))
        echo "  🚫 Status: $status (Rate Limited)"
        
        # Parse retry-after
        retryAfter=$(echo "$body" | grep -o '"retryAfter":[0-9]*' | grep -o '[0-9]*' || echo "?")
        if [ "$retryAfter" != "?" ]; then
            minutes=$((retryAfter / 60))
            echo "  ⏱️  Retry After: $minutes minutes"
        fi
    else
        echo "  ❌ Status: $status (Error)"
        echo "  Response: $body"
    fi
    
    echo ""
    sleep 0.5
done

# Summary
echo "================================"
echo "📊 Test Results:"
echo "   Successful: $SUCCESS_COUNT / 15"
echo "   Blocked: $BLOCKED_COUNT / 15"
echo ""

if [ $SUCCESS_COUNT -eq 10 ] && [ $BLOCKED_COUNT -eq 5 ]; then
    echo "✅ PASS: Rate limiting working correctly!"
    echo "   - First 10 requests allowed"
    echo "   - Next 5 requests blocked"
    exit 0
else
    echo "❌ FAIL: Unexpected results"
    echo "   Expected: 10 successful, 5 blocked"
    echo "   Got: $SUCCESS_COUNT successful, $BLOCKED_COUNT blocked"
    exit 1
fi

