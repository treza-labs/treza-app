"use client";

import { useState, useEffect } from 'react';
import { Disclosure } from '@headlessui/react';
import { ChevronDown } from 'lucide-react';
import { Provider, ProviderConfig, ProviderConfigSchema } from '@/lib/providers/types';
import { getProvider } from '@/lib/providers';
import DockerImageSelector from './docker-image-selector';

interface ProviderConfigProps {
  providerId: string;
  config: ProviderConfig;
  onConfigChange: (config: ProviderConfig) => void;
  disabled?: boolean;
}

export default function ProviderConfigComponent({ 
  providerId, 
  config, 
  onConfigChange, 
  disabled = false 
}: ProviderConfigProps) {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    const loadProvider = () => {
      if (!providerId) {
        setProvider(null);
        setIsLoading(false);
        return;
      }

      try {
        // Get provider from client-side registry to preserve functions
        const providerData = getProvider(providerId);
        
        if (providerData) {
          setProvider(providerData);
          
          // Initialize config with default values
          const schema = providerData.configSchema;
          const newConfig = { ...config };
          let hasChanges = false;
          
          Object.entries(schema as ProviderConfigSchema).forEach(([key, field]) => {
            if (field.defaultValue !== undefined && newConfig[key] === undefined) {
              newConfig[key] = field.defaultValue;
              hasChanges = true;
            }
          });
          
          if (hasChanges) {
            onConfigChange(newConfig);
          }
        } else {
          console.error('Provider not found:', providerId);
          setProvider(null);
        }
      } catch (error) {
        console.error('Error loading provider:', error);
        setProvider(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadProvider();
  }, [providerId]);

  useEffect(() => {
    // Validate config whenever it changes
    if (provider && config) {
      const validation = provider.validateConfig(config);
      setValidationErrors(validation.errors);
    }
  }, [provider, config]);

  const handleFieldChange = (fieldName: string, value: any) => {
    const newConfig = { ...config, [fieldName]: value };
    onConfigChange(newConfig);
  };

  const renderField = (fieldName: string, field: ProviderConfigSchema[string]) => {
    const value = config[fieldName] || '';

    switch (field.type) {
      case 'string':
        // Use Docker image selector for Docker image fields
        if (fieldName === 'dockerImage' || fieldName === 'containerImage') {
          return (
            <DockerImageSelector
              value={value}
              onChange={(newValue) => handleFieldChange(fieldName, newValue)}
              disabled={disabled}
              placeholder={field.description}
            />
          );
        }
        
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            disabled={disabled}
            className="form-input w-full"
            placeholder={field.description}
          />
        );

      case 'text':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            disabled={disabled}
            className="form-input w-full"
            rows={3}
            placeholder={field.description}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(fieldName, parseInt(e.target.value))}
            disabled={disabled}
            className="form-input w-full"
            min={field.validation?.min}
            max={field.validation?.max}
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={value === true}
              onChange={(e) => handleFieldChange(fieldName, e.target.checked)}
              disabled={disabled}
              className="form-checkbox h-4 w-4 text-indigo-600 bg-gray-800 border-gray-600 rounded focus:ring-indigo-500 focus:ring-2"
            />
            <span className="ml-2 text-sm text-gray-300">{field.label}</span>
          </div>
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            disabled={disabled}
            className="form-input w-full"
          >
            <option value="">Select...</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-32 bg-gray-700 rounded"></div>
        <div className="h-10 bg-gray-700 rounded"></div>
        <div className="h-10 bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="text-left py-6 text-gray-400">
        Select a provider to configure its settings
      </div>
    );
  }

  // Separate basic and advanced fields
  const basicFields = ['dockerImage', 'containerImage']; // Basic fields to show always
  const advancedFields = ['cpuCount', 'memoryMiB', 'instanceType', 'vmSize', 'environmentVariables', 'enableDebug', 'enableLogging', 'attestationUrl'];

  const renderFieldGroup = (fields: string[], title?: string) => {
    const schemaEntries = Object.entries(provider.configSchema).filter(([fieldName]) => 
      fields.includes(fieldName)
    );

    if (schemaEntries.length === 0) return null;

    return (
      <div className="space-y-4">
        {title && (
          <h5 className="text-sm font-medium text-gray-200 mb-2 text-left">{title}</h5>
        )}
        {schemaEntries.map(([fieldName, field]) => (
          <div key={fieldName} className="mb-4">
            {field.type !== 'boolean' && (
              <label className="block text-left text-sm font-medium text-gray-300 mb-1">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </label>
            )}
            
            {renderField(fieldName, field)}
            
            {field.description && field.type !== 'boolean' && (
              <p className="text-xs text-gray-500 mt-1 text-left">{field.description}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="border-t border-gray-700 pt-4">
        <h4 className="text-sm font-medium text-white mb-4 text-left">
          {provider.name} Configuration
        </h4>
        
        {/* Basic Configuration */}
        {renderFieldGroup(basicFields)}

        {/* Advanced Options Accordion */}
        <Disclosure>
          {({ open }) => (
            <>
              <Disclosure.Button className="flex w-full justify-between rounded-lg bg-gray-800/50 px-4 py-2 text-left text-sm font-medium text-gray-200 hover:bg-gray-800/70 focus:outline-none focus-visible:ring focus-visible:ring-indigo-500 focus-visible:ring-opacity-75 transition-colors">
                <span>Advanced Options</span>
                <ChevronDown
                  className={`${
                    open ? 'rotate-180 transform' : ''
                  } h-5 w-5 text-gray-400 transition-transform`}
                />
              </Disclosure.Button>
              <Disclosure.Panel className="pt-4 pb-2">
                {renderFieldGroup(advancedFields)}
              </Disclosure.Panel>
            </>
          )}
        </Disclosure>

        {/* Other fields that don't fit in basic or advanced */}
        {(() => {
          const otherFields = Object.keys(provider.configSchema).filter(
            fieldName => !basicFields.includes(fieldName) && !advancedFields.includes(fieldName)
          );
          return renderFieldGroup(otherFields);
        })()}

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="text-left">
                <p className="text-sm text-red-300 font-medium">Configuration Errors:</p>
                <ul className="text-xs text-red-400 mt-1 space-y-1 text-left">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 