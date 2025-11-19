# zkVerify Integration Setup Guide

Quick setup guide to get zkVerify integration running in your TREZA application.

## Prerequisites

- Node.js 18+
- Deployed `ZKVerifyOracle.sol` contract
- Horizen Relayer API key

## Step 1: Install Dependencies

```bash
cd treza-app
pnpm install axios
# or: npm install axios
```

## Step 2: Configure Environment Variables

Create or update `.env.local` in `treza-app/`:

```bash
# zkVerify Relayer Configuration
ZKVERIFY_RELAYER_URL=https://relayer-api-testnet.horizenlabs.io/api/v1
ZKVERIFY_RELAYER_API_KEY=your_api_key_here

# Oracle Contract Configuration  
ZKVERIFY_ORACLE_ADDRESS=0x... # Your deployed ZKVerifyOracle address
ORACLE_PRIVATE_KEY=0x...       # Oracle node private key

# Ethereum RPC
ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-key
```

### Get Your API Key

1. **Testnet**: Visit https://relayer-testnet.horizenlabs.io
2. **Mainnet**: Visit https://relayer.horizenlabs.io
3. Create an account and generate an API key

## Step 3: Deploy Oracle Contract (if not done)

```bash
cd ../treza-contracts

# Edit hardhat.config.ts with your network settings
npx hardhat run scripts/deploy-oracle.ts --network sepolia

# Note the deployed contract address
```

## Step 4: Register as Oracle Node

You need to register your backend as an oracle node in the contract:

```bash
# Using Hardhat console
npx hardhat console --network sepolia

> const Oracle = await ethers.getContractFactory("ZKVerifyOracle");
> const oracle = await Oracle.attach("YOUR_ORACLE_ADDRESS");
> await oracle.addOracle("YOUR_BACKEND_WALLET_ADDRESS", "https://yourdomain.com");
> await oracle.stakeAsOracle({ value: ethers.parseEther("1.0") });
```

Or use the deployment script:

```bash
npx hardhat run scripts/governance/setup-oracle.ts --network sepolia
```

## Step 5: Update SDK Configuration

In your DeFi app (`treza-example-defi-app`):

```typescript
// lib/wagmi-config.ts or similar
import { TrezaComplianceSDK } from '@treza/core';

export const complianceSDK = new TrezaComplianceSDK({
  apiEndpoint: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  contractAddress: process.env.NEXT_PUBLIC_COMPLIANCE_CONTRACT_ADDRESS!,
  // ... other config
});
```

## Step 6: Test the Integration

### Test 1: Register Verification Key

```bash
curl -X POST http://localhost:3000/api/zkverify/register-vk \
  -H "Content-Type: application/json" \
  -d '{
    "vk": {
      "protocol": "groth16",
      "curve": "bn128",
      "nPublic": 2,
      "vk_alpha_1": [...],
      "vk_beta_2": [...],
      "vk_gamma_2": [...],
      "vk_delta_2": [...],
      "vk_alphabeta_12": [...],
      "IC": [...]
    },
    "proofType": "groth16"
  }'
```

Expected response:
```json
{
  "success": true,
  "vkHash": "0x...",
  "message": "Verification key registered successfully"
}
```

### Test 2: Submit a Proof

```bash
curl -X POST http://localhost:3000/api/zkverify/submit-proof \
  -H "Content-Type: application/json" \
  -d '{
    "proof": "0x...",
    "publicSignals": ["0x...", "0x..."],
    "vk": "0x...",
    "userAddress": "0x..."
  }'
```

Expected response:
```json
{
  "success": true,
  "jobId": "uuid-v4",
  "optimisticVerify": "success"
}
```

### Test 3: Check Job Status

```bash
curl http://localhost:3000/api/zkverify/job-status/{jobId}
```

Expected response:
```json
{
  "success": true,
  "jobStatus": {
    "jobId": "uuid-v4",
    "status": "Finalized",
    "txHash": "0x...",
    "blockHash": "0x..."
  }
}
```

## Step 7: Run Your Application

```bash
# Terminal 1: Run the Next.js API
cd treza-app
pnpm dev

# Terminal 2: Run your DeFi app
cd treza-example-defi-app
npm run dev
```

## Verification Workflow

1. **User initiates verification** in your DeFi app
2. **User scans ID** with ZKPassport mobile app
3. **ZKPassport generates proof** locally on device
4. **Proof sent to your API** (`/api/zkverify/submit-proof`)
5. **API forwards to Relayer** which submits to zkVerify chain
6. **Poll for finalization** (`/api/zkverify/job-status`)
7. **Submit attestation** to oracle contract (`/api/zkverify/submit-attestation`)
8. **User is now compliant** on-chain

## Troubleshooting

### "ZKVERIFY_RELAYER_API_KEY not configured"

Make sure:
- `.env.local` file exists in `treza-app/`
- Environment variable is set correctly
- Restart the Next.js dev server after adding env vars

### "Contract rejected transaction"

Common causes:
- Oracle not registered: Call `addOracle()` first
- Insufficient stake: Stake at least 1 ETH
- Invalid signature: Check wallet address matches `ORACLE_PRIVATE_KEY`

### "Failed to submit proof"

Check:
- Relayer API key is valid
- Proof format matches expected structure
- VK is registered before submitting proofs

### Rate Limits

Free tier limits:
- 100 requests/day (Relayer API)
- Contact Horizen Labs for higher limits

## Production Checklist

- [ ] Use paid RPC provider (Alchemy, Infura, QuickNode)
- [ ] Store private keys in secure vault (AWS KMS, HashiCorp Vault)
- [ ] Use mainnet Relayer API (`relayer-api-mainnet.horizenlabs.io`)
- [ ] Deploy to L2 for lower gas costs (Arbitrum, Optimism)
- [ ] Set up monitoring and alerting for oracle nodes
- [ ] Configure multi-oracle consensus (3+ oracles)
- [ ] Enable aggregation mode for batching proofs
- [ ] Set up automatic oracle node failover
- [ ] Implement rate limiting on your API endpoints
- [ ] Add proper error logging and monitoring

## Next Steps

- Read [ZKVERIFY_INTEGRATION.md](./ZKVERIFY_INTEGRATION.md) for detailed API docs
- Explore [zkVerify documentation](https://docs.zkverify.io)
- Join the [Horizen Discord](https://discord.gg/horizen) for support

## Support

- **Technical Issues**: Open an issue on GitHub
- **Relayer API Issues**: Contact Horizen Labs support
- **Smart Contract Issues**: Check the contracts documentation

