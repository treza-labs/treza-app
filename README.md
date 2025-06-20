# Treza App

**Secure Enclave and Task Management Platform** - Create and manage isolated execution environments with automated task scheduling. Built for secure, scalable workload management with blockchain wallet integration.

## Overview

Treza App is a secure platform for managing enclaves and automated tasks with blockchain wallet integration. The platform provides a comprehensive dashboard for creating isolated execution environments, scheduling tasks, and managing API access with enterprise-grade security.

## Key Features

### 🔐 **Secure Authentication**
- Email-based authentication powered by Privy
- Wallet integration (Solana and Ethereum support)
- Secure user session management

### 🏰 **Enclave Management**
- Create and manage isolated execution environments
- Multi-region deployment support (US East, US West, Europe, Asia Pacific)
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
- Real-time data updates and monitoring
- Responsive design for desktop and mobile
- Dark theme with modern UI components
- Comprehensive resource utilization views

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4.0
- **Authentication**: Privy (Email + Wallet)
- **Database**: AWS DynamoDB
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
2. **Create Enclaves**: Set up isolated execution environments
3. **Deploy Tasks**: Schedule automated tasks to run in your enclaves
4. **Monitor Execution**: Track task performance and enclave status
5. **Generate API Keys**: Create SDK access keys for external integrations

### API Endpoints

The platform provides RESTful APIs for all core functionality:

#### Enclaves
- `GET /api/enclaves?wallet={address}` - List user's enclaves
- `POST /api/enclaves` - Create new enclave
- `PUT /api/enclaves` - Update enclave
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
├── components/          # Reusable UI components
├── lib/                 # Utility libraries (DynamoDB, Privy)
└── public/              # Static assets
```

### Key Components
- **PlatformDashboard**: Main dashboard with tabbed interface
- **EnclavesSection**: Enclave creation and management interface
- **TasksSection**: Task scheduling, deployment, and monitoring
- **ApiKeysSection**: API key generation and management
- **EmailConnection**: Authentication component

### Available Scripts
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## Database Schema

The platform uses DynamoDB with the following tables:

### Enclaves
- Primary Key: `id`
- GSI: `walletAddress`
- Fields: name, description, status, region, timestamps

### Tasks
- Primary Key: `id`
- GSI: `walletAddress`
- Fields: name, description, enclaveId, status, schedule, lastRun, timestamps

### API Keys
- Primary Key: `id`
- GSI: `walletAddress`
- Fields: name, key, permissions, status, lastUsed, timestamps

## Security Features

- **Wallet-based Authorization**: All operations scoped to authenticated user
- **Encrypted Storage**: Sensitive data encrypted at rest
- **API Key Permissions**: Granular access control
- **Secure Enclaves**: Isolated execution environments with strict boundaries
- **Task Isolation**: Each task runs in its designated enclave securely
- **Audit Logging**: Complete operation and execution history

## Deployment

### Vercel Deployment
The app is optimized for Vercel deployment:
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables Required
```
AWS_REGION
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
NEXT_PUBLIC_PRIVY_APP_ID
PRIVY_APP_SECRET
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
GITHUB_REDIRECT_URI
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the established component patterns
4. Add proper TypeScript types
5. Include error handling
6. Submit a pull request

## Roadmap

- [ ] Real-time WebSocket connections for live task monitoring
- [ ] Advanced scheduling options and task dependencies
- [ ] Multi-chain wallet support expansion
- [ ] Enhanced enclave resource monitoring and alerting
- [ ] API rate limiting and usage analytics
- [ ] Team collaboration and enclave sharing features
- [ ] Auto-scaling enclaves based on task load
- [ ] Task execution logs and debugging tools

## Support

For technical support or questions:
- Review the [Platform README](./PLATFORM_README.md) for detailed implementation docs
- Check the API documentation above
- Submit issues via GitHub

## License

See LICENSE file for details.
