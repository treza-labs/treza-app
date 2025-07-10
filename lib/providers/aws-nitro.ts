import { Provider, ProviderConfig, ValidationResult } from './types';

export const awsNitroProvider: Provider = {
  id: 'aws-nitro',
  name: 'AWS Nitro Enclaves',
  description: 'Secure, isolated compute environments using AWS Nitro technology',
  icon: '/images/providers/aws-nitro.svg',
  regions: [
    'us-east-1',
    'us-west-2',
    'eu-west-1',
    'eu-central-1',
    'ap-southeast-1',
    'ap-northeast-1'
  ],
  configSchema: {
    dockerImage: {
      type: 'string',
      label: 'Docker Image URI',
      description: 'Container image to run in the enclave (e.g., hello-world)',
      required: true,
      validation: {
        pattern: '^[a-zA-Z0-9\\.\\-_/]+:[a-zA-Z0-9\\.\\-_]+$'
      }
    },
    cpuCount: {
      type: 'select',
      label: 'CPU Count',
      description: 'Number of vCPUs to allocate to the enclave',
      required: true,
      options: [
        { value: '2', label: '2 vCPUs' },
        { value: '4', label: '4 vCPUs' },
        { value: '8', label: '8 vCPUs' },
        { value: '16', label: '16 vCPUs' }
      ],
      defaultValue: '2'
    },
    memoryMiB: {
      type: 'select',
      label: 'Memory (MiB)',
      description: 'Amount of memory to allocate to the enclave',
      required: true,
      options: [
        { value: '1024', label: '1 GB (1024 MiB)' },
        { value: '2048', label: '2 GB (2048 MiB)' },
        { value: '4096', label: '4 GB (4096 MiB)' },
        { value: '8192', label: '8 GB (8192 MiB)' },
        { value: '16384', label: '16 GB (16384 MiB)' }
      ],
      defaultValue: '1024'
    },
    instanceType: {
      type: 'select',
      label: 'Instance Type',
      description: 'EC2 instance type for the parent instance',
      required: true,
      options: [
        { value: 'm5.large', label: 'm5.large' },
        { value: 'm5.xlarge', label: 'm5.xlarge' },
        { value: 'm5.2xlarge', label: 'm5.2xlarge' },
        { value: 'm5.4xlarge', label: 'm5.4xlarge' },
        { value: 'c5.large', label: 'c5.large' },
        { value: 'c5.xlarge', label: 'c5.xlarge' },
        { value: 'c5.2xlarge', label: 'c5.2xlarge' }
      ],
      defaultValue: 'm5.large'
    },
    enableDebug: {
      type: 'boolean',
      label: 'Enable Debug Mode',
      description: 'Enable debug console access (reduces security isolation)',
      required: false,
      defaultValue: false
    },
    environmentVariables: {
      type: 'text',
      label: 'Environment Variables',
      description: 'Environment variables as JSON (e.g., {"API_KEY": "value", "DEBUG": "true"})',
      required: false,
      validation: {
        pattern: '^\\{.*\\}$|^$'
      }
    }
  },
  validateConfig: (config: ProviderConfig): ValidationResult => {
    const errors: string[] = [];
    
    // Validate Docker image URI
    if (!config.dockerImage) {
      errors.push('Docker image URI is required');
    } else if (!/^[a-zA-Z0-9\.\-_/]+:[a-zA-Z0-9\.\-_]+$/.test(config.dockerImage)) {
      errors.push('Invalid Docker image URI format');
    }
    
    // Validate CPU count
    if (!config.cpuCount) {
      errors.push('CPU count is required');
    } else if (!['2', '4', '8', '16'].includes(config.cpuCount)) {
      errors.push('Invalid CPU count');
    }
    
    // Validate memory
    if (!config.memoryMiB) {
      errors.push('Memory allocation is required');
    } else if (!['1024', '2048', '4096', '8192', '16384'].includes(config.memoryMiB)) {
      errors.push('Invalid memory allocation');
    }
    
    // Validate instance type
    if (!config.instanceType) {
      errors.push('Instance type is required');
    }
    
    // Validate environment variables if provided
    if (config.environmentVariables && config.environmentVariables.trim()) {
      try {
        JSON.parse(config.environmentVariables);
      } catch (e) {
        errors.push('Environment variables must be valid JSON');
      }
    }
    
    // Validate CPU/Memory compatibility
    const cpuCount = parseInt(config.cpuCount);
    const memoryMiB = parseInt(config.memoryMiB);
    if (cpuCount && memoryMiB) {
      const minMemoryPerCpu = 512; // Minimum 512 MiB per vCPU
      if (memoryMiB < cpuCount * minMemoryPerCpu) {
        errors.push(`Memory allocation too low for ${cpuCount} vCPUs. Minimum ${cpuCount * minMemoryPerCpu} MiB required.`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },
  getDisplayName: (region: string): string => {
    const regionNames: { [key: string]: string } = {
      'us-east-1': 'US East (N. Virginia)',
      'us-west-2': 'US West (Oregon)',
      'eu-west-1': 'Europe (Ireland)',
      'eu-central-1': 'Europe (Frankfurt)',
      'ap-southeast-1': 'Asia Pacific (Singapore)',
      'ap-northeast-1': 'Asia Pacific (Tokyo)'
    };
    return regionNames[region] || region;
  }
}; 