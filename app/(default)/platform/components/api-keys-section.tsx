"use client";

import { useState, useEffect } from "react";
import { usePrivy } from '@privy-io/react-auth';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  status: 'active' | 'inactive';
  createdAt: string;
  lastUsed?: string;
  walletAddress: string;
  updatedAt: string;
}

export default function ApiKeysSection() {
  const { user } = usePrivy();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    permissions: ['enclaves:read']
  });

  const walletAddress = user?.email?.address || '';

  const availablePermissions = [
    { id: 'enclaves:read', label: 'Read Enclaves', description: 'View enclave information' },
    { id: 'enclaves:write', label: 'Write Enclaves', description: 'Create and modify enclaves' },
    { id: 'tasks:read', label: 'Read Tasks', description: 'View task information' },
    { id: 'tasks:write', label: 'Write Tasks', description: 'Create and modify tasks' },
    { id: 'logs:read', label: 'Read Logs', description: 'Access execution logs' }
  ];

  // Fetch API keys from API
  const fetchApiKeys = async () => {
    if (!walletAddress) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/api-keys?wallet=${encodeURIComponent(walletAddress)}`);
      const data = await response.json();
      
      if (response.ok) {
        setApiKeys(data.apiKeys || []);
      } else {
        console.error('Error fetching API keys:', data.error);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load API keys on component mount
  useEffect(() => {
    fetchApiKeys();
  }, [walletAddress]);

  const handleCreate = async () => {
    if (!walletAddress || !formData.name || formData.permissions.length === 0) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          permissions: formData.permissions,
          walletAddress: walletAddress
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setApiKeys([...apiKeys, data.apiKey]);
        setIsModalOpen(false);
        setFormData({ name: '', permissions: ['enclaves:read'] });
      } else {
        console.error('Error creating API key:', data.error);
        alert('Error creating API key: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating API key:', error);
      alert('Error creating API key');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (apiKey: ApiKey) => {
    setEditingKey(apiKey);
    setFormData({
      name: apiKey.name,
      permissions: apiKey.permissions
    });
    setIsModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingKey || !walletAddress) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/api-keys', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingKey.id,
          name: formData.name,
          permissions: formData.permissions,
          walletAddress: walletAddress
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setApiKeys(apiKeys.map(k => 
          k.id === editingKey.id ? data.apiKey : k
        ));
        setIsModalOpen(false);
        setEditingKey(null);
        setFormData({ name: '', permissions: ['enclaves:read'] });
      } else {
        console.error('Error updating API key:', data.error);
        alert('Error updating API key: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating API key:', error);
      alert('Error updating API key');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.') || !walletAddress) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/api-keys?id=${id}&wallet=${encodeURIComponent(walletAddress)}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (response.ok) {
        setApiKeys(apiKeys.filter(k => k.id !== id));
      } else {
        console.error('Error deleting API key:', data.error);
        alert('Error deleting API key: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
      alert('Error deleting API key');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    const apiKey = apiKeys.find(k => k.id === id);
    if (!apiKey || !walletAddress) return;

    const newStatus = apiKey.status === 'active' ? 'inactive' : 'active';

    try {
      setIsLoading(true);
      const response = await fetch('/api/api-keys', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: id,
          status: newStatus,
          walletAddress: walletAddress
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setApiKeys(apiKeys.map(k => 
          k.id === id ? data.apiKey : k
        ));
      } else {
        console.error('Error updating API key status:', data.error);
        alert('Error updating API key status: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating API key status:', error);
      alert('Error updating API key status');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    if (checked) {
      setFormData({ ...formData, permissions: [...formData.permissions, permission] });
    } else {
      setFormData({ ...formData, permissions: formData.permissions.filter(p => p !== permission) });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // In a real app, you'd show a toast notification here
    alert('API key copied to clipboard!');
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 12) return key;
    return key.substring(0, 12) + '•'.repeat(key.length - 16) + key.substring(key.length - 4);
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-500' : 'bg-gray-500';
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      return { date: dateStr, time: timeStr };
    } catch (error) {
      return { date: timestamp, time: '' };
    }
  };

  const formatLastUsed = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      return { date: dateStr, time: timeStr };
    } catch (error) {
      return { date: timestamp, time: '' };
    }
  };

  if (isLoading && apiKeys.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="text-gray-400 mt-2">Loading API keys...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">API Keys</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn cursor-pointer bg-linear-to-t from-indigo-600 to-indigo-500 bg-[length:100%_100%] bg-[bottom] text-white shadow-[inset_0px_1px_0px_0px_--theme(--color-white/.16)] hover:bg-[length:100%_150%]"
        >
          Create API Key
        </button>
      </div>

      {/* API Keys Table */}
      {apiKeys.length > 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-32">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-64">API Key</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-24">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-48">Permissions</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-28">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-64">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {apiKeys.map((apiKey) => (
                <tr key={apiKey.id} className="hover:bg-gray-700/50">
                  <td className="px-4 py-4 whitespace-nowrap text-left">
                    <div className="text-sm font-medium text-white truncate text-left">{apiKey.name}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-900 px-2 py-1 rounded font-mono text-gray-300">
                        {maskApiKey(apiKey.key)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(apiKey.key)}
                        className="text-xs text-gray-400 hover:text-white cursor-pointer flex-shrink-0"
                      >
                        Copy
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      apiKey.status === 'active' ? 'bg-green-500/10 text-green-400' :
                      'bg-gray-500/10 text-gray-400'
                    }`}>
                      {apiKey.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {apiKey.permissions.map(permission => (
                        <span key={permission} className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">
                          {permission}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-left">
                    <div className="text-sm text-gray-300 text-left">{formatTimestamp(apiKey.createdAt).date}</div>
                    {formatTimestamp(apiKey.createdAt).time && (
                      <div className="text-xs text-gray-500 text-left">{formatTimestamp(apiKey.createdAt).time}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-left text-sm font-medium">
                    <div className="flex items-center justify-start gap-1 min-w-max">
                      <button
                        onClick={() => handleToggleStatus(apiKey.id)}
                        className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                          apiKey.status === 'active' 
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' 
                            : 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20'
                        }`}
                      >
                        {apiKey.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleEdit(apiKey)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-400 hover:text-white border border-gray-600 rounded-md hover:border-gray-500 transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(apiKey.id)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-400 hover:text-red-400 border border-gray-600 rounded-md hover:border-red-500/50 transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No API keys yet</h3>
          <p className="text-gray-400 mb-6 max-w-sm mx-auto">
            Create your first API key to start accessing the Treza platform programmatically.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn cursor-pointer bg-linear-to-t from-indigo-600 to-indigo-500 bg-[length:100%_100%] bg-[bottom] text-white shadow-[inset_0px_1px_0px_0px_--theme(--color-white/.16)] hover:bg-[length:100%_150%]"
          >
            Create Your First API Key
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingKey ? 'Edit API Key' : 'Create New API Key'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-left text-sm font-medium text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="form-input w-full"
                  placeholder="Enter API key name"
                />
              </div>
              <div>
                <label className="block text-left text-sm font-medium text-gray-300 mb-2">Permissions</label>
                <div className="space-y-2">
                  {availablePermissions.map(permission => (
                    <label key={permission.id} className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(permission.id)}
                        onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                        className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <div className="text-left">
                        <div className="text-sm text-white">{permission.label}</div>
                        <div className="text-xs text-gray-400">{permission.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingKey(null);
                  setFormData({ name: '', permissions: ['enclaves:read'] });
                }}
                className="btn cursor-pointer flex-1 bg-linear-to-b from-gray-800 to-gray-800/60 bg-[length:100%_100%] bg-[bottom] text-gray-300 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-transparent before:[background:linear-gradient(to_right,var(--color-gray-800),var(--color-gray-700),var(--color-gray-800))_border-box] before:[mask-composite:exclude_!important] before:[mask:linear-gradient(white_0_0)_padding-box,_linear-gradient(white_0_0)] hover:bg-[length:100%_150%]"
              >
                Cancel
              </button>
              <button
                onClick={editingKey ? handleUpdate : handleCreate}
                className="btn cursor-pointer flex-1 bg-linear-to-t from-indigo-600 to-indigo-500 bg-[length:100%_100%] bg-[bottom] text-white shadow-[inset_0px_1px_0px_0px_--theme(--color-white/.16)] hover:bg-[length:100%_150%]"
              >
                {editingKey ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 