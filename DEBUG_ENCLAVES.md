# 🔍 Debug: Enclaves Not Showing

## Quick Debugging Steps

### 1. Check Browser Console
Open browser dev tools (F12) and look for:

**Network Tab:**
- Is there a call to `/api/enclaves?wallet=...`?
- What's the response status and data?

**Console Tab:**  
- Any JavaScript errors?
- Any "Error fetching enclaves" messages?

### 2. Check User Authentication
In browser console, run:
```javascript
// Check if user is authenticated
console.log('User:', window.localStorage.getItem('privy-token'));
```

### 3. Test API Directly
Try visiting this URL directly in browser:
```
http://localhost:3000/api/enclaves?wallet=alexdaro34@gmail.com
```
(Replace with your actual email)

### 4. Check Environment Variables
Verify these are set in `.env.local`:
```env
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
DYNAMODB_ENCLAVES_TABLE=treza-enclaves-dev
```

### 5. Quick Test Commands

**Check DynamoDB directly:**
```bash
aws dynamodb scan --table-name treza-enclaves-dev --limit 5
```

**Check if table name matches:**
```bash
aws dynamodb list-tables | grep enclave
```

## Possible Issues

1. **Environment Variables Missing** - API can't connect to AWS
2. **Table Name Mismatch** - App looking at wrong table  
3. **User Not Authenticated** - walletAddress is empty string
4. **AWS Credentials** - No permission to read DynamoDB
5. **Dependencies** - Missing AWS SDK packages

## Quick Fix Attempts

If environment variables are the issue:
```bash
# In treza-app directory
echo "DYNAMODB_ENCLAVES_TABLE=treza-enclaves-dev" >> .env.local
```

If dependencies are missing:
```bash
# Try running app to see specific errors
npm run dev
# OR
yarn dev
```

Let me know what you find in the browser console! 🔍
