# Treza App

**Secure Enclave and Task Management Platform** - Create and manage isolated execution environments with automated task scheduling. Built for secure, scalable workload management with blockchain wallet integration and **extensible provider system**. **Now featuring enhanced UI, instant application logs, and improved enclave lifecycle management.**

## Overview

Treza App is a secure platform for managing enclaves and automated tasks with blockchain wallet integration. The platform provides a comprehensive dashboard for creating isolated execution environments, scheduling tasks, and managing API access with enterprise-grade security. **Now featuring an extensible provider system that supports multiple enclave technologies including AWS Nitro Enclaves with full automation and real-time monitoring.**

## Key Features

### 🔐 **Secure Authentication**
- Email-based authentication powered by Privy
- Wallet integration (Solana and Ethereum support)
- Secure user session management

### 🏰 **Multi-Provider Enclave Management**
- **Extensible provider system** supporting multiple enclave technologies
- **🆕 AWS Nitro Enclaves** with full automation and instant application logs
- Plugin-like architecture for easy addition of new providers
- Provider-specific configuration validation and UI
- Multi-region deployment support per provider
- **🆕 Real-time status monitoring** (Deploying, Deployed, Destroying, Destroyed)
- Secure workload isolation and resource allocation
- Full CRUD operations with persistent storage
- **🆕 Automated VPC endpoint access** for immediate log visibility

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

### 📊 **Enhanced Dashboard Interface**
- **🆕 Professional Design**: Clean, consistent interface with indigo theme
- **🆕 Improved Layout**: Better spacing and component organization
- **Dynamic provider selection and configuration**
- **🆕 Real-time application logs** with professional empty states
- **🆕 Optimized enclave list** with essential information only
- Responsive design for desktop and mobile
- Dark theme with modern UI components
- Comprehensive resource utilization views

## Provider System

### Supported Providers

#### 🆕 Enhanced AWS Nitro Enclaves
- **🆕 Instant Application Logs**: Real-time log visibility through automated CloudWatch integration
- **🆕 Shared Security Groups**: Automated VPC endpoint access without manual configuration
- **Docker Image Configuration**: Support for custom container images including `hello-world:latest`
- **Resource Allocation**: Configurable CPU count (2-16 vCPUs) and memory (1-16 GB)
- **Instance Types**: Multiple EC2 instance type options (m6i.xlarge, m6i.2xlarge, etc.)
- **Debug Mode**: Optional debug console access
- **Environment Variables**: JSON-based environment configuration
- **Regional Support**: 6 AWS regions with proper region naming
- **🆕 Automated Lifecycle**: Complete deployment and termination automation

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
- **Styling**: Tailwind CSS 4.0 with indigo design system
- **Authentication**: Privy (Email + Wallet)
- **Database**: AWS DynamoDB with enhanced provider support
- **🆕 Real-time Logs**: AWS CloudWatch Logs integration
- **Provider System**: Extensible plugin architecture
- **Deployment**: Vercel-ready configuration
- **UI Components**: Headless UI, Lucide React icons

## Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- AWS account with DynamoDB access
- **🆕 Treza Terraform Infrastructure** deployed for full functionality
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
2. **🆕 Create Enclaves**: Select a provider and configure with instant application logs
3. **Deploy Tasks**: Schedule automated tasks to run in your enclaves
4. **🆕 Monitor in Real-Time**: Track task performance and view application logs immediately
5. **Generate API Keys**: Create SDK access keys for external integrations

### 🆕 Creating Enclaves with Enhanced Experience

1. **Choose Provider**: Select from available providers (currently AWS Nitro with full automation)
2. **Configure Resources**: Set CPU count, memory allocation, and instance type
3. **Specify Container**: Provide Docker image URI (e.g., `hello-world:latest` for testing)
4. **Select Region**: Choose from provider-supported regions
5. **🆕 Deploy and Monitor**: Watch real-time status and access application logs immediately
6. **🆕 Manage Lifecycle**: Use professional pause/terminate controls with proper status tracking

### 🆕 Enhanced Monitoring Features

- **Real-Time Status**: Live updates on enclave deployment and operation status
- **Application Logs**: Instant access to container logs through CloudWatch integration
- **Professional Interface**: Clean, consistent design with indigo theme
- **Responsive Layout**: Optimized for all devices with better component spacing
- **Error Handling**: Clear error messages and recovery guidance

### API Endpoints

The platform provides RESTful APIs for all core functionality:

#### Providers
- `GET /api/providers` - List available providers
- `GET /api/providers?id={providerId}` - Get specific provider details

#### 🆕 Enhanced Enclaves
- `GET /api/enclaves?wallet={address}` - List user's enclaves with real-time status
- `POST /api/enclaves` - Create new enclave with provider configuration
- `PATCH /api/enclaves/{id}` - **🆕 Update enclave lifecycle** (pause, resume, terminate)
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

### Documentation

- **[TypeScript Fixes](docs/TYPESCRIPT_FIXES.md)** - Solutions for third-party dependency TypeScript issues

### 🆕 Enhanced Project Structure
```
treza-app/
├── app/
│   ├── (auth)/          # Authentication pages
│   ├── (default)/       # Main application pages
│   │   └── platform/    # 🆕 Enhanced platform dashboard and components
│   │       ├── enclaves/
│   │       │   └── [id]/page.tsx    # 🆕 Enhanced detail page with real-time logs
│   │       └── components/
│   │           ├── enclaves-section.tsx     # 🆕 Streamlined interface
│   │           └── enhanced-monitoring.tsx  # 🆕 Real-time monitoring
│   └── api/             # API routes
│       ├── enclaves/    # 🆕 Enhanced enclave management APIs
│       │   └── [id]/route.ts  # 🆕 Lifecycle management (PATCH for terminate/pause)
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
│   │   ├── aws-nitro.ts # 🆕 Enhanced AWS Nitro provider implementation
│   │   └── index.ts     # Provider system exports
│   ├── dynamodb.ts      # Database utilities
│   └── privy-config.ts  # Authentication configuration
└── public/
    └── images/
        └── providers/   # Provider icons
```

### 🆕 Enhanced Key Components
- **PlatformDashboard**: Main dashboard with enhanced tabbed interface
- **🆕 EnhancedEnclavesSection**: Real-time enclave management with application logs
- **🆕 Professional Controls**: Redesigned lifecycle management buttons
- **ProviderSelector**: Reusable provider selection component
- **ProviderConfigComponent**: Dynamic configuration forms based on provider schemas
- **TasksSection**: Task scheduling, deployment, and monitoring
- **ApiKeysSection**: API key generation and management
- **🆕 RealTimeLogViewer**: Professional application log display component

### Available Scripts
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## Database Schema

The platform uses DynamoDB with the following tables:

### 🆕 Enhanced Enclaves Table (with Provider Support)
```
{
  id: string (primary key)
  name: string
  description: string
  status: 'PENDING_DEPLOY' | 'DEPLOYING' | 'DEPLOYED' | 'PENDING_DESTROY' | 'DESTROYING' | 'DESTROYED' | 'FAILED'  // 🆕 Enhanced status values
  region: string
  providerId: string              // Provider identifier
  providerConfig: object          // Provider-specific configuration
  walletAddress: string (GSI)
  createdAt: string               // 🆕 Used for default sorting
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
- **🆕 Automated Secure Enclaves**: Provider-specific isolation with shared security groups
- **Task Isolation**: Each task runs in its designated enclave securely
- **Audit Logging**: Complete operation and execution history
- **🆕 Real-time Security Monitoring**: Continuous status tracking and alerting

## Deployment

### Vercel Deployment
The app is optimized for Vercel deployment:
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### 🆕 Required Infrastructure
For full functionality, deploy the **treza-terraform** infrastructure first:
- Provides automated enclave deployment
- Enables real-time application logs
- Manages shared security groups
- Handles lifecycle automation

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

### 🆕 Platform Enhancements (In Progress)
- ✅ **Real-time enclave monitoring and metrics** - COMPLETED
- ✅ **Enhanced UI/UX with professional design** - COMPLETED
- ✅ **Automated lifecycle management** - COMPLETED
- **Advanced task orchestration and workflows** - PLANNED
- **Multi-cloud deployment strategies** - PLANNED
- **Enhanced security audit trails** - PLANNED
- **Provider-specific cost optimization** - PLANNED

## Contributing

We welcome contributions to extend the provider system:

1. **Fork the repository**
2. **Create a feature branch** for your provider
3. **Implement the provider** following the existing patterns
4. **🆕 Test with real-time features** including application logs and status updates
5. **Add comprehensive tests**
6. **Submit a pull request** with provider documentation

## 🆕 Enhanced Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Routes    │    │   DynamoDB      │
│   (React/Next)  │◄──►│   (Next.js)     │◄──►│   (AWS)         │
│   + Real-time   │    │   + Lifecycle   │    │   + Enhanced    │
│   Monitoring    │    │   Management    │    │   Status        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Provider      │    │   Business      │    │   CloudWatch    │
│   System        │    │   Logic         │    │   Logs          │
│   (Extensible)  │    │   + Automation  │    │   (Real-time)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AWS Nitro     │    │   Terraform     │    │   Step          │
│   + Automation  │    │   Infrastructure│    │   Functions     │
│   + Shared SGs  │    │   (Backend)     │    │   (Workflows)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

**Created**: December 2024  
**Status**: Production Ready  
**Version**: 2.0.0 - **Enhanced Automation & Real-time Monitoring**

*Built for secure, scalable enclave management with complete lifecycle automation and professional user experience.*