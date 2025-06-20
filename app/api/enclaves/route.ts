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

// Mock DynamoDB operations - replace with actual AWS SDK calls
// You would typically install @aws-sdk/client-dynamodb and @aws-sdk/lib-dynamodb

interface Enclave {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'pending';
  region: string;
  walletAddress: string;
  createdAt: string;
  updatedAt: string;
  githubConnection?: {
    isConnected: boolean;
    username: string;
    selectedRepo?: string;
    selectedBranch?: string;
    accessToken?: string;
  };
}

// Mock data - replace with DynamoDB queries
let mockEnclaves: Enclave[] = [
  {
    id: '1',
    name: 'Trading Bot Enclave',
    description: 'Secure environment for automated trading strategies',
    status: 'active',
    region: 'us-east-1',
    walletAddress: 'mock-wallet-address',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    githubConnection: {
      isConnected: true,
      username: 'example-user',
      selectedRepo: 'example-user/trading-bot',
      selectedBranch: 'main'
    }
  }
];

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
    const { name, description, region, walletAddress, githubConnection } = body;

    if (!name || !description || !region || !walletAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newEnclave: Enclave = {
      id: generateId('enc'),
      name,
      description,
      region,
      walletAddress,
      status: 'pending',
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
    const { id, name, description, region, walletAddress, githubConnection } = body;

    if (!id || !walletAddress) {
      return NextResponse.json({ error: 'ID and wallet address required' }, { status: 400 });
    }

    // Build update expression and attribute values
    let updateExpression = 'SET #name = :name, #description = :description, #region = :region, updatedAt = :updatedAt';
    const expressionAttributeValues: any = {
      ':name': name,
      ':description': description,
      ':region': region,
      ':updatedAt': getCurrentTimestamp(),
      ':walletAddress': walletAddress
    };
    const expressionAttributeNames: any = {
      '#name': 'name',
      '#description': 'description',
      '#region': 'region'
    };

    if (githubConnection) {
      updateExpression += ', githubConnection = :githubConnection';
      expressionAttributeValues[':githubConnection'] = githubConnection;
    } else {
      updateExpression += ' REMOVE githubConnection';
    }

    const result = await updateItem(
      TABLES.ENCLAVES,
      { id },
      updateExpression,
      expressionAttributeValues,
      'walletAddress = :walletAddress',
      expressionAttributeNames
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