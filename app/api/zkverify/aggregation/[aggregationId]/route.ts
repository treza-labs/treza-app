import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const RELAYER_API_URL = process.env.ZKVERIFY_RELAYER_URL || 
  'https://relayer-api-testnet.horizenlabs.io/api/v1';
const RELAYER_API_KEY = process.env.ZKVERIFY_RELAYER_API_KEY;

/**
 * Get aggregation details for smart contract verification
 * 
 * This endpoint retrieves the aggregation data needed to verify proofs
 * on-chain using zkVerify's aggregation contract.
 * 
 * The aggregation data includes:
 * - Merkle proof path
 * - Domain ID
 * - Leaf count
 * - Leaf index
 * - Root hash
 * 
 * These are used with IVerifyProofAggregation.verifyProofAggregation()
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { aggregationId: string } }
) {
  try {
    const { aggregationId } = params;

    if (!aggregationId) {
      return NextResponse.json(
        { error: 'Aggregation ID is required' },
        { status: 400 }
      );
    }

    if (!RELAYER_API_KEY) {
      return NextResponse.json(
        { error: 'ZKVERIFY_RELAYER_API_KEY not configured' },
        { status: 500 }
      );
    }

    console.log(`📦 Fetching aggregation data for: ${aggregationId}`);

    // Get aggregation details from Relayer
    const response = await axios.get(
      `${RELAYER_API_URL}/aggregation/${aggregationId}`,
      {
        headers: {
          'Authorization': `Bearer ${RELAYER_API_KEY}`
        }
      }
    );

    const aggregationData = response.data;

    console.log(`✅ Aggregation data retrieved for: ${aggregationId}`);

    return NextResponse.json({
      success: true,
      aggregation: {
        aggregationId: aggregationData.aggregationId,
        domainId: aggregationData.domainId,
        root: aggregationData.root,
        leafCount: aggregationData.numberOfLeaves,
        merkleProof: aggregationData.merkleProof,
        leafIndex: aggregationData.leafIndex,
        leaf: aggregationData.leaf,
        statement: aggregationData.statement,
        receipt: aggregationData.receipt,
        receiptBlockHash: aggregationData.receiptBlockHash
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching aggregation data:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      return NextResponse.json(
        { error: 'Aggregation not found', aggregationId: params.aggregationId },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch aggregation data', 
        details: error.response?.data || error.message 
      },
      { status: 500 }
    );
  }
}

