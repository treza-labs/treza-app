import { Provider } from './types';
import { awsNitroProvider } from './aws-nitro';

// Provider registry - easy to extend with new providers
class ProviderRegistry {
  private providers: Map<string, Provider> = new Map();

  constructor() {
    // Register default providers
    this.register(awsNitroProvider);
  }

  register(provider: Provider): void {
    this.providers.set(provider.id, provider);
  }

  unregister(providerId: string): void {
    this.providers.delete(providerId);
  }

  get(providerId: string): Provider | undefined {
    return this.providers.get(providerId);
  }

  getAll(): Provider[] {
    return Array.from(this.providers.values());
  }

  getAvailableProviders(): Provider[] {
    // Future: could filter based on user permissions, region availability, etc.
    return this.getAll();
  }

  getRegionsForProvider(providerId: string): string[] {
    const provider = this.get(providerId);
    return provider?.regions || [];
  }

  validateProviderConfig(providerId: string, config: any) {
    const provider = this.get(providerId);
    if (!provider) {
      return {
        isValid: false,
        errors: [`Provider ${providerId} not found`]
      };
    }
    return provider.validateConfig(config);
  }
}

// Singleton instance
export const providerRegistry = new ProviderRegistry();

// Helper functions for easy access
export const getProvider = (providerId: string) => providerRegistry.get(providerId);
export const getAllProviders = () => providerRegistry.getAll();
export const getAvailableProviders = () => providerRegistry.getAvailableProviders();

// Example of how to add a new provider in the future:
// import { myCustomProvider } from './my-custom-provider';
// providerRegistry.register(myCustomProvider); 