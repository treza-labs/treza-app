/**
 * GET /api/kyc/proof/[proofId]
 * Get proof details
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
  { params }: { params: { proofId: string } }
) {
  try {
    const { proofId } = params;
    const { searchParams } = new URL(request.url);
    const includePrivate = searchParams.get('includePrivate') === 'true';

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

    // Build response (public data by default)
    const response: any = {
      proofId,
      commitment: proofRecord.commitment,
      publicInputs: proofRecord.publicInputs,
      algorithm: proofRecord.algorithm,
      verifiedAt: proofRecord.verifiedAt,
      expiresAt: proofRecord.expiresAt,
    };

    // Include proof signature if requested (for re-verification)
    if (includePrivate) {
      // TODO: Add authentication check here
      // Only the proof owner should be able to access private data
      response.proof = proofRecord.proof;
      response.timestamp = proofRecord.timestamp;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error getting proof:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

