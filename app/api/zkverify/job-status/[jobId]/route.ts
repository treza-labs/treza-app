import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const RELAYER_API_URL = process.env.ZKVERIFY_RELAYER_URL || 
  'https://relayer-api-testnet.horizenlabs.io/api/v1';
const RELAYER_API_KEY = process.env.ZKVERIFY_RELAYER_API_KEY;

/**
 * Get the status of a zkVerify proof verification job
 * 
 * Job Status Values:
 * - Queued: Proof accepted and waiting for processing
 * - Valid: Proof passed optimistic verification
 * - Submitted: Proof submitted to blockchain/mempool
 * - IncludedInBlock: Proof transaction included in a block
 * - Finalized: Proof transaction finalized on-chain ✓
 * - Failed: Proof processing failed
 * - AggregationPending: Proof ready for aggregation
 * - Aggregated: Proof successfully aggregated and published
 * - AggregationPublished: Proof aggregation successfully published to zkVerify contract
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    if (!RELAYER_API_KEY) {
      return NextResponse.json(
        { error: 'ZKVERIFY_RELAYER_API_KEY not configured' },
        { status: 500 }
      );
    }

    console.log(`📊 Fetching job status for: ${jobId}`);

    const response = await axios.get(
      `${RELAYER_API_URL}/job-status/${RELAYER_API_KEY}/${jobId}`
    );

    const jobStatus = response.data;

    console.log(`Job ${jobId} status: ${jobStatus.status}`);

    // Optionally update job in database
    // await updateItem(
    //   TABLES.ZK_JOBS,
    //   { jobId },
    //   'SET #status = :status, updatedAt = :updatedAt',
    //   { ':status': jobStatus.status, ':updatedAt': getCurrentTimestamp() },
    //   undefined,
    //   { '#status': 'status' }
    // );

    return NextResponse.json({
      success: true,
      jobStatus: {
        jobId: jobStatus.jobId,
        status: jobStatus.status,
        statusId: jobStatus.statusId,
        proofType: jobStatus.proofType,
        chainId: jobStatus.chainId,
        createdAt: jobStatus.createdAt,
        updatedAt: jobStatus.updatedAt,
        txHash: jobStatus.txHash,
        blockHash: jobStatus.blockHash,
        // Include aggregation details if available
        ...(jobStatus.aggregationId && {
          aggregationId: jobStatus.aggregationId,
          statement: jobStatus.statement,
          aggregationDetails: jobStatus.aggregationDetails
        })
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching job status:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      return NextResponse.json(
        { error: 'Job not found', jobId: (await params).jobId },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch job status', 
        details: error.response?.data || error.message 
      },
      { status: 500 }
    );
  }
}

