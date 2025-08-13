import { NextRequest, NextResponse } from 'next/server';
import { 
  TABLES, 
  generateId, 
  getCurrentTimestamp,
  putItem,
  queryItems,
  updateItem,
  deleteItem
} from '@/lib/dynamodb';
import { getProvider, providerRegistry } from '@/lib/providers';

// Updated interface with provider support
interface Enclave {
  id: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING_DEPLOY' | 'PENDING_DESTROY' | 'DEPLOYING' | 'DEPLOYED' | 'PAUSING' | 'PAUSED' | 'RESUMING' | 'DESTROYING' | 'DESTROYED' | 'FAILED';
  region: string;
  walletAddress: string;
  createdAt: string;
  updatedAt: string;
  // Provider fields
  providerId: string;
  providerConfig: { [key: string]: any };
  githubConnection?: {
    isConnected: boolean;
    username: string;
    selectedRepo?: string;
    selectedBranch?: string;
    accessToken?: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    const result = await queryItems(
      TABLES.ENCLAVES,
      'WalletIndex',
      'walletAddress = :walletAddress',
      {
        ':walletAddress': walletAddress
      }
    );

    return NextResponse.json({ enclaves: result.Items || [] });
  } catch (error) {
    console.error('Error fetching enclaves:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, region, walletAddress, providerId, providerConfig, githubConnection } = body;

    if (!name || !description || !region || !walletAddress || !providerId) {
      return NextResponse.json({ error: 'Missing required fields (name, description, region, walletAddress, providerId)' }, { status: 400 });
    }

    // Validate provider exists
    const provider = getProvider(providerId);
    if (!provider) {
      return NextResponse.json({ error: `Provider ${providerId} not found` }, { status: 400 });
    }

    // Validate region is supported by provider
    if (!provider.regions.includes(region)) {
      return NextResponse.json({ error: `Region ${region} not supported by provider ${providerId}` }, { status: 400 });
    }

    // Validate provider configuration
    const configValidation = provider.validateConfig(providerConfig || {});
    if (!configValidation.isValid) {
      return NextResponse.json({ 
        error: 'Invalid provider configuration', 
        details: configValidation.errors 
      }, { status: 400 });
    }

    const newEnclave: Enclave = {
      id: generateId('enc'),
      name,
      description,
      region,
      walletAddress,
      providerId,
      providerConfig: providerConfig || {},
      status: 'PENDING_DEPLOY',
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      ...(githubConnection && { githubConnection })
    };

    await putItem(TABLES.ENCLAVES, newEnclave);

    return NextResponse.json({ enclave: newEnclave }, { status: 201 });
  } catch (error) {
    console.error('Error creating enclave:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, region, walletAddress, providerId, providerConfig, githubConnection } = body;

    if (!id || !walletAddress) {
      return NextResponse.json({ error: 'ID and wallet address required' }, { status: 400 });
    }

    // If provider is being updated, validate it
    if (providerId) {
      const provider = getProvider(providerId);
      if (!provider) {
        return NextResponse.json({ error: `Provider ${providerId} not found` }, { status: 400 });
      }

      // Validate region is supported by provider
      if (region && !provider.regions.includes(region)) {
        return NextResponse.json({ error: `Region ${region} not supported by provider ${providerId}` }, { status: 400 });
      }

      // Validate provider configuration
      if (providerConfig) {
        const configValidation = provider.validateConfig(providerConfig);
        if (!configValidation.isValid) {
          return NextResponse.json({ 
            error: 'Invalid provider configuration', 
            details: configValidation.errors 
          }, { status: 400 });
        }
      }
    }

    // Build update expression and attribute values
    let updateExpression = 'SET updatedAt = :updatedAt';
    const expressionAttributeValues: any = {
      ':updatedAt': getCurrentTimestamp(),
      ':walletAddress': walletAddress
    };
    const expressionAttributeNames: any = {};

    // Add fields to update if provided
    if (name) {
      updateExpression += ', #name = :name';
      expressionAttributeValues[':name'] = name;
      expressionAttributeNames['#name'] = 'name';
    }
    if (description) {
      updateExpression += ', #description = :description';
      expressionAttributeValues[':description'] = description;
      expressionAttributeNames['#description'] = 'description';
    }
    if (region) {
      updateExpression += ', #region = :region';
      expressionAttributeValues[':region'] = region;
      expressionAttributeNames['#region'] = 'region';
    }
    if (providerId) {
      updateExpression += ', providerId = :providerId';
      expressionAttributeValues[':providerId'] = providerId;
    }
    if (providerConfig) {
      updateExpression += ', providerConfig = :providerConfig';
      expressionAttributeValues[':providerConfig'] = providerConfig;
    }

    if (githubConnection) {
      updateExpression += ', githubConnection = :githubConnection';
      expressionAttributeValues[':githubConnection'] = githubConnection;
    } else if (githubConnection === null) {
      updateExpression += ' REMOVE githubConnection';
    }

    const result = await updateItem(
      TABLES.ENCLAVES,
      { id },
      updateExpression,
      expressionAttributeValues,
      'walletAddress = :walletAddress',
      Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined
    );

    if (!result.Attributes) {
      return NextResponse.json({ error: 'Enclave not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ enclave: result.Attributes });
  } catch (error: any) {
    console.error('Error updating enclave:', error);
    if (error.name === 'ConditionalCheckFailedException') {
      return NextResponse.json({ error: 'Enclave not found or access denied' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const walletAddress = searchParams.get('wallet');

    if (!id || !walletAddress) {
      return NextResponse.json({ error: 'ID and wallet address required' }, { status: 400 });
    }

    await deleteItem(
      TABLES.ENCLAVES,
      { id },
      'walletAddress = :walletAddress',
      {
        ':walletAddress': walletAddress
      }
    );

    return NextResponse.json({ message: 'Enclave deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting enclave:', error);
    if (error.name === 'ConditionalCheckFailedException') {
      return NextResponse.json({ error: 'Enclave not found or access denied' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 