/**
 * GET /api/kyc/proof/[proofId]/verify
 * Verify a proof by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const ddbDocClient = DynamoDBDocumentClient.from(client);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ proofId: string }> }
) {
  try {
    const { proofId } = await params;

    // Fetch proof from DynamoDB
    const tableName = process.env.DYNAMODB_TABLE_NAME || 'treza-kyc-proofs';
    
    const result = await ddbDocClient.send(
      new GetCommand({
        TableName: tableName,
        Key: { proofId },
      })
    );

    const proofRecord = result.Item;

    if (!proofRecord) {
      return NextResponse.json(
        { error: 'Proof not found' },
        { status: 404 }
      );
    }

    // Check if proof is expired
    const now = new Date();
    const expiresAt = new Date(proofRecord.expiresAt);
    const isExpired = now > expiresAt;

    if (isExpired) {
      return NextResponse.json(
        { 
          error: 'Proof expired',
          expiresAt: proofRecord.expiresAt
        },
        { status: 410 }
      );
    }

    // Verify on blockchain if available
    let chainVerified = false;
    if (proofRecord.chainTxHash) {
      // TODO: Verify on blockchain
      // chainVerified = await verifyOnChain(proofRecord.chainTxHash);
      chainVerified = true; // Placeholder
    }

    // Return verification result
    return NextResponse.json({
      proofId,
      isValid: proofRecord.status === 'verified',
      publicInputs: proofRecord.publicInputs,
      verifiedAt: proofRecord.verifiedAt,
      chainVerified,
      expiresAt: proofRecord.expiresAt,
    });

  } catch (error) {
    console.error('Error verifying proof:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

