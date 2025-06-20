# Treza App Platform

A secure platform for managing AI agents, enclaves, and tasks with blockchain wallet integration.

## Features

- **Wallet Connection**: Connect Solana or Ethereum wallets
- **Secure Enclaves**: Create and manage isolated execution environments
- **Task Management**: Schedule and monitor AI agent tasks
- **API Key Management**: Generate and manage SDK access keys

## Getting Started

1. Navigate to `/platform` in your browser
2. Connect your Solana or Ethereum wallet
3. Create secure enclaves for your AI agents
4. Deploy tasks to run in your enclaves
5. Generate API keys for SDK access

## API Endpoints

### Enclaves

- `GET /api/enclaves?wallet={address}` - List user's enclaves
- `POST /api/enclaves` - Create new enclave
- `PUT /api/enclaves` - Update enclave
- `DELETE /api/enclaves?id={id}&wallet={address}` - Delete enclave

### Tasks

- `GET /api/tasks?wallet={address}` - List user's tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks` - Update task
- `DELETE /api/tasks?id={id}&wallet={address}` - Delete task

### API Keys

- `GET /api/api-keys?wallet={address}` - List user's API keys
- `POST /api/api-keys` - Create new API key
- `PUT /api/api-keys` - Update API key
- `DELETE /api/api-keys?id={id}&wallet={address}` - Delete API key

## Database Schema

### Enclaves Table (DynamoDB)
```
{
  id: string (primary key)
  name: string
  description: string
  status: 'active' | 'inactive' | 'pending'
  region: string
  walletAddress: string (GSI)
  createdAt: string
  updatedAt: string
}
```

### Tasks Table (DynamoDB)
```
{
  id: string (primary key)
  name: string
  description: string
  enclaveId: string
  status: 'running' | 'stopped' | 'failed' | 'pending'
  schedule: string (cron format)
  walletAddress: string (GSI)
  createdAt: string
  updatedAt: string
  lastRun?: string
}
```

### API Keys Table (DynamoDB)
```
{
  id: string (primary key)
  name: string
  key: string
  permissions: string[]
  status: 'active' | 'inactive'
  walletAddress: string (GSI)
  createdAt: string
  updatedAt: string
  lastUsed?: string
}
```

## Environment Setup

To use AWS DynamoDB in production, add these environment variables:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
DYNAMODB_TABLE_PREFIX=treza-
```

## Wallet Integration

The platform supports:
- **Solana**: Phantom, Solflare, and other Solana wallets
- **Ethereum**: MetaMask and WalletConnect compatible wallets

## Security Features

- Wallet-based authentication
- Scoped API permissions
- Secure enclave isolation
- Encrypted task storage

## Next Steps

1. Replace mock data with actual DynamoDB integration
2. Add real wallet connection libraries
3. Implement enclave provisioning
4. Add task execution engine
5. Set up monitoring and logging

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Routes    │    │   DynamoDB      │
│   (React/Next)  │◄──►│   (Next.js)     │◄──►│   (AWS)         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Wallet        │    │   Business      │    │   Task Engine   │
│   Integration   │    │   Logic         │    │   (Future)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Contributing

1. Follow the established component patterns
2. Use the existing design system
3. Add proper TypeScript types
4. Include error handling
5. Write tests for new features 