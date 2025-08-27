import { NextRequest, NextResponse } from 'next/server';
import { CloudWatchLogsClient, GetLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';

export async function GET() {
  try {
    const region = 'us-west-2';
    const logsClient = new CloudWatchLogsClient({ region });
    
    console.log('Testing CloudWatch logs access...');
    
    const logGroupName = '/aws/nitro-enclave/enc_1755986905612_ouocac870/application';
    const logStreamName = 'i-0f23ec8c9c6d3bf59-application';
    
    const getLogEvents = new GetLogEventsCommand({
      logGroupName,
      logStreamName,
      startTime: Date.now() - (30 * 60 * 1000), // Last 30 minutes
      limit: 100
    });
    
    const response = await logsClient.send(getLogEvents);
    const events = response.events || [];
    
    console.log(`Found ${events.length} total log events`);
    
    // Look for PCR-related log entries
    const pcrEvents = events.filter(event => 
      event.message?.includes('[PCR]') || 
      event.message?.includes('nitro-cli') ||
      event.message?.includes('aws-nitro-enclaves-cli')
    );
    
    console.log(`Found ${pcrEvents.length} PCR-related log entries`);
    
    if (pcrEvents.length > 0) {
      const pcrData = {
        source: 'cloudwatch_logs',
        timestamp: new Date().toISOString(),
        logEntries: pcrEvents.map(event => ({
          timestamp: event.timestamp,
          message: event.message
        }))
      };
      
      return NextResponse.json({
        success: true,
        pcrData,
        totalEvents: events.length,
        pcrEvents: pcrEvents.length
      });
    }
    
    return NextResponse.json({
      success: false,
      message: 'No PCR data found',
      totalEvents: events.length,
      pcrEvents: 0
    });
    
  } catch (error) {
    console.error('Error testing CloudWatch logs:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}




