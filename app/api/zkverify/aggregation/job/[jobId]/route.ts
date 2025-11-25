import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const RELAYER_API_URL = process.env.ZKVERIFY_RELAYER_URL || 
  'https://relayer-api-testnet.horizenlabs.io/api/v1';
const RELAYER_API_KEY = process.env.ZKVERIFY_RELAYER_API_KEY;

/**
 * Get aggregation data for a specific job ID
 * 
 * This is a convenience endpoint that fetches job status and if the job
 * is aggregated, returns the aggregation details needed for smart contract verification.
 * 
 * This combines job-status and aggregation data in one call.
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

    console.log(`📊 Fetching aggregation data for job: ${jobId}`);

    // Get job status first
    const jobResponse = await axios.get(
      `${RELAYER_API_URL}/job-status/${RELAYER_API_KEY}/${jobId}`
    );

    const jobStatus = jobResponse.data;

    // Check if job is aggregated
    if (jobStatus.status !== 'Aggregated' && jobStatus.status !== 'AggregationPublished') {
      return NextResponse.json({
        success: false,
        message: `Job is not yet aggregated. Current status: ${jobStatus.status}`,
        jobStatus: {
          jobId: jobStatus.jobId,
          status: jobStatus.status,
          statusId: jobStatus.statusId
        }
      });
    }

    console.log(`✅ Job aggregated. Aggregation ID: ${jobStatus.aggregationId}`);

    // Return aggregation details
    return NextResponse.json({
      success: true,
      aggregation: {
        jobId: jobStatus.jobId,
        aggregationId: jobStatus.aggregationId,
        statement: jobStatus.statement,
        domainId: jobStatus.aggregationDetails?.domainId,
        root: jobStatus.aggregationDetails?.root,
        leafCount: jobStatus.aggregationDetails?.numberOfLeaves,
        leafIndex: jobStatus.aggregationDetails?.leafIndex,
        merkleProof: jobStatus.aggregationDetails?.merkleProof,
        leaf: jobStatus.aggregationDetails?.leaf,
        receipt: jobStatus.aggregationDetails?.receipt,
        receiptBlockHash: jobStatus.aggregationDetails?.receiptBlockHash
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching aggregation for job:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      return NextResponse.json(
        { error: 'Job not found', jobId: (await params).jobId },
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

