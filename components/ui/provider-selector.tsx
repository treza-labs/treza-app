"use client";

import { useState, useEffect } from 'react';
import { Provider } from '@/lib/providers/types';
import { getAvailableProviders } from '@/lib/providers';

interface ProviderSelectorProps {
  selectedProviderId: string;
  onProviderChange: (providerId: string) => void;
  disabled?: boolean;
}

export default function ProviderSelector({ 
  selectedProviderId, 
  onProviderChange, 
  disabled = false 
}: ProviderSelectorProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProviders = () => {
      try {
        // Get providers from client-side registry to preserve functions
        const availableProviders = getAvailableProviders();
        setProviders(availableProviders);
        
        // Auto-select first provider if none selected
        if (!selectedProviderId && availableProviders.length > 0) {
          onProviderChange(availableProviders[0].id);
        }
      } catch (error) {
        console.error('Error loading providers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProviders();
  }, [selectedProviderId, onProviderChange]);

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 w-24 bg-gray-700 rounded mb-2"></div>
        <div className="h-10 bg-gray-700 rounded"></div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-left text-sm font-medium text-gray-300 mb-1">
        Provider
      </label>
      <select
        value={selectedProviderId}
        onChange={(e) => onProviderChange(e.target.value)}
        disabled={disabled}
        className="form-input w-full"
      >
        <option value="">Select a provider...</option>
        {providers.map((provider) => (
          <option key={provider.id} value={provider.id}>
            {provider.name}
          </option>
        ))}
      </select>
      
      {/* Show provider description */}
      {selectedProviderId && (
        <div className="mt-2 p-3 bg-gray-800/50 border border-gray-700 rounded-md">
          {(() => {
            const provider = providers.find(p => p.id === selectedProviderId);
            return provider ? (
              <div className="flex items-start space-x-3">
                {provider.icon && (
                  <img 
                    src={provider.icon} 
                    alt={provider.name}
                    className="w-6 h-6 mt-0.5 flex-shrink-0"
                    onError={(e) => {
                      // Hide image if it fails to load
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <div className="text-left">
                  <h4 className="text-sm font-medium text-white text-left">{provider.name}</h4>
                  <p className="text-xs text-gray-400 mt-1 text-left">{provider.description}</p>
                  <div className="text-xs text-gray-500 mt-1 text-left">
                    Regions: {provider.regions.join(', ')}
                  </div>
                </div>
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
} 