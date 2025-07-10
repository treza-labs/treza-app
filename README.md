# Treza App

**Secure Enclave and Task Management Platform** - Create and manage isolated execution environments with automated task scheduling. Built for secure, scalable workload management with blockchain wallet integration and **extensible provider system**.

## Overview

Treza App is a secure platform for managing enclaves and automated tasks with blockchain wallet integration. The platform provides a comprehensive dashboard for creating isolated execution environments, scheduling tasks, and managing API access with enterprise-grade security. **Now featuring an extensible provider system that supports multiple enclave technologies including AWS Nitro Enclaves.**

## Key Features

### 🔐 **Secure Authentication**
- Email-based authentication powered by Privy
- Wallet integration (Solana and Ethereum support)
- Secure user session management

### 🏰 **Multi-Provider Enclave Management**
- **Extensible provider system** supporting multiple enclave technologies
- **AWS Nitro Enclaves** with full configuration support (Docker images, CPU allocation, memory settings)
- Plugin-like architecture for easy addition of new providers
- Provider-specific configuration validation and UI
- Multi-region deployment support per provider
- Real-time status monitoring (Active, Inactive, Pending)
- Secure workload isolation and resource allocation
- Full CRUD operations with persistent storage

### 📋 **Task Automation**
- Schedule automated tasks with flexible cron-based scheduling
- Task assignment and deployment to specific enclaves
- Comprehensive status tracking (Running, Stopped, Failed, Pending)
- Execution history and performance monitoring
- Task dependencies and workflow management

### 🔑 **API Key Management**
- Generate and manage SDK access keys
- Scoped permissions system
- Usage tracking and last-used timestamps
- Secure key rotation capabilities

### 📊 **Dashboard Interface**
- Intuitive tabbed interface for enclave and task management
- **Dynamic provider selection and configuration**
- Real-time data updates and monitoring
- Responsive design for desktop and mobile
- Dark theme with modern UI components
- Comprehensive resource utilization views

## Provider System

### Supported Providers

#### AWS Nitro Enclaves
- **Docker Image Configuration**: Support for custom container images
- **Resource Allocation**: Configurable CPU count (2-16 vCPUs) and memory (1-16 GB)
- **Instance Types**: Multiple EC2 instance type options
- **Debug Mode**: Optional debug console access
- **Environment Variables**: JSON-based environment configuration
- **Regional Support**: 6 AWS regions with proper region naming

### Adding New Providers

The provider system is designed to be extensible. To add a new provider:

1. **Create Provider Configuration**:
```typescript
// lib/providers/my-provider.ts
export const myProvider: Provider = {
  id: 'my-provider',
  name: 'My Custom Provider',
  description: 'Description of my provider',
  regions: ['region1', 'region2'],
  configSchema: {
    // Define configuration fields
  },
  validateConfig: (config) => {
    // Validation logic
  },
  getDisplayName: (region) => {
    // Region display names
  }
};
```

2. **Register the Provider**:
```typescript
// lib/providers/registry.ts
import { myProvider } from './my-provider';
providerRegistry.register(myProvider);
```

3. **Add Provider Icon** (optional):
```
public/images/providers/my-provider.svg
```

The UI will automatically:
- Show the provider in the selection dropdown
- Render appropriate configuration fields
- Validate configurations
- Display provider-specific regions

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4.0
- **Authentication**: Privy (Email + Wallet)
- **Database**: AWS DynamoDB with provider support
- **Provider System**: Extensible plugin architecture
- **Deployment**: Vercel-ready configuration
- **UI Components**: Headless UI, Lucide React icons

## Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- AWS account with DynamoDB access
- Environment variables configured

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd treza-app
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   # Create .env.local file with:
   AWS_REGION=us-west-2
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
   PRIVY_APP_SECRET=your-privy-secret
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   GITHUB_REDIRECT_URI=your-github-redirect-uri
   ```

3. **Run the development server:**
   ```bash
   pnpm dev
   ```

4. **Access the platform:**
   Open [http://localhost:3000](http://localhost:3000) in your browser

## Platform Usage

### Getting Started
1. **Sign In**: Use your email address to authenticate
2. **Create Enclaves**: Select a provider and configure your isolated execution environment
3. **Deploy Tasks**: Schedule automated tasks to run in your enclaves
4. **Monitor Execution**: Track task performance and enclave status
5. **Generate API Keys**: Create SDK access keys for external integrations

### Creating Enclaves with Providers

1. **Choose Provider**: Select from available providers (currently AWS Nitro)
2. **Configure Resources**: Set CPU count, memory allocation, and instance type
3. **Specify Container**: Provide Docker image URI for your application
4. **Select Region**: Choose from provider-supported regions
5. **Optional GitHub Integration**: Connect repositories for CI/CD workflows

### API Endpoints

The platform provides RESTful APIs for all core functionality:

#### Providers
- `GET /api/providers` - List available providers
- `GET /api/providers?id={providerId}` - Get specific provider details

#### Enclaves
- `GET /api/enclaves?wallet={address}` - List user's enclaves
- `POST /api/enclaves` - Create new enclave with provider configuration
- `PUT /api/enclaves` - Update enclave and provider settings
- `DELETE /api/enclaves` - Delete enclave

#### Tasks
- `GET /api/tasks?wallet={address}` - List user's tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks` - Update task
- `DELETE /api/tasks` - Delete task

#### API Keys
- `GET /api/api-keys?wallet={address}` - List user's API keys
- `POST /api/api-keys` - Create new API key
- `PUT /api/api-keys` - Update API key
- `DELETE /api/api-keys` - Delete API key

## Development

### Project Structure
```
treza-app/
├── app/
│   ├── (auth)/          # Authentication pages
│   ├── (default)/       # Main application pages
│   │   └── platform/    # Platform dashboard and components
│   └── api/             # API routes
│       ├── enclaves/    # Enclave management APIs
│       ├── providers/   # Provider system APIs
│       ├── tasks/       # Task management APIs
│       └── api-keys/    # API key management
├── components/
│   └── ui/              # Reusable UI components
│       ├── provider-selector.tsx    # Provider selection component
│       └── provider-config.tsx      # Dynamic provider configuration
├── lib/
│   ├── providers/       # Provider system implementation
│   │   ├── types.ts     # Provider interfaces and types
│   │   ├── registry.ts  # Provider registry
│   │   ├── aws-nitro.ts # AWS Nitro provider implementation
│   │   └── index.ts     # Provider system exports
│   ├── dynamodb.ts      # Database utilities
│   └── privy-config.ts  # Authentication configuration
└── public/
    └── images/
        └── providers/   # Provider icons
```

### Key Components
- **PlatformDashboard**: Main dashboard with tabbed interface
- **EnclavesSection**: Enhanced enclave creation and management with provider support
- **ProviderSelector**: Reusable provider selection component
- **ProviderConfigComponent**: Dynamic configuration forms based on provider schemas
- **TasksSection**: Task scheduling, deployment, and monitoring
- **ApiKeysSection**: API key generation and management

### Available Scripts
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## Database Schema

The platform uses DynamoDB with the following tables:

### Enclaves Table (Enhanced with Provider Support)
```
{
  id: string (primary key)
  name: string
  description: string
  status: 'active' | 'inactive' | 'pending'
  region: string
  providerId: string              // NEW: Provider identifier
  providerConfig: object          // NEW: Provider-specific configuration
  walletAddress: string (GSI)
  createdAt: string
  updatedAt: string
  githubConnection?: object       // Optional GitHub integration
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

## Security Features

- **Wallet-based Authorization**: All operations scoped to authenticated user
- **Provider Validation**: Configuration validation per provider type
- **Encrypted Storage**: Sensitive data encrypted at rest
- **API Key Permissions**: Granular access control
- **Secure Enclaves**: Provider-specific isolation with strict boundaries
- **Task Isolation**: Each task runs in its designated enclave securely
- **Audit Logging**: Complete operation and execution history

## Deployment

### Vercel Deployment
The app is optimized for Vercel deployment:
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

## Provider Development

### Creating a New Provider

1. **Define Provider Interface**:
   - Implement the `Provider` interface from `lib/providers/types.ts`
   - Define configuration schema with validation rules
   - Specify supported regions

2. **Add Configuration Fields**:
   - Support various field types: `string`, `number`, `boolean`, `select`, `text`
   - Add validation rules and default values
   - Provide helpful descriptions

3. **Register Provider**:
   - Import your provider in `lib/providers/registry.ts`
   - Call `providerRegistry.register(yourProvider)`

4. **Test Integration**:
   - The UI will automatically detect and support your provider
   - Configuration forms are generated dynamically
   - Validation happens client and server-side

### Example Provider Implementation

See `lib/providers/azure-enclaves.ts` for a complete example of how to add Azure Confidential Computing support (commented out, ready for future activation).

## Future Roadmap

### Upcoming Provider Support
- **Azure Confidential Computing**: Ready for activation
- **Google Cloud Confidential Computing**: Planned
- **Intel SGX**: Under consideration
- **Custom On-Premise Solutions**: Enterprise feature

### Platform Enhancements
- Real-time enclave monitoring and metrics
- Advanced task orchestration and workflows
- Multi-cloud deployment strategies
- Enhanced security audit trails
- Provider-specific cost optimization

## Contributing

We welcome contributions to extend the provider system:

1. **Fork the repository**
2. **Create a feature branch** for your provider
3. **Implement the provider** following the existing patterns
4. **Add comprehensive tests**
5. **Submit a pull request** with provider documentation

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Routes    │    │   DynamoDB      │
│   (React/Next)  │◄──►│   (Next.js)     │◄──►│   (AWS)         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Provider      │    │   Business      │    │   Task Engine   │
│   System        │    │   Logic         │    │   (Future)      │
│   (Extensible)  │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│   AWS Nitro     │    ┌─────────────────┐    ┌─────────────────┐
│   Azure CC      │    │   Future        │    │   Custom        │
│   Google CC     │    │   Providers     │    │   Providers     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```
