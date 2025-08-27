import { NextRequest, NextResponse } from 'next/server';
import { 
  TABLES, 
  getItem,
  updateItem,
  deleteItem
} from '@/lib/dynamodb';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';

// Initialize Step Functions client
const stepFunctions = new SFNClient({
  region: process.env.AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await getItem(TABLES.ENCLAVES, { id });
    
    if (!result.Item) {
      return NextResponse.json({ error: 'Enclave not found' }, { status: 404 });
    }

    return NextResponse.json({ enclave: result.Item });
  } catch (error) {
    console.error('Error fetching enclave:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, walletAddress } = body;

    if (!action || !walletAddress) {
      return NextResponse.json({ error: 'Missing required fields: action, walletAddress' }, { status: 400 });
    }

    // Get current enclave
    const enclaveResult = await getItem(TABLES.ENCLAVES, { id });
    if (!enclaveResult.Item) {
      return NextResponse.json({ error: 'Enclave not found' }, { status: 404 });
    }

    const enclave = enclaveResult.Item;

    // Verify ownership
    if (enclave.walletAddress !== walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    let newStatus: string;

    // Determine the action to take and set appropriate status
    switch (action) {
      case 'pause':
        if (enclave.status !== 'DEPLOYED') {
          return NextResponse.json({ 
            error: 'Can only pause deployed enclaves' 
          }, { status: 400 });
        }
        newStatus = 'PAUSING';
        break;

      case 'resume':
        if (enclave.status !== 'PAUSED') {
          return NextResponse.json({ 
            error: 'Can only resume paused enclaves' 
          }, { status: 400 });
        }
        newStatus = 'RESUMING';
        break;

      case 'terminate':
        if (!['DEPLOYED', 'PAUSED', 'FAILED'].includes(enclave.status)) {
          return NextResponse.json({ 
            error: 'Can only terminate deployed, paused, or failed enclaves' 
          }, { status: 400 });
        }
        newStatus = 'PENDING_DESTROY';
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update enclave status in DynamoDB
    const updateResult = await updateItem(
      TABLES.ENCLAVES,
      { id },
      'SET #status = :status, #updated_at = :timestamp',
      {
        ':status': newStatus,
        ':timestamp': new Date().toISOString()
      },
      undefined,
      {
        '#status': 'status',
        '#updated_at': 'updatedAt'
      }
    );

    // If terminating, trigger the cleanup Step Functions workflow
    if (action === 'terminate') {
      try {
        const cleanupStateMachineArn = `arn:aws:states:${process.env.AWS_REGION || 'us-west-2'}:${process.env.AWS_ACCOUNT_ID}:stateMachine:treza-dev-cleanup`;
        
        const executionInput = {
          enclave_id: id,
          action: 'destroy',
          configuration: '{}',
          terraform_config: 'main.tf',
          wallet_address: enclave.walletAddress || 'unknown'
        };

        const startExecutionCommand = new StartExecutionCommand({
          stateMachineArn: cleanupStateMachineArn,
          name: `cleanup-${id}-${Date.now()}`,
          input: JSON.stringify(executionInput)
        });

        await stepFunctions.send(startExecutionCommand);
        console.log(`Started cleanup workflow for enclave ${id}`);
      } catch (stepFunctionError) {
        console.error('Error starting cleanup workflow:', stepFunctionError);
        // Don't fail the API call if Step Functions fails - the status is already updated
      }
    }

    return NextResponse.json({ 
      enclave: updateResult.Attributes,
      message: `Enclave ${action} initiated successfully`
    });

  } catch (error) {
    console.error('Error updating enclave:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    // Get current enclave to verify ownership
    const enclaveResult = await getItem(TABLES.ENCLAVES, { id });
    if (!enclaveResult.Item) {
      return NextResponse.json({ error: 'Enclave not found' }, { status: 404 });
    }

    const enclave = enclaveResult.Item;

    // Verify ownership
    if (enclave.walletAddress !== walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Only allow deletion if enclave is in a terminal state
    if (!['DESTROYED', 'FAILED'].includes(enclave.status)) {
      return NextResponse.json({ 
        error: 'Can only delete destroyed or failed enclaves. Use terminate action first.' 
      }, { status: 400 });
    }

    await deleteItem(TABLES.ENCLAVES, { id });

    return NextResponse.json({ message: 'Enclave deleted successfully' });

  } catch (error) {
    console.error('Error deleting enclave:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
