import { NextRequest, NextResponse } from 'next/server';
import { CloudWatchLogsClient, DescribeLogStreamsCommand, GetLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { SFNClient, GetExecutionHistoryCommand, ListExecutionsCommand } from '@aws-sdk/client-sfn';
import { getItem } from '@/lib/dynamodb';
import { TABLES } from '@/lib/dynamodb';

const cloudWatchLogs = new CloudWatchLogsClient({
  region: process.env.AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const stepFunctions = new SFNClient({
  region: process.env.AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const logType = searchParams.get('type') || 'all'; // 'ecs', 'stepfunctions', 'lambda', 'all'
    const limit = parseInt(searchParams.get('limit') || '100');

    // Get enclave details first
    const enclaveResult = await getItem(TABLES.ENCLAVES, { id });
    if (!enclaveResult.Item) {
      return NextResponse.json({ error: 'Enclave not found' }, { status: 404 });
    }

    const enclave = enclaveResult.Item;
    const logs: any = {
      enclave_id: id,
      enclave_name: enclave.name,
      enclave_status: enclave.status,
      logs: {}
    };

    // Fetch different types of logs based on request
    if (logType === 'all' || logType === 'ecs') {
      logs.logs.ecs = await getECSLogs(id, limit);
    }

    if (logType === 'all' || logType === 'stepfunctions') {
      logs.logs.stepfunctions = await getStepFunctionsLogs(id, limit);
    }

    if (logType === 'all' || logType === 'lambda') {
      logs.logs.lambda = await getLambdaLogs(id, limit);
    }

    return NextResponse.json(logs);

  } catch (error: any) {
    console.error('Error fetching enclave logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getECSLogs(enclaveId: string, limit: number) {
  try {
    const logGroupName = '/ecs/treza-dev-terraform-runner';
    
    // First, get log streams for this enclave
    const describeStreamsCommand = new DescribeLogStreamsCommand({
      logGroupName,
      orderBy: 'LastEventTime',
      descending: true,
      limit: 10 // Get recent streams
    });

    const streamsResponse = await cloudWatchLogs.send(describeStreamsCommand);
    const logs = [];

    // Get logs from each stream (most recent first)
    for (const stream of streamsResponse.logStreams || []) {
      if (stream.logStreamName) {
        try {
          const getLogsCommand = new GetLogEventsCommand({
            logGroupName,
            logStreamName: stream.logStreamName,
            limit: Math.min(limit, 50), // Limit per stream
            startFromHead: false // Get most recent first
          });

          const logsResponse = await cloudWatchLogs.send(getLogsCommand);
          
          for (const event of logsResponse.events || []) {
            // Filter logs that contain our enclave ID or are deployment-related
            if (event.message && 
                (event.message.includes(enclaveId) || 
                 event.message.includes('ENCLAVE_ID') ||
                 event.message.includes('Terraform') ||
                 event.message.includes('==='))) {
              logs.push({
                timestamp: event.timestamp,
                message: event.message,
                stream: stream.logStreamName,
                source: 'ecs'
              });
            }
          }
        } catch (streamError) {
          console.warn(`Error fetching logs from stream ${stream.logStreamName}:`, streamError);
        }
      }
    }

    // Sort by timestamp, most recent first
    return logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, limit);

  } catch (error) {
    console.error('Error fetching ECS logs:', error);
    return [];
  }
}

async function getStepFunctionsLogs(enclaveId: string, limit: number) {
  try {
    const stateMachineArns = [
      `arn:aws:states:${process.env.AWS_REGION || 'us-west-2'}:${process.env.AWS_ACCOUNT_ID}:stateMachine:treza-dev-deployment`,
      `arn:aws:states:${process.env.AWS_REGION || 'us-west-2'}:${process.env.AWS_ACCOUNT_ID}:stateMachine:treza-dev-cleanup`
    ];

    const logs = [];

    for (const stateMachineArn of stateMachineArns) {
      try {
        // List executions for this enclave
        const listExecutionsCommand = new ListExecutionsCommand({
          stateMachineArn,
          maxResults: 10
        });

        const executionsResponse = await stepFunctions.send(listExecutionsCommand);

        // Filter executions by enclave ID
        const relevantExecutions = executionsResponse.executions?.filter(
          execution => execution.name?.includes(enclaveId)
        ) || [];

        // Get execution history for each relevant execution
        for (const execution of relevantExecutions.slice(0, 3)) { // Limit to 3 most recent
          if (execution.executionArn) {
            try {
              const getHistoryCommand = new GetExecutionHistoryCommand({
                executionArn: execution.executionArn,
                maxResults: 20,
                reverseOrder: true // Most recent first
              });

              const historyResponse = await stepFunctions.send(getHistoryCommand);

              for (const event of historyResponse.events || []) {
                logs.push({
                  timestamp: event.timestamp?.getTime() || Date.now(),
                  message: formatStepFunctionEvent(event),
                  source: 'stepfunctions',
                  type: event.type,
                  execution: execution.name,
                  stateMachine: stateMachineArn.includes('cleanup') ? 'cleanup' : 'deployment'
                });
              }
            } catch (historyError) {
              console.warn(`Error fetching execution history for ${execution.executionArn}:`, historyError);
            }
          }
        }
      } catch (stateMachineError) {
        console.warn(`Error fetching executions for ${stateMachineArn}:`, stateMachineError);
      }
    }

    // Sort by timestamp, most recent first
    return logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, limit);

  } catch (error) {
    console.error('Error fetching Step Functions logs:', error);
    return [];
  }
}

function formatStepFunctionEvent(event: any): string {
  const type = event.type;
  
  switch (type) {
    case 'ExecutionStarted':
      return `Execution started: ${event.executionStartedEventDetails?.input || ''}`;
    case 'ExecutionSucceeded':
      return `Execution completed successfully`;
    case 'ExecutionFailed':
      return `Execution failed: ${event.executionFailedEventDetails?.error || 'Unknown error'}`;
    case 'TaskStateEntered':
      return `Started task: ${event.stateEnteredEventDetails?.name || 'Unknown'}`;
    case 'TaskStateExited':
      return `Completed task: ${event.stateExitedEventDetails?.name || 'Unknown'}`;
    case 'TaskSucceeded':
      return `Task succeeded: ${event.taskSucceededEventDetails?.resourceType || 'Unknown'}`;
    case 'TaskFailed':
      return `Task failed: ${event.taskFailedEventDetails?.error || 'Unknown error'}`;
    case 'ChoiceStateEntered':
      return `Evaluating condition: ${event.stateEnteredEventDetails?.name || 'Unknown'}`;
    case 'TaskScheduled':
      return `Scheduled task: ${event.taskScheduledEventDetails?.resourceType || 'Unknown'}`;
    default:
      return `${type}: ${JSON.stringify(event).substring(0, 100)}...`;
  }
}

async function getLambdaLogs(enclaveId: string, limit: number) {
  try {
    const logSources = [
      '/aws/lambda/treza-dev-validation',
      '/aws/lambda/treza-dev-enclave-trigger',
      '/aws/lambda/treza-dev-error-handler',
      '/aws/lambda/treza-dev-status-monitor'
    ];

    const logs = [];

    for (const logGroupName of logSources) {
      try {
        // Get recent log streams
        const describeStreamsCommand = new DescribeLogStreamsCommand({
          logGroupName,
          orderBy: 'LastEventTime',
          descending: true,
          limit: 3 // Recent streams only
        });

        const streamsResponse = await cloudWatchLogs.send(describeStreamsCommand);

        // Get logs from each stream
        for (const stream of streamsResponse.logStreams || []) {
          if (stream.logStreamName) {
            try {
              // Get logs from the last 2 hours to catch recent activity
              const endTime = Date.now();
              const startTime = endTime - (2 * 60 * 60 * 1000); // 2 hours ago
              
              const getLogsCommand = new GetLogEventsCommand({
                logGroupName,
                logStreamName: stream.logStreamName,
                startTime,
                endTime,
                limit: 20,
                startFromHead: false
              });

              const logsResponse = await cloudWatchLogs.send(getLogsCommand);
              
              for (const event of logsResponse.events || []) {
                // Filter logs related to our enclave or status monitoring activities
                const isRelevant = event.message && (
                  event.message.includes(enclaveId) ||
                  // Include status monitor general logs that might be relevant
                  (logGroupName.includes('status-monitor') && (
                    event.message.includes('Starting enclave status monitoring') ||
                    event.message.includes('Successfully monitored enclave statuses') ||
                    event.message.includes('Error monitoring statuses') ||
                    event.message.includes('Checking enclave') ||
                    event.message.includes('Instance') ||
                    event.message.includes('Updating enclave') ||
                    event.message.includes('Successfully updated enclave')
                  ))
                );
                
                if (isRelevant) {
                  logs.push({
                    timestamp: event.timestamp,
                    message: event.message,
                    stream: stream.logStreamName,
                    source: 'lambda',
                    function: logGroupName.split('/').pop()
                  });
                }
              }
            } catch (streamError) {
              console.warn(`Error fetching logs from stream ${stream.logStreamName}:`, streamError);
            }
          }
        }
      } catch (groupError) {
        console.warn(`Error fetching logs from group ${logGroupName}:`, groupError);
      }
    }

    // Sort by timestamp, most recent first
    return logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, limit);

  } catch (error) {
    console.error('Error fetching Lambda logs:', error);
    return [];
  }
}
