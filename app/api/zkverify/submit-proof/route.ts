import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const RELAYER_API_URL = process.env.ZKVERIFY_RELAYER_URL || 
  'https://relayer-api-testnet.horizenlabs.io/api/v1';
const RELAYER_API_KEY = process.env.ZKVERIFY_RELAYER_API_KEY;

interface SubmitProofRequest {
  proof: string;
  publicSignals: string[];
  vk: string;
  proofType?: string;
  chainId?: number;
  userAddress?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SubmitProofRequest = await request.json();
    const { 
      proof, 
      publicSignals, 
      vk, 
      proofType = 'groth16', 
      chainId = 11155111, // Sepolia testnet
      userAddress 
    } = body;

    if (!proof || !publicSignals || !vk) {
      return NextResponse.json(
        { error: 'Missing required fields: proof, publicSignals, vk' },
        { status: 400 }
      );
    }

    if (!RELAYER_API_KEY) {
      return NextResponse.json(
        { error: 'ZKVERIFY_RELAYER_API_KEY not configured. Get one from https://relayer.horizenlabs.io' },
        { status: 500 }
      );
    }

    console.log('📤 Submitting proof to zkVerify Relayer...');

    // Submit to Horizen Relayer
    const response = await axios.post(
      `${RELAYER_API_URL}/submit-proof/${RELAYER_API_KEY}`,
      {
        proofType,
        vkRegistered: true,
        chainId,
        proofData: {
          proof,
          publicSignals,
          vk
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    const { jobId, optimisticVerify } = response.data;

    console.log(`✅ Proof submitted. JobId: ${jobId}, Optimistic: ${optimisticVerify}`);

    if (optimisticVerify !== 'success') {
      return NextResponse.json(
        { 
          error: 'Optimistic verification failed', 
          details: response.data,
          jobId 
        },
        { status: 400 }
      );
    }

    // Optionally store job in database for tracking
    // This allows you to track proof submissions per user
    // await putItem(TABLES.ZK_JOBS, { 
    //   jobId, 
    //   userAddress,
    //   createdAt: getCurrentTimestamp(), 
    //   status: 'Submitted' 
    // });

    return NextResponse.json({
      success: true,
      jobId,
      optimisticVerify,
      message: 'Proof submitted to zkVerify successfully'
    });

  } catch (error: any) {
    console.error('❌ Error submitting proof to zkVerify:', error.response?.data || error.message);
    return NextResponse.json(
      { 
        error: 'Failed to submit proof to zkVerify', 
        details: error.response?.data || error.message 
      },
      { status: 500 }
    );
  }
}

