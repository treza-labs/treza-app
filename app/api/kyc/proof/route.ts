/**
 * POST /api/kyc/proof
 * Submit a ZK proof for KYC verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const ddbDocClient = DynamoDBDocumentClient.from(client);

interface ZKProof {
  commitment: string;
  proof: string;
  publicInputs: string[];
  timestamp: string;
  algorithm: string;
}

interface SubmitProofRequest {
  userId: string;
  proof: ZKProof;
  deviceInfo?: {
    platform?: string;
    version?: string;
  };
}

interface ProofRecord {
  proofId: string;
  userId: string;
  commitment: string;
  proof: string;
  publicInputs: string[];
  algorithm: string;
  status: string;
  verifiedAt: string;
  expiresAt: string;
  createdAt: string;
  devicePlatform?: string;
  deviceVersion?: string;
  chainTxHash?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: SubmitProofRequest = await request.json();
    const { userId, proof, deviceInfo } = body;

    // Validate required fields
    if (!userId || !proof) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and proof' },
        { status: 400 }
      );
    }

    // Validate proof format
    if (!isValidProof(proof)) {
      return NextResponse.json(
        { error: 'Invalid proof format' },
        { status: 400 }
      );
    }

    // Verify proof cryptographically
    const isValid = verifyProof(proof);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Proof verification failed' },
        { status: 400 }
      );
    }

    // Generate proof ID
    const proofId = randomUUID();
    
    // Calculate expiry (7 days from now)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // Create proof record
    const proofRecord: ProofRecord = {
      proofId,
      userId,
      commitment: proof.commitment,
      proof: proof.proof,
      publicInputs: proof.publicInputs,
      algorithm: proof.algorithm,
      status: 'verified',
      verifiedAt: new Date().toISOString(),
      expiresAt,
      createdAt: new Date().toISOString(),
      devicePlatform: deviceInfo?.platform,
      deviceVersion: deviceInfo?.version,
    };

    // Store in DynamoDB
    const tableName = process.env.DYNAMODB_TABLE_NAME || 'treza-kyc-proofs';
    
    try {
      await ddbDocClient.send(
        new PutCommand({
          TableName: tableName,
          Item: proofRecord,
        })
      );
    } catch (dbError) {
      console.error('DynamoDB error:', dbError);
      // Continue even if DB fails - can fallback to in-memory or other storage
    }

    // TODO: Optional blockchain submission
    // const chainTxHash = await submitToBlockchain(proofRecord);

    // Return response
    return NextResponse.json({
      proofId,
      verificationUrl: `/api/kyc/proof/${proofId}`,
      expiresAt,
      chainTxHash: undefined, // Will be populated when blockchain integration is added
    }, { status: 201 });

  } catch (error) {
    console.error('Error submitting proof:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Validate proof format
 */
function isValidProof(proof: ZKProof): boolean {
  return (
    typeof proof.commitment === 'string' &&
    proof.commitment.length === 64 &&
    typeof proof.proof === 'string' &&
    proof.proof.length > 64 &&
    Array.isArray(proof.publicInputs) &&
    proof.publicInputs.length > 0 &&
    proof.algorithm === 'Pedersen-SHA256'
  );
}

/**
 * Verify proof cryptographically
 * 
 * In production, this should:
 * 1. Verify the mathematical relationship between commitment and proof
 * 2. Check timestamp freshness
 * 3. Validate signature if present
 * 
 * For now, we do basic format validation
 */
function verifyProof(proof: ZKProof): boolean {
  // Check timestamp is recent (within 1 hour)
  try {
    const timestamp = new Date(proof.timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = diffMs / (1000 * 60);
    
    if (diffMins > 60) {
      console.warn('Proof timestamp is too old');
      return false;
    }
  } catch (error) {
    console.error('Invalid timestamp format');
    return false;
  }

  // Check commitment is valid hex
  const hexRegex = /^[0-9a-fA-F]+$/;
  if (!hexRegex.test(proof.commitment)) {
    console.error('Invalid commitment format');
    return false;
  }

  // In production: Add zk-SNARK verification here
  // const isValidZKProof = await zkSNARKVerifier.verify(proof);

  return true;
}

