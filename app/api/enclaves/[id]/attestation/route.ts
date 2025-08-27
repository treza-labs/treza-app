import { NextRequest, NextResponse } from 'next/server';
import { 
  TABLES, 
  getItem
} from '@/lib/dynamodb';

interface AttestationData {
  attestationDocument: {
    pcrs: {
      0?: string;
      1?: string;
      2?: string;
      8?: string;
    };
  };
  endpoints: {
    verificationUrl: string;
    apiEndpoint: string;
  };
  verification: {
    verificationStatus: 'VERIFIED' | 'PENDING' | 'FAILED';
    integrityScore: number;
    trustLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verify enclave exists
    const result = await getItem(TABLES.ENCLAVES, { id });
    
    if (!result.Item) {
      return NextResponse.json({ error: 'Enclave not found' }, { status: 404 });
    }

    const enclave = result.Item;

    // Only provide attestation for deployed enclaves
    if (enclave.status !== 'DEPLOYED') {
      return NextResponse.json({ 
        error: 'Attestation only available for deployed enclaves',
        status: enclave.status 
      }, { status: 400 });
    }

    // Fetch PCR values from the new PCR endpoint
    const pcrResponse = await fetch(`${request.nextUrl.origin}/api/enclaves/${id}/pcrs`);
    const pcrData = await pcrResponse.json();
    
    const pcrs = pcrData.pcrs || {};
    
    // Determine verification status based on PCR availability
    const hasPCRs = Object.keys(pcrs).length > 0;
    const verificationStatus = hasPCRs ? 'VERIFIED' : 'PENDING';
    const integrityScore = hasPCRs ? 95 : 0;
    const trustLevel = hasPCRs ? 'HIGH' : 'UNKNOWN';

    const attestationData: AttestationData = {
      attestationDocument: {
        pcrs: {
          0: pcrs.pcr0,
          1: pcrs.pcr1,
          2: pcrs.pcr2,
          8: pcrs.pcr8
        }
      },
      endpoints: {
        verificationUrl: `${request.nextUrl.origin}/api/enclaves/${id}/attestation/verify`,
        apiEndpoint: `${request.nextUrl.origin}/api/enclaves/${id}/attestation`
      },
      verification: {
        verificationStatus,
        integrityScore,
        trustLevel
      }
    };

    return NextResponse.json(attestationData);

  } catch (error) {
    console.error('Error fetching attestation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}