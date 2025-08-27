import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { 
  TABLES, 
  generateId, 
  getCurrentTimestamp,
  putItem,
  queryItems,
  updateItem,
  deleteItem
} from '@/lib/dynamodb';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  keyHash: string;
  permissions: string[];
  status: 'active' | 'inactive';
  walletAddress: string;
  createdAt: string;
  updatedAt: string;
  lastUsed?: string;
}

function generateApiKey(): string {
  const prefix = 'treza_live_';
  const randomString = randomBytes(16).toString('hex');
  return prefix + randomString;
}

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    const result = await queryItems(
      TABLES.API_KEYS,
      'WalletIndex',
      'walletAddress = :walletAddress',
      {
        ':walletAddress': walletAddress
      }
    );
    
    return NextResponse.json({ apiKeys: result.Items || [] });
  } catch (error: any) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, permissions, walletAddress } = body;

    if (!name || !permissions || !Array.isArray(permissions) || !walletAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const validPermissions = [
      'enclaves:read', 'enclaves:write', 
      'tasks:read', 'tasks:write', 
      'logs:read'
    ];

    const invalidPermissions = permissions.filter((p: string) => !validPermissions.includes(p));
    if (invalidPermissions.length > 0) {
      return NextResponse.json({ 
        error: `Invalid permissions: ${invalidPermissions.join(', ')}` 
      }, { status: 400 });
    }

    const apiKey = generateApiKey();
    const newApiKey: ApiKey = {
      id: generateId('key'),
      name,
      key: apiKey,
      keyHash: hashApiKey(apiKey),
      permissions,
      walletAddress,
      status: 'active',
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };

    await putItem(TABLES.API_KEYS, newApiKey);

    return NextResponse.json({ apiKey: newApiKey }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, permissions, status, walletAddress } = body;

    if (!id || !walletAddress) {
      return NextResponse.json({ error: 'ID and wallet address required' }, { status: 400 });
    }

    if (permissions) {
      const validPermissions = [
        'enclaves:read', 'enclaves:write', 
        'tasks:read', 'tasks:write', 
        'logs:read'
      ];

      const invalidPermissions = permissions.filter((p: string) => !validPermissions.includes(p));
      if (invalidPermissions.length > 0) {
        return NextResponse.json({ 
          error: `Invalid permissions: ${invalidPermissions.join(', ')}` 
        }, { status: 400 });
      }
    }

    const updateExpressionParts = [];
    const expressionAttributeValues: any = {
      ':updatedAt': getCurrentTimestamp(),
      ':walletAddress': walletAddress
    };

    if (name !== undefined) {
      updateExpressionParts.push('#name = :name');
      expressionAttributeValues[':name'] = name;
    }
    if (permissions !== undefined) {
      updateExpressionParts.push('permissions = :permissions');
      expressionAttributeValues[':permissions'] = permissions;
    }
    if (status !== undefined) {
      updateExpressionParts.push('#status = :status');
      expressionAttributeValues[':status'] = status;
    }

    const updateExpression = `SET ${updateExpressionParts.join(', ')}, updatedAt = :updatedAt`;

    const result = await updateItem(
      TABLES.API_KEYS,
      { id },
      updateExpression,
      expressionAttributeValues,
      'walletAddress = :walletAddress',
      {
        '#name': 'name',
        '#status': 'status'
      }
    );

    if (!result.Attributes) {
      return NextResponse.json({ error: 'API key not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ apiKey: result.Attributes });
  } catch (error: any) {
    console.error('Error updating API key:', error);
    if (error.name === 'ConditionalCheckFailedException') {
      return NextResponse.json({ error: 'API key not found or access denied' }, { status: 404 });
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
      TABLES.API_KEYS,
      { id },
      'walletAddress = :walletAddress',
      {
        ':walletAddress': walletAddress
      }
    );

    return NextResponse.json({ message: 'API key deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting API key:', error);
    if (error.name === 'ConditionalCheckFailedException') {
      return NextResponse.json({ error: 'API key not found or access denied' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 