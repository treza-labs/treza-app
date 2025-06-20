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

interface Task {
  id: string;
  name: string;
  description: string;
  enclaveId: string;
  status: 'running' | 'stopped' | 'failed' | 'pending';
  schedule: string;
  walletAddress: string;
  createdAt: string;
  updatedAt: string;
  lastRun?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    const enclaveId = searchParams.get('enclave');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    if (enclaveId) {
      // Query by enclave if specified
      const result = await queryItems(
        TABLES.TASKS,
        'EnclaveIndex',
        'enclaveId = :enclaveId',
        {
          ':enclaveId': enclaveId
        }
      );
      
      // Filter by wallet address for security
      const userTasks = (result.Items || []).filter(task => task.walletAddress === walletAddress);
      return NextResponse.json({ tasks: userTasks });
    } else {
      // Query by wallet address
      const result = await queryItems(
        TABLES.TASKS,
        'WalletIndex',
        'walletAddress = :walletAddress',
        {
          ':walletAddress': walletAddress
        }
      );
      
      return NextResponse.json({ tasks: result.Items || [] });
    }
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, enclaveId, schedule, walletAddress } = body;

    if (!name || !description || !enclaveId || !schedule || !walletAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newTask: Task = {
      id: generateId('task'),
      name,
      description,
      enclaveId,
      schedule,
      walletAddress,
      status: 'pending',
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };

    await putItem(TABLES.TASKS, newTask);

    return NextResponse.json({ task: newTask }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, schedule, status, walletAddress } = body;

    if (!id || !walletAddress) {
      return NextResponse.json({ error: 'ID and wallet address required' }, { status: 400 });
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
    if (description !== undefined) {
      updateExpressionParts.push('description = :description');
      expressionAttributeValues[':description'] = description;
    }
    if (schedule !== undefined) {
      updateExpressionParts.push('schedule = :schedule');
      expressionAttributeValues[':schedule'] = schedule;
    }
    if (status !== undefined) {
      updateExpressionParts.push('#status = :status');
      expressionAttributeValues[':status'] = status;
      
      if (status === 'running') {
        updateExpressionParts.push('lastRun = :lastRun');
        expressionAttributeValues[':lastRun'] = getCurrentTimestamp();
      }
    }

    const updateExpression = `SET ${updateExpressionParts.join(', ')}, updatedAt = :updatedAt`;

    const result = await updateItem(
      TABLES.TASKS,
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
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ task: result.Attributes });
  } catch (error: any) {
    console.error('Error updating task:', error);
    if (error.name === 'ConditionalCheckFailedException') {
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 });
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
      TABLES.TASKS,
      { id },
      'walletAddress = :walletAddress',
      {
        ':walletAddress': walletAddress
      }
    );

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    if (error.name === 'ConditionalCheckFailedException') {
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 