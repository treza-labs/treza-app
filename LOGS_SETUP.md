# 🔍 Enclave Logging Setup Guide

## Environment Variables

To enable the comprehensive logging functionality, add these environment variables to your `.env.local`:

```env
# AWS Configuration for Logs API
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_ACCOUNT_ID=your_account_id_here

# DynamoDB Configuration  
DYNAMODB_ENCLAVES_TABLE=treza-enclaves-dev
```

## Features Implemented

### 📄 **Detailed Enclave Page**
- Navigate: `/platform/enclaves/[id]`
- **Overview Tab**: Complete enclave metadata, infrastructure config
- **Logs Tab**: Real-time infrastructure logs with filtering
- **Configuration Tab**: Raw JSON configuration
- **Lifecycle Controls**: Pause, Resume, Terminate

### 🔧 **Infrastructure Logs**
- **ECS Logs**: Terraform deployment/destroy execution logs
- **Step Functions**: Workflow state transitions and errors
- **Lambda Functions**: Validation, triggers, error handling
- **Real-time Updates**: Auto-refresh during deployments

### 🎯 **Log Types Available**
1. **All Logs** - Combined view of all infrastructure logs
2. **Infrastructure (ECS)** - Terraform execution logs
3. **Workflows** - Step Functions execution history
4. **Functions** - Lambda function logs

### 🚀 **Usage**
1. **From Main List**: Click "View Details" on any enclave
2. **Logs Tab**: Select log type filter and click "Refresh"
3. **Real-time**: Logs auto-refresh during DEPLOYING/DESTROYING states
4. **Lifecycle**: Manage enclave directly from detail page

## API Endpoints

### `GET /api/enclaves/[id]/logs`
**Query Parameters:**
- `type`: `all` | `ecs` | `stepfunctions` | `lambda` (default: `all`)
- `limit`: Number of log entries to return (default: `100`)

**Response:**
```json
{
  "enclave_id": "enc_123456789",
  "enclave_name": "my-enclave",
  "enclave_status": "DEPLOYED", 
  "logs": {
    "ecs": [
      {
        "timestamp": 1642234567890,
        "message": "=== Running Terraform Deploy ===",
        "stream": "ecs/terraform-runner/abc123",
        "source": "ecs"
      }
    ],
    "stepfunctions": [
      {
        "timestamp": 1642234567890,
        "message": "Started task: UpdateStatusToInProgress",
        "source": "stepfunctions",
        "type": "TaskStateEntered",
        "execution": "enc_123456789-deploy-1642234567",
        "stateMachine": "deployment"
      }
    ],
    "lambda": [
      {
        "timestamp": 1642234567890,
        "message": "Processing enclave enc_123456789 with status PENDING_DEPLOY",
        "source": "lambda",
        "function": "enclave-trigger"
      }
    ]
  }
}
```

## Next Steps

### Phase 2: Application Logs
- **Container Logs**: Logs from inside Nitro Enclaves
- **Application Output**: stdout/stderr from user applications
- **Custom Logs**: Application-specific logging

### Phase 3: Real-time Streaming
- **WebSocket Connection**: Live log streaming
- **Log Tailing**: Follow logs in real-time
- **Performance Monitoring**: Resource usage metrics

This provides complete infrastructure visibility. Users can now debug deployments, monitor progress, and manage enclaves with full transparency! 🎉
