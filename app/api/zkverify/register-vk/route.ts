import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const RELAYER_API_URL = process.env.ZKVERIFY_RELAYER_URL || 
  'https://relayer-api-testnet.horizenlabs.io/api/v1';
const RELAYER_API_KEY = process.env.ZKVERIFY_RELAYER_API_KEY;

interface RegisterVkRequest {
  vk: any; // Verification key data structure (depends on proof type)
  proofType?: string;
  proofOptions?: {
    library?: string;
    curve?: string;
    numberOfPublicInputs?: number;
    version?: string;
  };
}

/**
 * Register a verification key with zkVerify
 * 
 * This should be done once per verification key before submitting proofs.
 * The returned vkHash can be reused for subsequent proof submissions.
 * 
 * Supported proof types: groth16, risc0, ultrahonk, ultraplonk, sp1, ezkl
 */
export async function POST(request: NextRequest) {
  try {
    const body: RegisterVkRequest = await request.json();
    const { vk, proofType = 'groth16', proofOptions } = body;

    if (!vk) {
      return NextResponse.json(
        { error: 'Missing verification key (vk)' },
        { status: 400 }
      );
    }

    if (!RELAYER_API_KEY) {
      return NextResponse.json(
        { error: 'ZKVERIFY_RELAYER_API_KEY not configured' },
        { status: 500 }
      );
    }

    console.log(`🔑 Registering verification key for ${proofType}...`);

    // Register VK with Horizen Relayer
    const response = await axios.post(
      `${RELAYER_API_URL}/register-vk/${RELAYER_API_KEY}`,
      {
        proofType,
        ...(proofOptions && { proofOptions }),
        vk
      },
      {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    const { vkHash, meta } = response.data;

    console.log(`✅ Verification key registered: ${vkHash}`);

    // Optionally store vkHash in database for reference
    // await putItem(TABLES.VK_REGISTRY, {
    //   vkHash,
    //   proofType,
    //   createdAt: getCurrentTimestamp(),
    //   meta
    // });

    return NextResponse.json({
      success: true,
      vkHash,
      meta,
      message: 'Verification key registered successfully'
    });

  } catch (error: any) {
    console.error('❌ Error registering verification key:', error.response?.data || error.message);
    
    // Check if VK is already registered
    if (error.response?.data?.vkHash) {
      return NextResponse.json({
        success: true,
        vkHash: error.response.data.vkHash,
        meta: error.response.data.meta,
        message: 'Verification key already registered',
        alreadyRegistered: true
      });
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to register verification key', 
        details: error.response?.data || error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * Check if a verification key is already registered
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vkHash = searchParams.get('vkHash');

    if (!vkHash) {
      return NextResponse.json(
        { error: 'vkHash parameter is required' },
        { status: 400 }
      );
    }

    // Check database for VK registration
    // const result = await queryItems(
    //   TABLES.VK_REGISTRY,
    //   'vkHash = :vkHash',
    //   { ':vkHash': vkHash }
    // );

    return NextResponse.json({
      success: true,
      isRegistered: false, // Update based on DB query
      // vkData: result.Items?.[0]
    });

  } catch (error: any) {
    console.error('❌ Error checking VK registration:', error.message);
    return NextResponse.json(
      { error: 'Failed to check VK registration', details: error.message },
      { status: 500 }
    );
  }
}

