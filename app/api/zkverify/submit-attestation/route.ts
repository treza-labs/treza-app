import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const ORACLE_CONTRACT_ADDRESS = process.env.ZKVERIFY_ORACLE_ADDRESS;
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;
const RPC_URL = process.env.ETHEREUM_RPC_URL;

/**
 * DEPRECATED: This endpoint uses the old ZKVerifyOracle pattern.
 * Use KYCVerifier contract directly instead.
 * This file is kept for backward compatibility but should not be used in new implementations.
 */

// Legacy Oracle ABI - DEPRECATED
const ORACLE_ABI = [
  "function submitVerificationResult(bytes32 proofHash, bool verified, bytes32 zkVerifyBlockHash, bytes signature) external",
  "function isProofVerified(bytes32 proofHash) external view returns (bool)",
  "function getVerificationResult(bytes32 proofHash) external view returns (tuple(bytes32 proofHash, bool verified, bool finalized, uint256 confirmations, bytes32 zkVerifyBlockHash, uint256 timestamp, address submitter))"
];

interface SubmitAttestationRequest {
  proofHash: string;
  verified: boolean;
  zkVerifyBlockHash: string;
  zkVerifyTxHash?: string;
  userAddress?: string;
}

/**
 * DEPRECATED: Submit a zkVerify attestation to the ZKVerifyOracle contract
 * 
 * This endpoint is deprecated. Use the KYCVerifier contract directly instead.
 * Kept for backward compatibility only.
 */
export async function POST(request: NextRequest) {
  try {
    const body: SubmitAttestationRequest = await request.json();
    const { proofHash, verified, zkVerifyBlockHash, zkVerifyTxHash, userAddress } = body;

    // Validation
    if (!proofHash || verified === undefined || !zkVerifyBlockHash) {
      return NextResponse.json(
        { error: 'Missing required fields: proofHash, verified, zkVerifyBlockHash' },
        { status: 400 }
      );
    }

    if (!ethers.isHexString(proofHash, 32)) {
      return NextResponse.json(
        { error: 'Invalid proofHash format (must be 32-byte hex string)' },
        { status: 400 }
      );
    }

    if (!ethers.isHexString(zkVerifyBlockHash, 32)) {
      return NextResponse.json(
        { error: 'Invalid zkVerifyBlockHash format (must be 32-byte hex string)' },
        { status: 400 }
      );
    }

    // Check environment configuration
    if (!ORACLE_CONTRACT_ADDRESS || !ORACLE_PRIVATE_KEY || !RPC_URL) {
      return NextResponse.json(
        { 
          error: 'Oracle configuration incomplete', 
          details: 'Missing ZKVERIFY_ORACLE_ADDRESS, ORACLE_PRIVATE_KEY, or ETHEREUM_RPC_URL' 
        },
        { status: 500 }
      );
    }

    console.log('📝 Submitting attestation to oracle contract...');
    console.log(`  Proof Hash: ${proofHash}`);
    console.log(`  Verified: ${verified}`);
    console.log(`  zkVerify Block: ${zkVerifyBlockHash}`);
    console.log(`  zkVerify Tx: ${zkVerifyTxHash || 'N/A'}`);

    // Setup provider and signer
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(ORACLE_PRIVATE_KEY, provider);
    
    // Connect to oracle contract
    const oracleContract = new ethers.Contract(
      ORACLE_CONTRACT_ADDRESS,
      ORACLE_ABI,
      signer
    );

    // Get chain ID for signature
    const network = await provider.getNetwork();
    const chainId = network.chainId;

    // Create message hash (matching ZKVerifyOracle contract format)
    const messageHash = ethers.solidityPackedKeccak256(
      ['bytes32', 'bool', 'bytes32', 'uint256', 'address'],
      [proofHash, verified, zkVerifyBlockHash, chainId, ORACLE_CONTRACT_ADDRESS]
    );

    // Sign the message (EIP-191 format)
    const messageHashBytes = ethers.getBytes(messageHash);
    const signature = await signer.signMessage(messageHashBytes);

    console.log('✍️  Signature created, submitting transaction...');

    // Submit to oracle contract
    const tx = await oracleContract.submitVerificationResult(
      proofHash,
      verified,
      zkVerifyBlockHash,
      signature
    );

    console.log(`📤 Transaction submitted: ${tx.hash}`);

    // Wait for confirmation
    const receipt = await tx.wait();

    console.log(`✅ Attestation confirmed in block ${receipt.blockNumber}`);

    // Optionally update database with attestation record
    // await putItem(TABLES.ATTESTATIONS, {
    //   proofHash,
    //   userAddress,
    //   verified,
    //   zkVerifyBlockHash,
    //   zkVerifyTxHash,
    //   ethTxHash: receipt.hash,
    //   blockNumber: receipt.blockNumber,
    //   createdAt: getCurrentTimestamp()
    // });

    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      message: 'Attestation submitted to oracle successfully'
    });

  } catch (error: any) {
    console.error('❌ Error submitting attestation:', error);
    
    // Handle specific contract errors
    if (error.reason) {
      return NextResponse.json(
        { 
          error: 'Contract rejected transaction', 
          reason: error.reason,
          details: error.message 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to submit attestation to oracle', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * Check if a proof has been verified on-chain
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const proofHash = searchParams.get('proofHash');

    if (!proofHash) {
      return NextResponse.json(
        { error: 'proofHash parameter is required' },
        { status: 400 }
      );
    }

    if (!ORACLE_CONTRACT_ADDRESS || !RPC_URL) {
      return NextResponse.json(
        { error: 'Oracle configuration incomplete' },
        { status: 500 }
      );
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const oracleContract = new ethers.Contract(
      ORACLE_CONTRACT_ADDRESS,
      ORACLE_ABI,
      provider
    );

    // Check if proof is verified
    const isVerified = await oracleContract.isProofVerified(proofHash);
    
    // Get full verification result
    const result = await oracleContract.getVerificationResult(proofHash);

    return NextResponse.json({
      success: true,
      isVerified,
      verificationResult: {
        proofHash: result.proofHash,
        verified: result.verified,
        finalized: result.finalized,
        confirmations: result.confirmations.toString(),
        zkVerifyBlockHash: result.zkVerifyBlockHash,
        timestamp: result.timestamp.toString(),
        submitter: result.submitter
      }
    });

  } catch (error: any) {
    console.error('❌ Error checking proof verification:', error.message);
    return NextResponse.json(
      { error: 'Failed to check proof verification', details: error.message },
      { status: 500 }
    );
  }
}

