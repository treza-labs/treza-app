import { Provider, ProviderConfig, ValidationResult } from './types';

// Example of how easy it is to add a new provider
export const azureEnclavesProvider: Provider = {
  id: 'azure-enclaves',
  name: 'Azure Confidential Computing',
  description: 'Secure enclaves using Azure Confidential Computing technology',
  icon: '/images/providers/azure-confidential.svg',
  regions: [
    'eastus',
    'westus2',
    'northeurope',
    'westeurope',
    'southeastasia',
    'australiaeast'
  ],
  configSchema: {
    vmSize: {
      type: 'select',
      label: 'VM Size',
      description: 'Azure VM size for confidential computing',
      required: true,
      options: [
        { value: 'Standard_DC1s_v2', label: 'Standard_DC1s_v2 (1 vCPU, 4 GB)' },
        { value: 'Standard_DC2s_v2', label: 'Standard_DC2s_v2 (2 vCPU, 8 GB)' },
        { value: 'Standard_DC4s_v2', label: 'Standard_DC4s_v2 (4 vCPU, 16 GB)' },
        { value: 'Standard_DC8s_v2', label: 'Standard_DC8s_v2 (8 vCPU, 32 GB)' }
      ],
      defaultValue: 'Standard_DC2s_v2'
    },
    containerImage: {
      type: 'string',
      label: 'Container Image',
      description: 'Container image URL from Azure Container Registry',
      required: true,
      validation: {
        pattern: '^[a-zA-Z0-9\\.\\-_/]+:[a-zA-Z0-9\\.\\-_]+$'
      }
    },
    attestationUrl: {
      type: 'string',
      label: 'Attestation URL',
      description: 'Azure Attestation service URL for verification',
      required: false
    },
    enableLogging: {
      type: 'boolean',
      label: 'Enable Application Insights',
      description: 'Enable logging to Azure Application Insights',
      required: false,
      defaultValue: true
    }
  },
  validateConfig: (config: ProviderConfig): ValidationResult => {
    const errors: string[] = [];
    
    if (!config.vmSize) {
      errors.push('VM size is required');
    }
    
    if (!config.containerImage) {
      errors.push('Container image is required');
    } else if (!/^[a-zA-Z0-9\.\-_/]+:[a-zA-Z0-9\.\-_]+$/.test(config.containerImage)) {
      errors.push('Invalid container image format');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },
  getDisplayName: (region: string): string => {
    const regionNames: { [key: string]: string } = {
      'eastus': 'East US',
      'westus2': 'West US 2',
      'northeurope': 'North Europe',
      'westeurope': 'West Europe',
      'southeastasia': 'Southeast Asia',
      'australiaeast': 'Australia East'
    };
    return regionNames[region] || region;
  }
};

// To activate this provider, uncomment the line below in registry.ts:
// providerRegistry.register(azureEnclavesProvider); 