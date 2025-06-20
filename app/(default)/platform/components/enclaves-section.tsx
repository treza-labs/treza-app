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
}

export default function EnclavesSection() {
  const { user } = usePrivy();
  const [enclaves, setEnclaves] = useState<Enclave[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEnclave, setEditingEnclave] = useState<Enclave | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    region: 'us-east-1'
  });

  const walletAddress = user?.email?.address || '';

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
          walletAddress: walletAddress
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setEnclaves([...enclaves, data.enclave]);
        setIsModalOpen(false);
        setFormData({ name: '', description: '', region: 'us-east-1' });
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
      region: enclave.region
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
          walletAddress: walletAddress
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setEnclaves(enclaves.map(e => 
          e.id === editingEnclave.id ? data.enclave : e
        ));
        setIsModalOpen(false);
        setEditingEnclave(null);
        setFormData({ name: '', description: '', region: 'us-east-1' });
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
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingEnclave(null);
                  setFormData({ name: '', description: '', region: 'us-east-1' });
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