'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowLeftIcon, PlayIcon, PauseIcon, TrashIcon, EyeIcon, DocumentTextIcon, CpuChipIcon, CloudIcon } from '@heroicons/react/24/outline';

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

export default function EnclaveDetailPage() {
  const params = useParams();
  const router = useRouter();
  const enclaveId = params.id as string;
  
  const [enclave, setEnclave] = useState<Enclave | null>(null);
  const [logs, setLogs] = useState<EnclaveLogs | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'config'>('overview');
  const [logType, setLogType] = useState<'all' | 'ecs' | 'stepfunctions' | 'lambda' | 'application' | 'errors'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

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

  // Auto-refresh logs every 10 seconds if enclave is in transitional state
  useEffect(() => {
    if (enclave && ['DEPLOYING', 'DESTROYING', 'PAUSING', 'RESUMING'].includes(enclave.status)) {
      const interval = setInterval(() => {
        fetchEnclaveDetails();
        fetchLogs();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [enclave?.status]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DEPLOYED': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'DEPLOYING': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'FAILED': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'PENDING_DEPLOY': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'PENDING_DESTROY': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'DESTROYING': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'DESTROYED': return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
      case 'PAUSING': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'PAUSED': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'RESUMING': return 'text-green-400 bg-green-500/10 border-green-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading enclave details...</div>
      </div>
    );
  }

  if (!enclave) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Enclave not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
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
              <h1 className="text-2xl font-bold">{enclave.name}</h1>
              <p className="text-gray-400">{enclave.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-3 py-1 text-sm font-medium border rounded-md ${getStatusColor(enclave.status)}`}>
              {enclave.status}
            </span>
            
            {/* Action Buttons */}
            {enclave.status === 'DEPLOYED' && (
              <button
                onClick={() => handleLifecycleAction('pause')}
                disabled={isUpdating}
                className="inline-flex items-center px-3 py-2 text-sm font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md hover:bg-purple-500/20 transition-colors disabled:opacity-50"
              >
                <PauseIcon className="w-4 h-4 mr-2" />
                Pause
              </button>
            )}
            {enclave.status === 'PAUSED' && (
              <button
                onClick={() => handleLifecycleAction('resume')}
                disabled={isUpdating}
                className="inline-flex items-center px-3 py-2 text-sm font-medium bg-green-500/10 text-green-400 border border-green-500/20 rounded-md hover:bg-green-500/20 transition-colors disabled:opacity-50"
              >
                <PlayIcon className="w-4 h-4 mr-2" />
                Resume
              </button>
            )}
            {['DEPLOYED', 'PAUSED', 'FAILED'].includes(enclave.status) && (
              <button
                onClick={() => handleLifecycleAction('terminate')}
                disabled={isUpdating}
                className="inline-flex items-center px-3 py-2 text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 rounded-md hover:bg-red-500/20 transition-colors disabled:opacity-50"
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
              { id: 'config', label: 'Configuration', icon: CpuChipIcon }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CloudIcon className="w-5 h-5" />
                Basic Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400">Enclave ID</label>
                  <p className="font-mono text-sm">{enclave.id}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Status</label>
                  <p className={`inline-flex items-center px-2 py-1 text-xs font-medium border rounded ${getStatusColor(enclave.status)}`}>
                    {enclave.status}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Region</label>
                  <p>{enclave.region}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Provider</label>
                  <p>{enclave.providerId}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Created</label>
                  <p>{new Date(enclave.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Last Updated</label>
                  <p>{new Date(enclave.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Provider Config */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CpuChipIcon className="w-5 h-5" />
                Infrastructure Configuration
              </h3>
              <div className="space-y-3">
                {Object.entries(enclave.providerConfig || {}).map(([key, value]) => (
                  <div key={key}>
                    <label className="text-sm text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                    <p className="font-mono text-sm">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* GitHub Connection */}
            {enclave.githubConnection && (
              <div className="bg-gray-800 rounded-lg p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold mb-4">GitHub Connection</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">Username</label>
                    <p>{enclave.githubConnection.username}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Repository</label>
                    <p>{enclave.githubConnection.selectedRepo || 'Not selected'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Branch</label>
                    <p>{enclave.githubConnection.selectedBranch || 'Not selected'}</p>
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
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              
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

            {/* Logs Display */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="font-mono text-sm space-y-1 max-h-96 overflow-y-auto">
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
                  

                  
                  return allLogs.map((log: LogEntry, index: number) => (
                    <div key={`${log.source}-${index}`} className="flex gap-4 py-1 hover:bg-gray-700/50 rounded">
                      <span className="text-gray-400 text-xs w-32 flex-shrink-0">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      <span className={`text-xs w-16 flex-shrink-0 ${
                        log.source === 'ecs' ? 'text-blue-400' :
                        log.source === 'lambda' ? 'text-green-400' :
                        log.source === 'stepfunctions' ? 'text-purple-400' :
                        log.source === 'application' ? 'text-orange-400' :
                        log.source === 'dynamodb' ? 'text-red-400' :
                        log.type === 'error' ? 'text-red-400' :
                        'text-gray-400'
                      }`}>
                        {log.source}
                      </span>
                      <span className="text-gray-300 flex-1 break-words">
                        {formatLogMessage(log.message)}
                      </span>
                    </div>
                  ));
                })()}
                {(!logs || Object.values(logs.logs).every(arr => !arr || arr.length === 0)) && (
                  <div className="text-gray-400 text-center py-8">
                    No logs found for this enclave
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Raw Configuration</h3>
            <pre className="bg-gray-900 p-4 rounded text-sm overflow-x-auto">
              {JSON.stringify(enclave, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
