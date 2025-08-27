'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowLeftIcon, PlayIcon, PauseIcon, TrashIcon, EyeIcon, DocumentTextIcon, ShieldCheckIcon, CpuChipIcon, CloudIcon } from '@heroicons/react/24/outline';
import { getDetailsStatusColors, formatStatusText } from '@/lib/status-colors';

interface Enclave {
  id: string;
  name: string;
  description: string;
  status: string;
  region: string;
  walletAddress: string;
  createdAt: string;
  updatedAt: string;
  providerId: string;
  providerConfig: { [key: string]: any };
  githubConnection?: {
    isConnected: boolean;
    username: string;
    selectedRepo?: string;
    selectedBranch?: string;
  };
}

interface LogEntry {
  timestamp: number;
  message: string;
  stream?: string;
  source: string;
  function?: string;
  type?: string;
}

interface EnclaveLogs {
  enclave_id: string;
  enclave_name: string;
  enclave_status: string;
  logs: {
    ecs?: LogEntry[];
    stepfunctions?: LogEntry[];
    lambda?: LogEntry[];
    application?: LogEntry[];
    errors?: LogEntry[];
  };
}

interface AttestationDocument {
  moduleId: string;
  digest: string;
  timestamp: number;
  pcrs: {
    0: string; // Enclave image file
    1: string; // Linux kernel hash
    2: string; // Application hash
    8: string; // Signing certificate hash
  };
  certificate: string;
  cabundle: string[];
  publicKey?: string;
  userData?: string;
  nonce?: string;
}

interface AttestationVerification {
  isValid: boolean;
  trustLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  verificationStatus: 'VERIFIED' | 'PENDING' | 'FAILED';
  integrityScore: number;
  lastVerified: string;
  errors?: string[];
}

interface AttestationData {
  enclaveId: string;
  attestationDocument: AttestationDocument;
  verification: AttestationVerification;
  endpoints: {
    verificationUrl: string;
    apiEndpoint: string;
    webhookUrl: string;
  };
  useCases: {
    financial: boolean;
    healthcare: boolean;
    enterprise: boolean;
  };
}

export default function EnclaveDetailPage() {
  const params = useParams();
  const router = useRouter();
  const enclaveId = params.id as string;
  
  const [enclave, setEnclave] = useState<Enclave | null>(null);
  const [logs, setLogs] = useState<EnclaveLogs | null>(null);
  const [attestation, setAttestation] = useState<AttestationData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'attestation'>('overview');
  const [logType, setLogType] = useState<'all' | 'ecs' | 'stepfunctions' | 'lambda' | 'application' | 'errors'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isLoadingAttestation, setIsLoadingAttestation] = useState(false);

  useEffect(() => {
    fetchEnclaveDetails();
    fetchLogs();
  }, [enclaveId]);

  // Auto-switch to errors tab if enclave has failed
  useEffect(() => {
    if (enclave && enclave.status === 'FAILED' && logType === 'all') {
      setLogType('errors');
    }
  }, [enclave, logType]);

  useEffect(() => {
    fetchLogs();
  }, [logType]);

  // Fetch attestation data when switching to attestation tab
  useEffect(() => {
    if (activeTab === 'attestation' && enclave && enclave.status === 'DEPLOYED' && !attestation) {
      fetchAttestation();
    }
  }, [activeTab, enclave?.status]);

  // Auto-refresh logs every 10 seconds if enclave is in transitional state
  // Also auto-refresh for newly deployed enclaves to catch logs as they come in
  useEffect(() => {
    if (enclave && (['DEPLOYING', 'DESTROYING', 'PENDING_DESTROY', 'PAUSING', 'RESUMING'].includes(enclave.status) ||
        (enclave.status === 'DEPLOYED' && isRecentlyDeployed(enclave.createdAt)))) {
      // More frequent refresh for real-time experience during deployment
      const refreshInterval = enclave.status === 'DEPLOYING' ? 5000 : 10000; // 5s during deployment, 10s otherwise
      
      const interval = setInterval(() => {
        fetchEnclaveDetails();
        fetchLogs();
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [enclave?.status, enclave?.createdAt]);

  // Additional real-time refresh when on logs tab during deployment
  useEffect(() => {
    if (activeTab === 'logs' && enclave && enclave.status === 'DEPLOYING') {
      const logsInterval = setInterval(() => {
        fetchLogs();
      }, 3000); // Very frequent refresh for logs during deployment
      return () => clearInterval(logsInterval);
    }
  }, [activeTab, enclave?.status]);

  // Helper function to check if enclave was deployed recently (within 10 minutes)
  const isRecentlyDeployed = (createdAt: string) => {
    const deployTime = new Date(createdAt).getTime();
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    return (now - deployTime) < tenMinutes;
  };

  const fetchEnclaveDetails = async () => {
    try {
      const response = await fetch(`/api/enclaves/${enclaveId}`);
      const data = await response.json();
      
      if (response.ok) {
        setEnclave(data.enclave);
      } else {
        console.error('Error fetching enclave:', data.error);
      }
    } catch (error) {
      console.error('Error fetching enclave:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setIsLoadingLogs(true);
      
      // Start the API call and a minimum loading time in parallel
      const [response] = await Promise.all([
        fetch(`/api/enclaves/${enclaveId}/logs?type=${logType}&limit=100`),
        new Promise(resolve => setTimeout(resolve, 600)) // Minimum 600ms loading time
      ]);
      
      const data = await response.json();
      
      if (response.ok) {
        setLogs(data);
      } else {
        console.error('Error fetching logs:', data.error);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const fetchAttestation = async () => {
    try {
      setIsLoadingAttestation(true);
      
      const response = await fetch(`/api/enclaves/${enclaveId}/attestation`);
      const data = await response.json();
      
      if (response.ok) {
        setAttestation(data);
      } else {
        console.error('Error fetching attestation:', data.error);
      }
    } catch (error) {
      console.error('Error fetching attestation:', error);
    } finally {
      setIsLoadingAttestation(false);
    }
  };

  const handleLifecycleAction = async (action: 'pause' | 'resume' | 'terminate') => {
    if (!enclave) return;
    
    const confirmMessage = action === 'terminate' 
      ? 'Are you sure you want to terminate this enclave? This will destroy the AWS resources.'
      : `Are you sure you want to ${action} this enclave?`;
    
    if (!confirm(confirmMessage)) return;

    try {
      setIsUpdating(true);
      const response = await fetch(`/api/enclaves/${enclaveId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          walletAddress: enclave.walletAddress
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setEnclave({ ...enclave, status: data.enclave.status });
        // Refresh logs after action
        setTimeout(fetchLogs, 2000);
      } else {
        console.error(`Error ${action}ing enclave:`, data.error);
        alert(`Error ${action}ing enclave: ` + data.error);
      }
    } catch (error) {
      console.error(`Error ${action}ing enclave:`, error);
      alert(`Error ${action}ing enclave`);
    } finally {
      setIsUpdating(false);
    }
  };



  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatLogMessage = (message: string) => {
    // Basic formatting for log messages
    return message.replace(/===/g, '').trim();
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-8">
            {/* Animated enclave icon */}
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="absolute inset-0 border-4 border-indigo-600 rounded-lg animate-pulse"></div>
              <div className="absolute inset-2 border-2 border-indigo-400 rounded opacity-60 animate-ping"></div>
              <ShieldCheckIcon className="w-8 h-8 text-indigo-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>
          
          {/* Loading spinner */}
          <div className="flex items-center justify-center mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
          </div>
          
          {/* Loading text */}
          <h2 className="text-xl font-semibold text-gray-100 mb-2">Loading Enclave Details</h2>
          <p className="text-gray-400 max-w-sm mx-auto">
            Fetching enclave configuration, status, and logs...
          </p>
          
          {/* Loading steps animation */}
          <div className="mt-8 space-y-2">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!enclave) {
    return (
      <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 relative">
            <div className="absolute inset-0 border-4 border-red-600 rounded-lg"></div>
            <div className="absolute inset-4 bg-red-600/20 rounded"></div>
            <div className="text-2xl absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">⚠️</div>
          </div>
          
          <h2 className="text-xl font-semibold text-gray-100 mb-2">Enclave Not Found</h2>
          <p className="text-gray-400 max-w-sm mx-auto mb-6">
            The enclave you're looking for doesn't exist or may have been deleted.
          </p>
          
          <button
            onClick={() => router.push('/platform')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Platform
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/platform')}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold">{enclave.name}</h1>
                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium border rounded ${getDetailsStatusColors(enclave.status)}`}>
                  {formatStatusText(enclave.status)}
                </span>
              </div>
              <p className="text-gray-400">{enclave.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Action Buttons */}
            {enclave.status === 'DEPLOYED' && (
              <button
                onClick={() => handleLifecycleAction('pause')}
                disabled={isUpdating}
                className="inline-flex items-center px-4 py-2 text-sm font-medium bg-purple-500/10 text-white border border-purple-500/20 rounded-md hover:bg-purple-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PauseIcon className="w-4 h-4 mr-2" />
                Pause
              </button>
            )}
            {enclave.status === 'PAUSED' && (
              <button
                onClick={() => handleLifecycleAction('resume')}
                disabled={isUpdating}
                className="inline-flex items-center px-4 py-2 text-sm font-medium bg-green-500/10 text-white border border-green-500/20 rounded-md hover:bg-green-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlayIcon className="w-4 h-4 mr-2" />
                Resume
              </button>
            )}
            {['DEPLOYED', 'PAUSED', 'FAILED'].includes(enclave.status) && (
              <button
                onClick={() => handleLifecycleAction('terminate')}
                disabled={isUpdating}
                className="inline-flex items-center px-4 py-2 text-sm font-medium bg-red-500/10 text-white border border-red-500/20 rounded-md hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TrashIcon className="w-4 h-4 mr-2" />
                Terminate
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 mb-6">
          <nav className="flex gap-8">
            {[
              { id: 'overview', label: 'Overview', icon: EyeIcon },
              { id: 'logs', label: 'Logs', icon: DocumentTextIcon },
              { id: 'attestation', label: 'Attestation', icon: ShieldCheckIcon }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Status and Quick Info Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-100">Status</h3>
                  <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <CloudIcon className="w-5 h-5 text-indigo-400" />
                  </div>
                </div>
                <div className={`inline-flex items-center px-3 py-2 rounded-lg font-medium ${getDetailsStatusColors(enclave.status)}`}>
                  {formatStatusText(enclave.status)}
                </div>
                <p className="text-sm text-gray-400 mt-3">
                  {enclave.status === 'DEPLOYED' ? 'Enclave is running and accessible' :
                   enclave.status === 'DEPLOYING' ? 'Infrastructure is being provisioned' :
                   enclave.status === 'FAILED' ? 'Deployment encountered an error' :
                   enclave.status === 'PAUSED' ? 'Enclave is temporarily stopped' :
                   'Current enclave state'}
                </p>
                <button
                  onClick={() => setActiveTab('logs')}
                  className="inline-flex items-center gap-2 mt-4 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <DocumentTextIcon className="w-4 h-4" />
                  View Logs
                </button>
              </div>

              <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-100">Location</h3>
                  <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-400">Region</p>
                    <p className="font-semibold text-white">{enclave.region}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Provider</p>
                    <p className="font-semibold text-white uppercase">{enclave.providerId.replace('-', ' ')}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-100">Timeline</h3>
                  <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-400">Created</p>
                    <p className="font-semibold text-white">{new Date(enclave.createdAt).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-500">{new Date(enclave.createdAt).toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-100">Basic Information</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Enclave ID</p>
                      <p className="font-mono text-sm text-gray-300 bg-gray-900/50 px-2 py-1 rounded border">{enclave.id}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Description</p>
                    <p className="text-gray-300">{enclave.description || 'No description provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Last Updated</p>
                    <p className="text-gray-300">{new Date(enclave.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Infrastructure Configuration */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <CpuChipIcon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-100">Infrastructure</h3>
                </div>
                <div className="space-y-4">
                  {Object.entries(enclave.providerConfig || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center py-2 border-b border-gray-700/30 last:border-b-0">
                      <p className="text-sm text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                      <p className="font-mono text-sm text-gray-300 bg-gray-900/50 px-2 py-1 rounded">
                        {String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* GitHub Connection */}
            {enclave.githubConnection && (
              <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-100">GitHub Connection</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Username</p>
                    <p className="font-semibold text-white">{enclave.githubConnection.username}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Repository</p>
                    <p className="font-semibold text-white">{enclave.githubConnection.selectedRepo || 'Not selected'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Branch</p>
                    <p className="font-semibold text-white">{enclave.githubConnection.selectedBranch || 'Not selected'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-6">
            {/* Log Type Filter */}
            <div className="flex justify-between items-center">
              <div className="flex gap-4">
                {[
                  { id: 'all', label: 'All Logs' },
                  { id: 'errors', label: 'Errors' },
                  { id: 'ecs', label: 'Infrastructure (ECS)' },
                  { id: 'stepfunctions', label: 'Workflows' },
                  { id: 'lambda', label: 'Functions' },
                  { id: 'application', label: 'Application' }
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setLogType(type.id as any)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      logType === type.id
                        ? 'bg-indigo-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center gap-3">
                {enclave && (['DEPLOYING', 'DESTROYING', 'PAUSING', 'RESUMING'].includes(enclave.status) ||
                  (enclave.status === 'DEPLOYED' && isRecentlyDeployed(enclave.createdAt))) && (
                  <div className="flex items-center gap-2 text-xs text-indigo-400">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
                    <span className="font-medium">
                      {enclave.status === 'DEPLOYING' ? 'Real-time logs' : 'Auto-refreshing'}
                    </span>
                  </div>
                )}

                <button
                  onClick={fetchLogs}
                  disabled={isLoadingLogs}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 text-gray-300 hover:text-white rounded-md transition-colors shadow-sm"
                >
                  <svg className={`w-4 h-4 mr-2 ${isLoadingLogs ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {isLoadingLogs ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Logs Display */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="h-auto overflow-y-auto">
                {logs && (() => {
                  // Filter and combine logs based on selected log type
                  const allLogs: LogEntry[] = [];
                  
                  if (logType === 'all') {
                    // Include all log types
                    Object.entries(logs.logs).forEach(([source, logEntries]) => {
                      if (logEntries && Array.isArray(logEntries)) {
                        allLogs.push(...logEntries);
                      }
                    });
                  } else {
                    // Include only selected log type
                    const selectedLogs = logs.logs[logType];
                    if (selectedLogs && Array.isArray(selectedLogs)) {
                      allLogs.push(...selectedLogs);
                    }
                  }
                  
                  // Sort all logs by timestamp (most recent first)
                  allLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                  
                  if (allLogs.length === 0) return null;

                  return (
                    <table className="w-full">
                      <thead className="bg-gray-700 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-48">
                            Timestamp
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-24">
                            Source
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Message
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-gray-800 divide-y divide-gray-700">
                        {allLogs.map((log: LogEntry, index: number) => (
                          <tr key={`${log.source}-${index}`} className="hover:bg-gray-700/50 transition-colors">
                            <td className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">
                              {formatTimestamp(log.timestamp)}
                            </td>
                            <td className={`px-4 py-3 text-xs font-medium whitespace-nowrap ${
                              log.source === 'ecs' ? 'text-indigo-400' :
                              log.source === 'lambda' ? 'text-green-400' :
                              log.source === 'stepfunctions' ? 'text-purple-400' :
                              log.source === 'application' ? 'text-orange-400' :
                              log.source === 'dynamodb' ? 'text-red-400' :
                              log.type === 'error' ? 'text-red-400' :
                              'text-gray-400'
                            }`}>
                              {log.source}
                            </td>
                            <td className={`px-4 py-3 text-xs font-mono break-words ${
                              // Enhanced highlighting for different log types
                              (log as any).isPCR ? 'text-green-300 bg-green-900/20 border-l-2 border-green-500' :
                              (log as any).isSuccess ? 'text-blue-300 bg-blue-900/20 border-l-2 border-blue-500' :
                              (log as any).isError ? 'text-red-300 bg-red-900/20 border-l-2 border-red-500' :

                              log.message.includes('Enclave started') ? 'text-emerald-300 bg-emerald-900/20 border-l-2 border-emerald-500' :
                              'text-gray-300'
                            }`}>
                              {/* Enhanced message formatting */}
                              {(() => {
                                const message = formatLogMessage(log.message);
                                
                                // Highlight PCR values with clean styling
                                if ((log as any).isPCR) {
                                  return (
                                    <div className="font-mono text-xs text-green-200 break-all bg-green-900/20 p-2 rounded">
                                      {message}
                                    </div>
                                  );
                                }
                                
                                // Highlight success messages
                                if ((log as any).isSuccess) {
                                  return (
                                    <div className="flex items-start gap-2">
                                      <span className="text-blue-400">✅</span>
                                      <span>{message}</span>
                                    </div>
                                  );
                                }
                                
                                // Highlight vsocket proxy start
                                if (message.includes('vsocket proxy started')) {
                                  return (
                                    <div className="flex items-start gap-2">
                                      <span className="text-purple-400">🔌</span>
                                      <span><strong>vsocket Communication Started:</strong> {message.replace('vsocket proxy started for ', '')}</span>
                                    </div>
                                  );
                                }
                                
                                // Highlight enclave start
                                if (message.includes('Enclave started')) {
                                  return (
                                    <div className="flex items-start gap-2">
                                      <span className="text-emerald-400">🚀</span>
                                      <span><strong>Secure Enclave Launched:</strong> {message}</span>
                                    </div>
                                  );
                                }
                                
                                return message;
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
                {isLoadingLogs && (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center gap-3 text-indigo-400">
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Loading logs...</span>
                    </div>
                  </div>
                )}
                {!isLoadingLogs && (!logs || Object.values(logs.logs).every(arr => !arr || arr.length === 0)) && (
                  <div className="text-center py-8 space-y-3">
                    <div className="text-gray-400">
                      {logType === 'application' ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-center gap-3 mb-4">
                            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                            <div className="text-gray-400 font-medium">No application logs found</div>
                          </div>
                          <div className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
                            This enclave hasn't produced any application logs yet. This is normal for some containers 
                            or if the application hasn't started logging.
                          </div>
                          <div className="text-xs text-gray-500 mt-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/30 max-w-md mx-auto">
                            <strong className="text-gray-400">Tip:</strong> Try checking "All Logs" for stdout/stderr output, 
                            or refresh the page if the enclave was recently deployed.
                          </div>
                        </div>
                      ) : (
                        'No logs found for this enclave'
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attestation' && (
          <div className="space-y-6">
            {/* PCR Measurements */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-100">Platform Configuration Registers (PCRs)</h3>
                </div>
                {enclave?.status === 'DEPLOYED' && (
                  <button
                    onClick={fetchAttestation}
                    disabled={isLoadingAttestation}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:opacity-50 text-white rounded-md transition-colors"
                  >
                    <svg className={`w-4 h-4 mr-2 ${isLoadingAttestation ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {isLoadingAttestation ? 'Refreshing...' : 'Refresh PCRs'}
                  </button>
                )}
              </div>
              
              {enclave?.status !== 'DEPLOYED' ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-16 h-16 mx-auto mb-4 p-4 bg-yellow-500/10 rounded-full">
                    <ShieldCheckIcon className="w-full h-full text-yellow-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-300">PCRs Not Available</h4>
                  <p className="text-gray-400 max-w-md mx-auto">
                    Platform Configuration Registers are only available for deployed enclaves. Current status: <span className="font-semibold">{enclave?.status}</span>
                  </p>
                </div>
              ) : isLoadingAttestation ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center gap-3 text-indigo-400">
                    <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-lg">Loading PCR Values...</span>
                  </div>
                  <p className="text-gray-400 mt-2">Fetching platform configuration registers from enclave logs</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-gray-400 mb-4">
                    PCRs provide cryptographic proof of enclave integrity. These values are generated by the AWS Nitro Secure Module.
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { id: '0', name: 'Enclave Image', description: 'Hash of the enclave image file (EIF)' },
                      { id: '1', name: 'Linux Kernel', description: 'Kernel and bootstrap code hash' },
                      { id: '2', name: 'Application', description: 'Your application code hash' }
                    ].map(pcr => (
                      <div key={pcr.id} className="p-4 bg-gray-900/50 rounded-lg border border-gray-700/30">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-indigo-400 font-mono text-sm">PCR{pcr.id}</span>
                          <span className="text-gray-100 font-medium">{pcr.name}</span>
                        </div>
                        <p className="text-xs text-gray-400 mb-3">{pcr.description}</p>
                        <div className="text-xs font-mono bg-gray-800 px-2 py-1 rounded break-all">
                          {attestation?.attestationDocument.pcrs[parseInt(pcr.id) as 0 | 1 | 2] ? (
                            <span className="text-green-400">
                              {attestation.attestationDocument.pcrs[parseInt(pcr.id) as 0 | 1 | 2]}
                            </span>
                          ) : (
                            <span className="text-gray-500">Available after enclave deployment</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* API Integration Section */}
            {attestation && (
              <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-100">API Integration</h4>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Verification Endpoint</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-gray-900 px-3 py-2 rounded text-sm text-green-400 font-mono">
                        {attestation.endpoints.verificationUrl}
                      </code>
                      <button 
                        onClick={() => navigator.clipboard.writeText(attestation.endpoints.verificationUrl)}
                        className="p-2 hover:bg-gray-700 rounded transition-colors"
                        title="Copy to clipboard"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">JavaScript Example</label>
                    <div className="bg-gray-900 p-3 rounded text-sm">
                      <code className="text-gray-300 font-mono">
                        <span className="text-blue-400">const</span> <span className="text-white">response</span> = <span className="text-blue-400">await</span> <span className="text-yellow-400">fetch</span>(<br/>
                        &nbsp;&nbsp;<span className="text-green-400">'{attestation.endpoints.apiEndpoint}'</span><br/>
                        );<br/>
                        <span className="text-blue-400">const</span> <span className="text-white">attestation</span> = <span className="text-blue-400">await</span> <span className="text-white">response</span>.<span className="text-yellow-400">json</span>();
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}


      </div>
    </div>
  );
}
