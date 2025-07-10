// Core provider types and interfaces
export interface ProviderConfig {
  [key: string]: any;
}

export interface Provider {
  id: string;
  name: string;
  description: string;
  icon?: string;
  regions: string[];
  configSchema: ProviderConfigSchema;
  validateConfig: (config: ProviderConfig) => ValidationResult;
  getDisplayName: (region: string) => string;
}

export interface ProviderConfigSchema {
  [fieldName: string]: {
    type: 'string' | 'number' | 'boolean' | 'select' | 'text';
    label: string;
    description?: string;
    required?: boolean;
    options?: { value: string; label: string }[];
    validation?: {
      min?: number;
      max?: number;
      pattern?: string;
    };
    defaultValue?: any;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Extended enclave interface with provider support
export interface EnclaveWithProvider {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'pending';
  region: string;
  walletAddress: string;
  createdAt: string;
  updatedAt: string;
  // Provider-specific fields
  providerId: string;
  providerConfig: ProviderConfig;
  githubConnection?: {
    isConnected: boolean;
    username: string;
    selectedRepo?: string;
    selectedBranch?: string;
    accessToken?: string;
  };
}

// Provider deployment status
export interface ProviderDeploymentStatus {
  providerId: string;
  status: 'pending' | 'deploying' | 'active' | 'failed' | 'stopping' | 'stopped';
  message?: string;
  deploymentId?: string;
  endpoint?: string;
} 