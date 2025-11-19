# zkVerify Integration Guide

This document explains how TREZA integrates with zkVerify using the Horizen Labs Relayer API for zero-knowledge proof verification.

## Overview

The zkVerify integration allows TREZA to verify zero-knowledge proofs (from ZKPassport or other sources) on the zkVerify blockchain without running your own zkVerify node. The Horizen Relayer API acts as a bridge between your application and the zkVerify network.

## Architecture

```

‚  User DeFi App  ‚
‚ (treza-example- ‚
‚   defi-app)     ‚
¬
         ‚ 1. Generate ZK proof (ZKPassport)
         

‚  TREZA SDK      ‚
‚ (treza-sdk)     ‚
¬
         ‚ 2. Submit via Next.js API
         

‚  Next.js API    ‚   treza-app/app/api/zkverify/*
‚  (treza-app)    ‚
¬
         ‚ 3. Call Relayer API
         

‚ Horizen Relayer ‚
‚  REST API       ‚
¬
         ‚ 4. Submit to zkVerify chain
         

‚  zkVerify Chain ‚
‚ (Proof verified)‚
¬
         ‚ 5. Return tx hash + status
         

‚  Next.js API    ‚
‚  Polls status   ‚
¬
         ‚ 6. When finalized
         

‚ ZKVerifyOracle  ‚   Your contract on Ethereum
‚  .sol           ‚

```

## API Endpoints

### 1. Submit Proof (`POST /api/zkverify/submit-proof`)

Submits a zero-knowledge proof to zkVerify for verification.

**Request:**
```json
{
  "proof": "0x...",
  "publicSignals": ["0x...", "0x..."],
  "vk": "0x...",
  "proofType": "groth16",
  "chainId": 11155111,
  "userAddress": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "uuid-v4",
  "optimisticVerify": "success",
  "message": "Proof submitted to zkVerify successfully"
}
```

### 2. Get Job Status (`GET /api/zkverify/job-status/[jobId]`)

Polls the status of a proof verification job.

**Job Status Values:**
- `Queued` - Proof accepted and waiting for processing
- `Valid` - Proof passed optimistic verification
- `Submitted` - Proof submitted to blockchain/mempool
- `IncludedInBlock` - Proof transaction included in a block
- `Finalized` -  Proof transaction finalized on-chain
- `Failed` -  Proof processing failed
- `AggregationPending` - Proof ready for aggregation
- `Aggregated` - Proof successfully aggregated
- `AggregationPublished` - Proof aggregation published to contract

**Response:**
```json
{
  "success": true,
  "jobStatus": {
    "jobId": "uuid-v4",
    "status": "Finalized",
    "statusId": 4,
    "proofType": "groth16",
    "chainId": 11155111,
    "txHash": "0x...",
    "blockHash": "0x...",
    "createdAt": "2025-11-18T12:00:00.000Z",
    "updatedAt": "2025-11-18T12:01:00.000Z"
  }
}
```

### 3. Register Verification Key (`POST /api/zkverify/register-vk`)

Registers a verification key with zkVerify. This should be done once per VK before submitting proofs.

**Request:**
```json
{
  "vk": { ... },
  "proofType": "groth16",
  "proofOptions": {
    "library": "snarkjs",
    "curve": "bn128"
  }
}
```

**Response:**
```json
{
  "success": true,
  "vkHash": "0x...",
  "meta": { ... },
  "message": "Verification key registered successfully"
}
```

### 4. Submit Attestation (`POST /api/zkverify/submit-attestation`)

Submits a zkVerify attestation to your ZKVerifyOracle contract on Ethereum.

**Request:**
```json
{
  "proofHash": "0x...",
  "verified": true,
  "zkVerifyBlockHash": "0x...",
  "zkVerifyTxHash": "0x...",
  "userAddress": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "transactionHash": "0x...",
  "blockNumber": 12345678,
  "gasUsed": "150000",
  "message": "Attestation submitted to oracle successfully"
}
```

## SDK Usage

### Initialize the SDK

```typescript
import { ZKVerifyBridge } from '@treza/core';

// Initialize with your Next.js API endpoint
const bridge = new ZKVerifyBridge('http://localhost:3000/api');
// Production: new ZKVerifyBridge('https://yourdomain.com/api')
```

### Complete Verification Flow

```typescript
// Assume you have a ZKPassport proof
const zkPassportProof = {
  uniqueIdentifier: "user_123",
  verified: true,
  result: {
    age: 25,
    nationality: "US"
  },
  proof: "...",
  timestamp: Date.now()
};

// Process complete verification (includes oracle submission)
const complianceProof = await bridge.processComplianceVerification(
  zkPassportProof,
  userAddress,
  true // Submit to oracle contract
);

console.log('zkVerify Job ID:', complianceProof.jobId);
console.log('zkVerify Receipt:', complianceProof.zkVerifyReceipt);
console.log('Oracle Tx Hash:', complianceProof.txHash);
```

### Manual Step-by-Step Flow

```typescript
// 1. Convert proof to zkVerify format
const zkVerifyProof = await bridge.convertToZKVerifyFormat(zkPassportProof);

// 2. Submit to zkVerify
const { jobId, optimisticVerify } = await bridge.submitToZKVerify(
  zkVerifyProof,
  userAddress
);

// 3. Wait for finalization
const jobStatus = await bridge.waitForJobFinalization(jobId);

// 4. Submit to oracle (optional)
const proofHash = ethers.keccak256(ethers.toUtf8Bytes(proof + userAddress));
const txHash = await bridge.submitAttestationToOracle(
  proofHash,
  true,
  jobStatus,
  userAddress
);
```

## Environment Configuration

Create a `.env` file in `treza-app/`:

```bash
# zkVerify Relayer
ZKVERIFY_RELAYER_URL=https://relayer-api-testnet.horizenlabs.io/api/v1
ZKVERIFY_RELAYER_API_KEY=your_api_key

# Oracle Contract
ZKVERIFY_ORACLE_ADDRESS=0x...
ORACLE_PRIVATE_KEY=0x...

# Ethereum RPC
ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-key
```

### Getting an API Key

1. **Testnet**: Visit [https://relayer-testnet.horizenlabs.io](https://relayer-testnet.horizenlabs.io)
2. **Mainnet**: Visit [https://relayer.horizenlabs.io](https://relayer.horizenlabs.io)
3. Sign up and create an API key

### API Documentation

- **Testnet Swagger**: [https://relayer-api-testnet.horizenlabs.io/docs](https://relayer-api-testnet.horizenlabs.io/docs)
- **Mainnet Swagger**: [https://relayer-api-mainnet.horizenlabs.io/docs](https://relayer-api-mainnet.horizenlabs.io/docs)
- **zkVerify Docs**: [https://docs.zkverify.io](https://docs.zkverify.io)

## Supported Proof Types

The Horizen Relayer supports multiple proof systems:

- **Groth16** (Circom, snarkjs)
- **UltraHonk** (Noir)
- **UltraPlonk** (Noir)
- **Risc Zero** (v2.1)
- **SP1**
- **EZKL**

Default in TREZA: **Groth16** (used by ZKPassport)

## Oracle Integration

The `ZKVerifyOracle.sol` contract maintains a decentralized oracle network that:

1. **Receives attestations** from authorized oracle nodes
2. **Requires multi-oracle consensus** (configurable)
3. **Provides on-chain verification** via `isProofVerified(bytes32)`
4. **Enables composability** - other contracts can check compliance

### Oracle Node Requirements

To run an oracle node:

1. Register address in `ZKVerifyOracle.addOracle()`
2. Stake minimum ETH (1 ETH by default)
3. Monitor zkVerify finalization via Relayer API
4. Submit attestations with signature

## Security Considerations

1. **API Key Protection**: Store in environment variables, never commit
2. **Oracle Private Key**: Use secure key management (AWS KMS, HashiCorp Vault)
3. **RPC Rate Limits**: Use paid RPC providers for production
4. **Multi-Oracle Consensus**: Require multiple confirmations (3+ recommended)
5. **Challenge Period**: ZKVerifyOracle has 1-day challenge period

## Example: DeFi Integration

```typescript
// In your DeFi app
import { TrezaComplianceSDK } from '@treza/core';

const sdk = new TrezaComplianceSDK({
  apiEndpoint: process.env.NEXT_PUBLIC_API_URL,
  // ... other config
});

// Before allowing trade
async function checkCompliance(userAddress: string) {
  const isCompliant = await sdk.checkComplianceStatus(userAddress);
  
  if (!isCompliant) {
    // Initiate verification
    const verificationUrl = await sdk.initiateVerification({
      minAge: 18,
      allowedCountries: ['US', 'CA', 'GB'],
      requireUniqueId: true
    });
    
    // Redirect user to ZKPassport
    window.location.href = verificationUrl;
    return false;
  }
  
  return true;
}

// Allow trade only if compliant
if (await checkCompliance(user.address)) {
  await executeTrade();
}
```

## Troubleshooting

### "ZKVERIFY_RELAYER_API_KEY not configured"

Ensure your `.env` file has the API key set and the server has been restarted.

### "Optimistic verification failed"

The proof format or public inputs may be incorrect. Check:
- Proof is properly formatted (hex string)
- Public signals match circuit expectations
- VK is registered correctly

### "Timeout: Job did not finalize"

zkVerify finalization can take 30-60 seconds. Increase `maxAttempts` in `waitForJobFinalization()`.

### "Oracle not active" or "Insufficient stake"

Ensure your oracle node is:
1. Registered in the contract
2. Has staked at least MIN_STAKE_AMOUNT (1 ETH)
3. Using the correct private key

## Cost Estimation

### zkVerify Costs (via Relayer)
- **Per Proof Verification**: ~$0.01 - $0.10 (depending on proof type)
- **VK Registration**: One-time, ~$0.05

### Ethereum Costs (Oracle Submission)
- **submitVerificationResult()**: ~150,000 gas
- At 50 gwei: ~$7.50 per attestation
- **Recommendation**: Use L2 (Arbitrum, Optimism) for lower costs

### Optimization Tips
1. Use **aggregation mode** to batch multiple proofs
2. Submit to L2 instead of mainnet
3. Cache VK registrations
4. Use oracle consensus efficiently (3-5 oracles)

## References

- [zkVerify Documentation](https://docs.zkverify.io)
- [Horizen Relayer API](https://docs.zkverify.io/overview/getting-started/relayer)
- [ZKPassport](https://zkpassport.io)
- [TREZA Contracts Documentation](../../treza-contracts/docs/)

## Support

For issues or questions:
- GitHub Issues: [treza-sdk](https://github.com/yourorg/treza-sdk/issues)
- Discord: [Join our community](#)
- Email: support@treza.io

