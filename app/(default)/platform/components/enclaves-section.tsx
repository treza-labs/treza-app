"use client";

import { useState, useEffect } from "react";
import { usePrivy } from '@privy-io/react-auth';

interface Enclave {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  region: string;
  walletAddress: string;
  updatedAt: string;
  githubConnection?: {
    isConnected: boolean;
    username: string;
    selectedRepo?: string;
    selectedBranch?: string;
    accessToken?: string;
  };
}

export default function EnclavesSection() {
  const { user } = usePrivy();
  const [enclaves, setEnclaves] = useState<Enclave[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEnclave, setEditingEnclave] = useState<Enclave | null>(null);
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
    region: 'us-east-1',
    githubConnection: {
      isConnected: false,
      username: '',
      selectedRepo: '',
      selectedBranch: 'main',
      accessToken: ''
    }
  });

  const walletAddress = user?.email?.address || '';

  // GitHub API functions
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

  // GitHub OAuth integration
  const handleGitHubConnect = async () => {
    setIsConnectingGitHub(true);
    try {
      // Store modal state in localStorage before redirect
      localStorage.setItem('treza_github_oauth_state', JSON.stringify({
        modalOpen: true,
        editingEnclave: editingEnclave ? editingEnclave.id : null,
        formData: formData
      }));

      // Get GitHub OAuth URL from our API with custom state
      const state = `enclave_modal_${Date.now()}`;
      const response = await fetch(`/api/github/auth?state=${state}`);
      const data = await response.json();
      
      if (response.ok) {
        // Redirect to GitHub OAuth
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
      const response = await fetch(`/api/enclaves?wallet=${encodeURIComponent(walletAddress)}`);
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

  // Handle GitHub OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const githubSuccess = urlParams.get('github_success');
    const githubUser = urlParams.get('github_user');
    const githubToken = urlParams.get('github_token');
    const githubError = urlParams.get('github_error');

    if (githubSuccess && githubUser && githubToken) {
      // Restore modal state from localStorage
      const savedState = localStorage.getItem('treza_github_oauth_state');
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          
          // Update form data with GitHub connection
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
           
           // Fetch repositories immediately after connection
           fetchRepositories(githubToken);
           
           // Restore modal state
           if (parsedState.modalOpen) {
             setIsModalOpen(true);
             
             // If editing an existing enclave, restore that state
             if (parsedState.editingEnclave) {
               const enclave = enclaves.find(e => e.id === parsedState.editingEnclave);
               if (enclave) {
                 setEditingEnclave(enclave);
               }
             }
           }
          
          // Clean up localStorage
          localStorage.removeItem('treza_github_oauth_state');
        } catch (error) {
          console.error('Error parsing saved OAuth state:', error);
        }
      } else {
        // Fallback if no saved state
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
      
      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } else if (githubError) {
      alert('GitHub connection failed: ' + githubError);
      // Clean up URL parameters and localStorage
      localStorage.removeItem('treza_github_oauth_state');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [enclaves]);

  const handleCreate = async () => {
    if (!walletAddress || !formData.name || !formData.description) return;

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
          setFormData({ name: '', description: '', region: 'us-east-1', githubConnection: { isConnected: false, username: '', selectedRepo: '', selectedBranch: 'main', accessToken: '' } });
      } else {
        console.error('Error creating enclave:', data.error);
        alert('Error creating enclave: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating enclave:', error);
      alert('Error creating enclave');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (enclave: Enclave) => {
    setEditingEnclave(enclave);
    setFormData({
      name: enclave.name,
      description: enclave.description,
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
        setFormData({ name: '', description: '', region: 'us-east-1', githubConnection: { isConnected: false, username: '', selectedRepo: '', selectedBranch: 'main', accessToken: '' } });
      } else {
        console.error('Error updating enclave:', data.error);
        alert('Error updating enclave: ' + data.error);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'inactive': return 'bg-gray-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const formatRegion = (region: string) => {
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
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn cursor-pointer bg-linear-to-t from-indigo-600 to-indigo-500 bg-[length:100%_100%] bg-[bottom] text-white shadow-[inset_0px_1px_0px_0px_--theme(--color-white/.16)] hover:bg-[length:100%_150%]"
        >
          Create Enclave
        </button>
      </div>

      {/* Enclaves Table */}
      {enclaves.length > 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Region</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">GitHub Repo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {enclaves.map((enclave) => (
                <tr key={enclave.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-left">
                    <div className="text-sm font-medium text-white text-left">{enclave.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-300 max-w-xs truncate" title={enclave.description}>{enclave.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      enclave.status === 'active' ? 'bg-green-500/10 text-green-400' :
                      enclave.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                      'bg-gray-500/10 text-gray-400'
                    }`}>
                      {enclave.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300">{formatRegion(enclave.region)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                                          {enclave.githubConnection ? (
                        <div className="flex items-center">
                          <img src="/images/github-mark-white.svg" alt="GitHub" className="w-4 h-4 mr-2" />
                        <div className="max-w-xs">
                                                     <div className="text-sm text-gray-300 truncate" title={enclave.githubConnection.selectedRepo}>
                             {enclave.githubConnection.selectedRepo?.replace(/^https?:\/\/(www\.)?github\.com\//, '') || 'Unknown'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {enclave.githubConnection.selectedBranch}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">-</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-left">
                    <div className="text-sm text-gray-300 text-left">{formatTimestamp(enclave.createdAt).date}</div>
                    {formatTimestamp(enclave.createdAt).time && (
                      <div className="text-xs text-gray-500 text-left">{formatTimestamp(enclave.createdAt).time}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                    <div className="flex items-center justify-start gap-2">
                      <button
                        onClick={() => handleEdit(enclave)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white border border-gray-600 rounded-md hover:border-gray-500 transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(enclave.id)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-red-400 border border-gray-600 rounded-md hover:border-red-500/50 transition-colors cursor-pointer"
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 2.676-.732 5.016-2.297 6.834-4.397" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No enclaves yet</h3>
          <p className="text-gray-400 mb-6 max-w-sm mx-auto">
            Create your first secure enclave to start running AI agents in isolated environments.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn cursor-pointer bg-linear-to-t from-indigo-600 to-indigo-500 bg-[length:100%_100%] bg-[bottom] text-white shadow-[inset_0px_1px_0px_0px_--theme(--color-white/.16)] hover:bg-[length:100%_150%]"
          >
            Create Your First Enclave
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingEnclave ? 'Edit Enclave' : 'Create New Enclave'}
            </h3>
            <div className="space-y-4">
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
              <div>
                <label className="block text-left text-sm font-medium text-gray-300 mb-1">Region</label>
                <select
                  value={formData.region}
                  onChange={(e) => setFormData({...formData, region: e.target.value})}
                  className="form-input w-full"
                >
                  <option value="us-east-1">US East (N. Virginia)</option>
                  <option value="us-west-2">US West (Oregon)</option>
                  <option value="eu-west-1">Europe (Ireland)</option>
                  <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                </select>
              </div>
                              <div>
                  <label className="block text-left text-sm font-medium text-gray-300 mb-1">GitHub Connection</label>
                  {!formData.githubConnection.isConnected ? (
                                          <button
                        onClick={handleGitHubConnect}
                        disabled={isConnectingGitHub}
                        className="w-full btn cursor-pointer bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 hover:border-gray-500 transition-colors flex items-center justify-center gap-2"
                      >
                        <img src="/images/github-mark-white.svg" alt="GitHub" className="w-5 h-5" />
                        {isConnectingGitHub ? 'Connecting...' : 'Connect GitHub'}
                      </button>
                  ) : (
                                          <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                        <div className="flex items-center gap-2">
                          <img src="/images/github-mark-white.svg" alt="GitHub" className="w-5 h-5" />
                          <span className="text-green-400 font-medium">Connected as {formData.githubConnection.username}</span>
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
                        className="text-gray-400 hover:text-white"
                      >
                        Disconnect
                      </button>
                    </div>
                  )}
                </div>
                              {formData.githubConnection.isConnected && (
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
                                  <div>
                                    <div className="text-sm font-medium text-white">{repo.fullName}</div>
                                    {repo.description && (
                                      <div className="text-xs text-gray-400 truncate max-w-xs">{repo.description}</div>
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
                      
                      {/* Click outside to close dropdown */}
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
                                    <div className="text-sm text-white">{branch.name}</div>
                                    <div className="text-xs text-gray-500">{branch.commit.sha.substring(0, 7)}</div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                        
                        {/* Click outside to close dropdown */}
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
                  setFormData({ name: '', description: '', region: 'us-east-1', githubConnection: { isConnected: false, username: '', selectedRepo: '', selectedBranch: 'main', accessToken: '' } });
                }}
                className="btn cursor-pointer flex-1 bg-linear-to-b from-gray-800 to-gray-800/60 bg-[length:100%_100%] bg-[bottom] text-gray-300 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-transparent before:[background:linear-gradient(to_right,var(--color-gray-800),var(--color-gray-700),var(--color-gray-800))_border-box] before:[mask-composite:exclude_!important] before:[mask:linear-gradient(white_0_0)_padding-box,_linear-gradient(white_0_0)] hover:bg-[length:100%_150%]"
              >
                Cancel
              </button>
              <button
                onClick={editingEnclave ? handleUpdate : handleCreate}
                className="btn cursor-pointer flex-1 bg-linear-to-t from-indigo-600 to-indigo-500 bg-[length:100%_100%] bg-[bottom] text-white shadow-[inset_0px_1px_0px_0px_--theme(--color-white/.16)] hover:bg-[length:100%_150%]"
              >
                {editingEnclave ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 