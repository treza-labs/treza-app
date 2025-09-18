import { NextRequest, NextResponse } from 'next/server';
import { CloudWatchLogsClient, GetLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';

// Initialize CloudWatch Logs client
const cloudWatchLogs = new CloudWatchLogsClient({
  region: process.env.AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
});

interface PCRValues {
  pcr0?: string;  // Enclave Image
  pcr1?: string;  // Linux Kernel  
  pcr2?: string;  // Application
  pcr8?: string;  // Signing certificate hash
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get logs from CloudWatch
    const logGroupName = `/aws/ec2/enclave/${id}`;
    
    try {
      // Get log streams for this enclave
      const { DescribeLogStreamsCommand } = await import('@aws-sdk/client-cloudwatch-logs');
      const describeStreamsCommand = new DescribeLogStreamsCommand({
        logGroupName,
        orderBy: 'LastEventTime',
        descending: true,
        limit: 10
      });
      
      const streamsResponse = await cloudWatchLogs.send(describeStreamsCommand);
      
      if (!streamsResponse.logStreams || streamsResponse.logStreams.length === 0) {
        return NextResponse.json({
          pcrs: {},
          message: 'No log streams found for this enclave'
        });
      }

      const pcrs: PCRValues = {};
      
      // Search through recent log streams for PCR values
      for (const stream of streamsResponse.logStreams.slice(0, 3)) {
        if (!stream.logStreamName) continue;
        
        const getLogsCommand = new GetLogEventsCommand({
          logGroupName,
          logStreamName: stream.logStreamName,
          limit: 1000,
          startFromHead: false
        });
        
        const logsResponse = await cloudWatchLogs.send(getLogsCommand);
        
        if (logsResponse.events) {
          for (const event of logsResponse.events) {
            if (!event.message) continue;
            
            const message = event.message;
            
            // Look for PCR values in the logs
            // Format: [PCR] PCR0: abc123...
            const pcrMatch = message.match(/\[PCR\]\s+PCR(\d+):\s+([a-fA-F0-9]+)/);
            if (pcrMatch) {
              const pcrNumber = pcrMatch[1];
              const pcrValue = pcrMatch[2];
              
              switch (pcrNumber) {
                case '0':
                  pcrs.pcr0 = pcrValue;
                  break;
                case '1':
                  pcrs.pcr1 = pcrValue;
                  break;
                case '2':
                  pcrs.pcr2 = pcrValue;
                  break;
                case '8':
                  pcrs.pcr8 = pcrValue;
                  break;
              }
            }
          }
        }
        
        // If we found all PCRs, no need to check more streams
        if (pcrs.pcr0 && pcrs.pcr1 && pcrs.pcr2 && pcrs.pcr8) {
          break;
        }
      }
      
      return NextResponse.json({
        pcrs,
        message: Object.keys(pcrs).length > 0 ? 'PCR values found' : 'No PCR values found in logs'
      });
      
    } catch (logError: any) {
      console.error('Error fetching logs:', logError);
      
      // If log group doesn't exist, return empty PCRs
      if (logError.name === 'ResourceNotFoundException') {
        return NextResponse.json({
          pcrs: {},
          message: 'Enclave logs not found - deployment may still be in progress'
        });
      }
      
      throw logError;
    }
    
  } catch (error) {
    console.error('Error fetching PCR values:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch PCR values',
      pcrs: {}
    }, { status: 500 });
  }
}
