import { NextRequest, NextResponse } from 'next/server';
import { getAvailableProviders, getProvider } from '@/lib/providers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('id');

    if (providerId) {
      // Get specific provider
      const provider = getProvider(providerId);
      if (!provider) {
        return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
      }
      return NextResponse.json({ provider });
    } else {
      // Get all available providers
      const providers = getAvailableProviders();
      return NextResponse.json({ providers });
    }
  } catch (error) {
    console.error('Error fetching providers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 