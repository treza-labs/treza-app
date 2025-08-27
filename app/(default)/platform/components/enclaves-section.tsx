"use client";

import { useState, useEffect } from "react";
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import ProviderSelector from '@/components/ui/provider-selector';
import ProviderConfigComponent from '@/components/ui/provider-config';
import ComingSoonModal from '@/components/ui/coming-soon-modal';
import { EnclaveWithProvider, ProviderConfig } from '@/lib/providers/types';
import { getProvider } from '@/lib/providers';
import { getTableStatusColors, formatStatusText } from '@/lib/status-colors';
import { isProduction } from '@/lib/environment';

export default function EnclavesSection() {
  const { user } = usePrivy();
  const router = useRouter();
  const [enclaves, setEnclaves] = useState<EnclaveWithProvider[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isComingSoonModalOpen, setIsComingSoonModalOpen] = useState(false);
  const [editingEnclave, setEditingEnclave] = useState<EnclaveWithProvider | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnectingGitHub, setIsConnectingGitHub] = useState(false);
  const [repositories, setRepositories] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [repoSearchTerm, setRepoSearchTerm] = useState('');
  const [branchSearchTerm, setBranchSearchTerm] = useState('');
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    providerId: '',
    providerConfig: {} as ProviderConfig,
    region: '',
    githubConnection: {
      isConnected: false,
      username: '',
      selectedRepo: '',
      selectedBranch: 'main',
      accessToken: ''
    }
  });

  const walletAddress = user?.email?.address || '';

  // GitHub API functions (keeping existing GitHub functionality)
  const fetchRepositories = async (accessToken: string) => {
    if (!accessToken) return;
    
    setIsLoadingRepos(true);
    try {
      const response = await fetch(`/api/github/repositories?token=${encodeURIComponent(accessToken)}`);
      const data = await response.json();
      
      if (response.ok) {
        setRepositories(data.repositories || []);
      } else {
        console.error('Error fetching repositories:', data.error);
      }
    } catch (error) {
      console.error('Error fetching repositories:', error);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const fetchBranches = async (accessToken: string, repository: string) => {
    if (!accessToken || !repository) return;
    
    setIsLoadingBranches(true);
    try {
      const response = await fetch('/api/github/repositories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken,
          repository
        }),
      });
      const data = await response.json();
      
      if (response.ok) {
        setBranches(data.branches || []);
      } else {
        console.error('Error fetching branches:', data.error);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setIsLoadingBranches(false);
    }
  };

  // GitHub OAuth integration (keeping existing functionality)
  const handleGitHubConnect = async () => {
    setIsConnectingGitHub(true);
    try {
      localStorage.setItem('treza_github_oauth_state', JSON.stringify({
        modalOpen: true,
        editingEnclave: editingEnclave ? editingEnclave.id : null,
        formData: formData
      }));

      const state = `enclave_modal_${Date.now()}`;
      const response = await fetch(`/api/github/auth?state=${state}`);
      const data = await response.json();
      
      if (response.ok) {
        window.location.href = data.authUrl;
      } else {
        console.error('Error getting GitHub auth URL:', data.error);
        alert('Error connecting to GitHub: ' + data.error);
        setIsConnectingGitHub(false);
      }
    } catch (error) {
      console.error('Error connecting to GitHub:', error);
      alert('Error connecting to GitHub');
      setIsConnectingGitHub(false);
    }
  };

  // Fetch enclaves from API
  const fetchEnclaves = async () => {
    if (!walletAddress) return;
    
    try {
      setIsLoading(true);
      
      // Start the API call and a minimum loading time in parallel
      const [response] = await Promise.all([
        fetch(`/api/enclaves?wallet=${encodeURIComponent(walletAddress)}`),
        new Promise(resolve => setTimeout(resolve, 800)) // Minimum 800ms loading time
      ]);
      
      const data = await response.json();
      
      if (response.ok) {
        setEnclaves(data.enclaves || []);
      } else {
        console.error('Error fetching enclaves:', data.error);
      }
    } catch (error) {
      console.error('Error fetching enclaves:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load enclaves on component mount
  useEffect(() => {
    fetchEnclaves();
  }, [walletAddress]);

  // Handle provider selection
  const handleProviderChange = (providerId: string) => {
    const provider = getProvider(providerId);
    setFormData({
      ...formData,
      providerId,
      providerConfig: {},
      region: provider?.regions[0] || '' // Set first available region
    });
  };

  // Handle provider config changes
  const handleProviderConfigChange = (config: ProviderConfig) => {
    setFormData({
      ...formData,
      providerConfig: config
    });
  };

  // Handle GitHub OAuth callback (keeping existing functionality)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const githubSuccess = urlParams.get('github_success');
    const githubUser = urlParams.get('github_user');
    const githubToken = urlParams.get('github_token');
    const githubError = urlParams.get('github_error');

    if (githubSuccess && githubUser && githubToken) {
      const savedState = localStorage.getItem('treza_github_oauth_state');
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          
          const updatedFormData = {
            ...parsedState.formData,
            githubConnection: {
              isConnected: true,
              username: githubUser,
              selectedRepo: parsedState.formData.githubConnection.selectedRepo || '',
              selectedBranch: parsedState.formData.githubConnection.selectedBranch || 'main',
              accessToken: githubToken
            }
          };
          
          setFormData(updatedFormData);
          fetchRepositories(githubToken);
           
          if (parsedState.modalOpen) {
            setIsModalOpen(true);
            
            if (parsedState.editingEnclave) {
              const enclave = enclaves.find(e => e.id === parsedState.editingEnclave);
              if (enclave) {
                setEditingEnclave(enclave);
              }
            }
          }
          
          localStorage.removeItem('treza_github_oauth_state');
        } catch (error) {
          console.error('Error parsing saved OAuth state:', error);
        }
      } else {
        setFormData({
          ...formData,
          githubConnection: {
            isConnected: true,
            username: githubUser,
            selectedRepo: '',
            selectedBranch: 'main',
            accessToken: githubToken
          }
        });
      }
      
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } else if (githubError) {
      alert('GitHub connection failed: ' + githubError);
      localStorage.removeItem('treza_github_oauth_state');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [enclaves]);

  const handleCreate = async () => {
    if (!walletAddress || !formData.name || !formData.description || !formData.providerId) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/enclaves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          region: formData.region,
          providerId: formData.providerId,
          providerConfig: formData.providerConfig,
          walletAddress: walletAddress,
          ...(formData.githubConnection.selectedRepo.trim() && {
            githubConnection: {
              isConnected: true,
              username: formData.githubConnection.username.trim(),
              selectedRepo: formData.githubConnection.selectedRepo.trim(),
              selectedBranch: formData.githubConnection.selectedBranch.trim() || 'main',
              ...(formData.githubConnection.accessToken?.trim() && { accessToken: formData.githubConnection.accessToken.trim() })
            }
          })
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setEnclaves([...enclaves, data.enclave]);
        setIsModalOpen(false);
        resetForm();
      } else {
        console.error('Error creating enclave:', data.error);
        alert('Error creating enclave: ' + (data.details ? data.details.join(', ') : data.error));
      }
    } catch (error) {
      console.error('Error creating enclave:', error);
      alert('Error creating enclave');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (enclave: EnclaveWithProvider) => {
    setEditingEnclave(enclave);
    setFormData({
      name: enclave.name,
      description: enclave.description,
      providerId: enclave.providerId || '',
      providerConfig: enclave.providerConfig || {},
      region: enclave.region,
      githubConnection: {
        isConnected: !!enclave.githubConnection,
        username: enclave.githubConnection?.username || '',
        selectedRepo: enclave.githubConnection?.selectedRepo || '',
        selectedBranch: enclave.githubConnection?.selectedBranch || 'main',
        accessToken: enclave.githubConnection?.accessToken || ''
      }
    });
    setIsModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingEnclave || !walletAddress) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/enclaves', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingEnclave.id,
          name: formData.name,
          description: formData.description,
          region: formData.region,
          providerId: formData.providerId,
          providerConfig: formData.providerConfig,
          walletAddress: walletAddress,
          ...(formData.githubConnection.selectedRepo.trim() && {
            githubConnection: {
              isConnected: true,
              username: formData.githubConnection.username.trim(),
              selectedRepo: formData.githubConnection.selectedRepo.trim(),
              selectedBranch: formData.githubConnection.selectedBranch.trim() || 'main',
              ...(formData.githubConnection.accessToken?.trim() && { accessToken: formData.githubConnection.accessToken.trim() })
            }
          })
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setEnclaves(enclaves.map(e => 
          e.id === editingEnclave.id ? data.enclave : e
        ));
        setIsModalOpen(false);
        setEditingEnclave(null);
        resetForm();
      } else {
        console.error('Error updating enclave:', data.error);
        alert('Error updating enclave: ' + (data.details ? data.details.join(', ') : data.error));
      }
    } catch (error) {
      console.error('Error updating enclave:', error);
      alert('Error updating enclave');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this enclave?') || !walletAddress) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/enclaves?id=${id}&wallet=${encodeURIComponent(walletAddress)}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (response.ok) {
        setEnclaves(enclaves.filter(e => e.id !== id));
      } else {
        console.error('Error deleting enclave:', data.error);
        alert('Error deleting enclave: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting enclave:', error);
      alert('Error deleting enclave');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLifecycleAction = async (id: string, action: 'pause' | 'resume' | 'terminate') => {
    const actionVerbs = {
      pause: 'pause',
      resume: 'resume', 
      terminate: 'terminate'
    };
    
    const confirmMessage = action === 'terminate' 
      ? 'Are you sure you want to terminate this enclave? This will destroy the AWS resources.'
      : `Are you sure you want to ${actionVerbs[action]} this enclave?`;
    
    if (!confirm(confirmMessage) || !walletAddress) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/enclaves/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          walletAddress
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Update the enclave status in the local state
        setEnclaves(enclaves.map(e => 
          e.id === id ? { ...e, status: data.enclave.status } : e
        ));
        
        // Refresh the enclaves list after a short delay to get updated status
        setTimeout(() => {
          fetchEnclaves();
        }, 2000);
      } else {
        console.error(`Error ${action}ing enclave:`, data.error);
        alert(`Error ${action}ing enclave: ` + data.error);
      }
    } catch (error) {
      console.error(`Error ${action}ing enclave:`, error);
      alert(`Error ${action}ing enclave`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      providerId: '',
      providerConfig: {},
      region: '',
      githubConnection: {
        isConnected: false,
        username: '',
        selectedRepo: '',
        selectedBranch: 'main',
        accessToken: ''
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500';
      case 'INACTIVE': return 'bg-gray-500';
      case 'PENDING_DEPLOY': return 'bg-yellow-500';
      case 'PENDING_DESTROY': return 'bg-orange-500';
      case 'DEPLOYING': return 'bg-blue-500';
      case 'FAILED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatRegion = (region: string, providerId?: string) => {
    if (providerId) {
      const provider = getProvider(providerId);
      return provider?.getDisplayName(region) || region;
    }
    
    // Fallback for legacy enclaves
    const regionMap: { [key: string]: string } = {
      'us-east-1': 'US East',
      'us-west-2': 'US West',
      'eu-west-1': 'Europe',
      'ap-southeast-1': 'Asia Pacific'
    };
    return regionMap[region] || region;
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

  const getProviderName = (providerId?: string) => {
    if (!providerId) return 'Legacy';
    const provider = getProvider(providerId);
    return provider?.name || providerId;
  };

  if (isLoading && enclaves.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="text-gray-400 mt-2">Loading enclaves...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Secure Enclaves</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchEnclaves}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 text-gray-300 hover:text-white rounded-md transition-colors shadow-sm"
          >
            <svg className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => isProduction() ? setIsComingSoonModalOpen(true) : setIsModalOpen(true)}
            className="btn cursor-pointer bg-gradient-to-t from-indigo-600 to-indigo-500 text-white hover:from-indigo-700 hover:to-indigo-600 transition-colors"
          >
            Create Enclave
          </button>
        </div>
      </div>

      {/* Enclaves Table */}
      {enclaves.length > 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Provider</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {enclaves.map((enclave) => (
                <tr 
                  key={enclave.id} 
                  className="hover:bg-gray-700/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/platform/enclaves/${enclave.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-left">
                    <div className="text-sm font-medium text-white text-left">{enclave.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-300 max-w-xs truncate" title={enclave.description}>{enclave.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300">{getProviderName(enclave.providerId)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTableStatusColors(enclave.status)}`}>
                      {formatStatusText(enclave.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-left">
                    <div className="text-sm text-gray-300 text-left">{formatTimestamp(enclave.createdAt).date}</div>
                    {formatTimestamp(enclave.createdAt).time && (
                      <div className="text-xs text-gray-500 text-left">{formatTimestamp(enclave.createdAt).time}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                    <div className="flex items-center justify-start gap-1">
                      {/* Lifecycle Action Buttons */}
                      {enclave.status === 'DEPLOYED' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLifecycleAction(enclave.id, 'pause');
                          }}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md hover:bg-purple-500/20 transition-colors cursor-pointer"
                        >
                          Pause
                        </button>
                      )}
                      {enclave.status === 'PAUSED' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLifecycleAction(enclave.id, 'resume');
                          }}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 rounded-md hover:bg-green-500/20 transition-colors cursor-pointer"
                        >
                          Resume
                        </button>
                      )}
                      {['DEPLOYED', 'PAUSED', 'FAILED'].includes(enclave.status) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLifecycleAction(enclave.id, 'terminate');
                          }}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 rounded-md hover:bg-red-500/20 transition-colors cursor-pointer"
                        >
                          Terminate
                        </button>
                      )}
                      
                      {/* Standard Actions */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(enclave);
                        }}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-400 hover:text-white border border-gray-600 rounded-md hover:border-gray-500 transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      {['DESTROYED', 'FAILED'].includes(enclave.status) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(enclave.id);
                          }}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-400 hover:text-red-400 border border-gray-600 rounded-md hover:border-red-500/50 transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      )}
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 2.676-.732 5.016-2.297 6.834-4.397" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No enclaves yet</h3>
          <p className="text-gray-400 mb-6 max-w-sm mx-auto">
            Create your first secure enclave to start running AI agents in isolated environments.
          </p>
          <button
            onClick={() => isProduction() ? setIsComingSoonModalOpen(true) : setIsModalOpen(true)}
            className="btn cursor-pointer bg-gradient-to-t from-indigo-600 to-indigo-500 text-white hover:from-indigo-700 hover:to-indigo-600 transition-colors"
          >
            Create Your First Enclave
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4 text-left">
              {editingEnclave ? 'Edit Enclave' : 'Create New Enclave'}
            </h3>
            <div className="space-y-4 pb-20">
              <div>
                <label className="block text-left text-sm font-medium text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="form-input w-full"
                  placeholder="Enter enclave name"
                />
              </div>
              <div>
                <label className="block text-left text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="form-input w-full"
                  rows={3}
                  placeholder="Enter enclave description"
                />
              </div>

              {/* Provider Selection */}
              <ProviderSelector
                selectedProviderId={formData.providerId}
                onProviderChange={handleProviderChange}
                disabled={!!editingEnclave} // Don't allow provider changes when editing
              />

              {/* Region Selection */}
              {formData.providerId && (
                <div>
                  <label className="block text-left text-sm font-medium text-gray-300 mb-1">Region</label>
                  <select
                    value={formData.region}
                    onChange={(e) => setFormData({...formData, region: e.target.value})}
                    className="form-input w-full"
                  >
                    <option value="">Select a region...</option>
                    {(() => {
                      const provider = getProvider(formData.providerId);
                      return provider?.regions.map((region) => (
                        <option key={region} value={region}>
                          {provider.getDisplayName(region)}
                        </option>
                      )) || [];
                    })()}
                  </select>
                </div>
              )}

              {/* Provider Configuration */}
              {formData.providerId && (
                <ProviderConfigComponent
                  providerId={formData.providerId}
                  config={formData.providerConfig}
                  onConfigChange={handleProviderConfigChange}
                  disabled={isLoading}
                />
              )}

              {/* GitHub Connection Section - Hidden for now */}
              {false && (
              <div>
                <label className="block text-left text-sm font-medium text-gray-300 mb-1">GitHub Connection</label>
                {!formData.githubConnection.isConnected ? (
                  <button
                    onClick={handleGitHubConnect}
                    disabled={isConnectingGitHub}
                    className="w-full btn cursor-pointer bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 hover:border-gray-500 transition-colors flex items-center justify-center gap-2 text-left"
                  >
                    <img src="/images/github-mark-white.svg" alt="GitHub" className="w-5 h-5" />
                    {isConnectingGitHub ? 'Connecting...' : 'Connect GitHub'}
                  </button>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                    <div className="flex items-center gap-2">
                      <img src="/images/github-mark-white.svg" alt="GitHub" className="w-5 h-5" />
                      <span className="text-green-400 font-medium text-left">Connected as {formData.githubConnection.username}</span>
                    </div>
                    <button
                      onClick={() => setFormData({
                        ...formData,
                        githubConnection: {
                          isConnected: false,
                          username: '',
                          selectedRepo: '',
                          selectedBranch: 'main',
                          accessToken: ''
                        }
                      })}
                      className="text-gray-400 hover:text-white text-left"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
              )}

              {/* GitHub Repository and Branch selection - Hidden for now */}
              {false && formData.githubConnection.isConnected && (
                <>
                  <div className="relative">
                    <label className="block text-left text-sm font-medium text-gray-300 mb-1">
                      Selected Repository
                      {isLoadingRepos && <span className="text-xs text-gray-500 ml-2">(Loading...)</span>}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={repoSearchTerm || formData.githubConnection.selectedRepo}
                        onChange={(e) => {
                          setRepoSearchTerm(e.target.value);
                          setShowRepoDropdown(true);
                        }}
                        onFocus={() => {
                          setShowRepoDropdown(true);
                          if (!repositories.length && formData.githubConnection.accessToken) {
                            fetchRepositories(formData.githubConnection.accessToken);
                          }
                        }}
                        className="form-input w-full pr-10"
                        placeholder="Search repositories..."
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                    
                    {showRepoDropdown && repositories.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                        {repositories
                          .filter(repo => 
                            repo.fullName.toLowerCase().includes(repoSearchTerm.toLowerCase()) ||
                            repo.description?.toLowerCase().includes(repoSearchTerm.toLowerCase())
                          )
                          .slice(0, 10)
                          .map((repo) => (
                            <div
                              key={repo.id}
                              className="px-3 py-2 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0"
                              onClick={() => {
                                setFormData({
                                  ...formData, 
                                  githubConnection: {
                                    ...formData.githubConnection, 
                                    selectedRepo: repo.fullName,
                                    selectedBranch: repo.defaultBranch || 'main'
                                  }
                                });
                                setRepoSearchTerm('');
                                setShowRepoDropdown(false);
                                setBranches([]);
                                fetchBranches(formData.githubConnection.accessToken, repo.fullName);
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="text-left">
                                  <div className="text-sm font-medium text-white text-left">{repo.fullName}</div>
                                  {repo.description && (
                                    <div className="text-xs text-gray-400 truncate max-w-xs text-left">{repo.description}</div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {repo.private && (
                                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">Private</span>
                                  )}
                                  {repo.language && (
                                    <span className="text-xs text-gray-500">{repo.language}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                    
                    {showRepoDropdown && (
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowRepoDropdown(false)}
                      ></div>
                    )}
                  </div>
                  
                  {formData.githubConnection.selectedRepo && (
                    <div className="relative">
                      <label className="block text-left text-sm font-medium text-gray-300 mb-1">
                        Selected Branch
                        {isLoadingBranches && <span className="text-xs text-gray-500 ml-2">(Loading...)</span>}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={branchSearchTerm || formData.githubConnection.selectedBranch}
                          onChange={(e) => {
                            setBranchSearchTerm(e.target.value);
                            setShowBranchDropdown(true);
                          }}
                          onFocus={() => {
                            setShowBranchDropdown(true);
                            if (!branches.length && formData.githubConnection.accessToken && formData.githubConnection.selectedRepo) {
                              fetchBranches(formData.githubConnection.accessToken, formData.githubConnection.selectedRepo);
                            }
                          }}
                          className="form-input w-full pr-10"
                          placeholder="Search branches..."
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4-8-4m16 0v10l-8 4-8-4V7" />
                          </svg>
                        </div>
                      </div>
                      
                      {showBranchDropdown && branches.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-40 overflow-auto">
                          {branches
                            .filter(branch => 
                              branch.name.toLowerCase().includes(branchSearchTerm.toLowerCase())
                            )
                            .slice(0, 10)
                            .map((branch) => (
                              <div
                                key={branch.name}
                                className="px-3 py-2 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0"
                                onClick={() => {
                                  setFormData({
                                    ...formData, 
                                    githubConnection: {
                                      ...formData.githubConnection, 
                                      selectedBranch: branch.name
                                    }
                                  });
                                  setBranchSearchTerm('');
                                  setShowBranchDropdown(false);
                                }}
                              >
                                                               <div className="flex items-center justify-between">
                                 <div className="text-sm text-white text-left">{branch.name}</div>
                                 <div className="text-xs text-gray-500 text-left">{branch.commit.sha.substring(0, 7)}</div>
                               </div>
                              </div>
                            ))}
                        </div>
                      )}
                      
                      {showBranchDropdown && (
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setShowBranchDropdown(false)}
                        ></div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingEnclave(null);
                  resetForm();
                }}
                className="btn cursor-pointer flex-1 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white transition-colors rounded-lg px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={editingEnclave ? handleUpdate : handleCreate}
                className="btn cursor-pointer flex-1 bg-gradient-to-t from-indigo-600 to-indigo-500 text-white hover:from-indigo-700 hover:to-indigo-600 transition-colors"
                disabled={isLoading || !formData.name || !formData.description || !formData.providerId || !formData.region}
              >
                {isLoading ? 'Processing...' : (editingEnclave ? 'Update' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coming Soon Modal */}
      <ComingSoonModal
        isOpen={isComingSoonModalOpen}
        onClose={() => setIsComingSoonModalOpen(false)}
        featureName="Enclave Creation"
        description="We're currently preparing our infrastructure for public launch. Enclave creation will be available soon with enhanced security and monitoring capabilities."
      />
    </div>
  );
} 