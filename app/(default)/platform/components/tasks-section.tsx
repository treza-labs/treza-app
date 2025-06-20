"use client";

import { useState, useEffect } from "react";
import { usePrivy } from '@privy-io/react-auth';

interface Task {
  id: string;
  name: string;
  description: string;
  enclave: string;
  enclaveId: string;
  status: 'running' | 'stopped' | 'failed' | 'pending';
  schedule: string;
  createdAt: string;
  lastRun?: string;
  walletAddress: string;
  updatedAt: string;
}

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

export default function TasksSection() {
  const { user } = usePrivy();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [enclaves, setEnclaves] = useState<Enclave[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    enclave: '',
    schedule: '*/15 * * * *'
  });

  const walletAddress = user?.email?.address || '';

  const scheduleOptions = [
    { value: '*/15 * * * *', label: 'Every 15 minutes' },
    { value: '*/30 * * * *', label: 'Every 30 minutes' },
    { value: '0 */1 * * *', label: 'Every hour' },
    { value: '0 */6 * * *', label: 'Every 6 hours' },
    { value: '0 0 * * *', label: 'Daily' },
    { value: '0 0 * * 1', label: 'Weekly' }
  ];

  // Fetch enclaves from API
  const fetchEnclaves = async () => {
    if (!walletAddress) return;
    
    try {
      const response = await fetch(`/api/enclaves?wallet=${encodeURIComponent(walletAddress)}`);
      const data = await response.json();
      
      if (response.ok) {
        setEnclaves(data.enclaves || []);
        // Set default enclave if form is empty and enclaves exist
        if (!formData.enclave && data.enclaves && data.enclaves.length > 0) {
          setFormData(prev => ({ ...prev, enclave: data.enclaves[0].name }));
        }
      } else {
        console.error('Error fetching enclaves:', data.error);
      }
    } catch (error) {
      console.error('Error fetching enclaves:', error);
    }
  };

  // Fetch tasks from API
  const fetchTasks = async () => {
    if (!walletAddress) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/tasks?wallet=${encodeURIComponent(walletAddress)}`);
      const data = await response.json();
      
      if (response.ok) {
        const tasksWithEnclaveNames = (data.tasks || []).map((task: Task) => {
          // Find the enclave name by matching enclaveId
          const enclave = enclaves.find(enc => enc.id === task.enclaveId);
          return {
            ...task,
            enclave: enclave ? enclave.name : 'Unknown Enclave'
          };
        });
        setTasks(tasksWithEnclaveNames);
      } else {
        console.error('Error fetching tasks:', data.error);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load enclaves first, then tasks
  useEffect(() => {
    if (walletAddress) {
      fetchEnclaves();
    }
  }, [walletAddress]);

  // Fetch tasks after enclaves are loaded (or immediately if no enclaves exist)
  useEffect(() => {
    if (walletAddress) {
      // Small delay to allow enclaves to load first, then fetch tasks regardless
      const timer = setTimeout(() => {
        fetchTasks();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [walletAddress]);

  // Also fetch tasks when enclaves change (to update enclave names)
  useEffect(() => {
    if (walletAddress && enclaves.length > 0 && tasks.length > 0) {
      fetchTasks();
    }
  }, [enclaves]);

  const handleCreate = async () => {
    if (!walletAddress || !formData.name || !formData.description || !formData.enclave) return;

    // Find the selected enclave to get its ID
    const selectedEnclave = enclaves.find(enc => enc.name === formData.enclave);
    if (!selectedEnclave) {
      alert('Please select a valid enclave');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          enclaveId: selectedEnclave.id,
          schedule: formData.schedule,
          walletAddress: walletAddress
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setTasks([...tasks, { ...data.task, enclave: formData.enclave }]);
        setIsModalOpen(false);
        setFormData({ name: '', description: '', enclave: enclaves.length > 0 ? enclaves[0].name : '', schedule: '*/15 * * * *' });
      } else {
        console.error('Error creating task:', data.error);
        alert('Error creating task: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Error creating task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      name: task.name,
      description: task.description,
      enclave: task.enclave,
      schedule: task.schedule
    });
    setIsModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingTask || !walletAddress) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingTask.id,
          name: formData.name,
          description: formData.description,
          schedule: formData.schedule,
          walletAddress: walletAddress
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setTasks(tasks.map(t => 
          t.id === editingTask.id ? { ...data.task, enclave: formData.enclave } : t
        ));
        setIsModalOpen(false);
        setEditingTask(null);
        setFormData({ name: '', description: '', enclave: enclaves.length > 0 ? enclaves[0].name : '', schedule: '*/15 * * * *' });
      } else {
        console.error('Error updating task:', data.error);
        alert('Error updating task: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Error updating task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?') || !walletAddress) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/tasks?id=${id}&wallet=${encodeURIComponent(walletAddress)}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (response.ok) {
        setTasks(tasks.filter(t => t.id !== id));
      } else {
        console.error('Error deleting task:', data.error);
        alert('Error deleting task: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error deleting task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task || !walletAddress) return;

    const newStatus = task.status === 'running' ? 'stopped' : 'running';

    try {
      setIsLoading(true);
      const response = await fetch('/api/tasks', {
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
        setTasks(tasks.map(t => 
          t.id === id ? { ...data.task, enclave: t.enclave } : t
        ));
      } else {
        console.error('Error updating task status:', data.error);
        alert('Error updating task status: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Error updating task status');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'stopped': return 'bg-gray-500';
      case 'failed': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getScheduleLabel = (cron: string) => {
    const option = scheduleOptions.find(opt => opt.value === cron);
    return option ? option.label : cron;
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

  const formatLastRun = (timestamp: string) => {
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

  if (isLoading && tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="text-gray-400 mt-2">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Tasks</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn cursor-pointer bg-linear-to-t from-indigo-600 to-indigo-500 bg-[length:100%_100%] bg-[bottom] text-white shadow-[inset_0px_1px_0px_0px_--theme(--color-white/.16)] hover:bg-[length:100%_150%]"
        >
          Create Task
        </button>
      </div>

      {/* Tasks Table */}
      {tasks.length > 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-32">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-48">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-24">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-28">Enclave</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-32">Schedule</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-28">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-64">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-700/50">
                  <td className="px-4 py-4 whitespace-nowrap text-left">
                    <div className="text-sm font-medium text-white truncate text-left">{task.name}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-300 max-w-xs truncate" title={task.description}>{task.description}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      task.status === 'running' ? 'bg-green-500/10 text-green-400' :
                      task.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                      task.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                      'bg-gray-500/10 text-gray-400'
                    }`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300 truncate">{task.enclave}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300 truncate">{getScheduleLabel(task.schedule)}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-left">
                    <div className="text-sm text-gray-300 text-left">{formatTimestamp(task.createdAt).date}</div>
                    {formatTimestamp(task.createdAt).time && (
                      <div className="text-xs text-gray-500 text-left">{formatTimestamp(task.createdAt).time}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-left text-sm font-medium">
                    <div className="flex items-center justify-start gap-1 min-w-max">
                      <button
                        onClick={() => handleToggleStatus(task.id)}
                        className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                          task.status === 'running' 
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' 
                            : 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20'
                        }`}
                      >
                        {task.status === 'running' ? 'Stop' : 'Start'}
                      </button>
                      <button
                        onClick={() => handleEdit(task)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-400 hover:text-white border border-gray-600 rounded-md hover:border-gray-500 transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No tasks yet</h3>
          <p className="text-gray-400 mb-6 max-w-sm mx-auto">
            Create your first automated task to start running scheduled AI operations.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn cursor-pointer bg-linear-to-t from-indigo-600 to-indigo-500 bg-[length:100%_100%] bg-[bottom] text-white shadow-[inset_0px_1px_0px_0px_--theme(--color-white/.16)] hover:bg-[length:100%_150%]"
          >
            Create Your First Task
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </h3>
            
            {/* Warning banner when no enclaves available */}
            {enclaves.length === 0 && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-sm text-yellow-300 font-medium">No enclaves available</p>
                    <p className="text-xs text-yellow-400 mt-1">Please create at least one enclave before creating tasks. Switch to the Enclaves tab to get started.</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-left text-sm font-medium text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="form-input w-full"
                  placeholder="Enter task name"
                />
              </div>
              <div>
                <label className="block text-left text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="form-input w-full"
                  rows={3}
                  placeholder="Enter task description"
                />
              </div>
              <div>
                <label className="block text-left text-sm font-medium text-gray-300 mb-1">Enclave</label>
                <select
                  value={formData.enclave}
                  onChange={(e) => setFormData({...formData, enclave: e.target.value})}
                  className="form-input w-full"
                >
                  {enclaves.length > 0 ? (
                    enclaves.map((enclave) => (
                      <option key={enclave.id} value={enclave.name}>{enclave.name}</option>
                    ))
                  ) : (
                    <option value="">No enclaves available</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-left text-sm font-medium text-gray-300 mb-1">Schedule</label>
                <select
                  value={formData.schedule}
                  onChange={(e) => setFormData({...formData, schedule: e.target.value})}
                  className="form-input w-full"
                >
                  {scheduleOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingTask(null);
                  setFormData({ name: '', description: '', enclave: enclaves.length > 0 ? enclaves[0].name : '', schedule: '*/15 * * * *' });
                }}
                className="btn cursor-pointer flex-1 bg-linear-to-b from-gray-800 to-gray-800/60 bg-[length:100%_100%] bg-[bottom] text-gray-300 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-transparent before:[background:linear-gradient(to_right,var(--color-gray-800),var(--color-gray-700),var(--color-gray-800))_border-box] before:[mask-composite:exclude_!important] before:[mask:linear-gradient(white_0_0)_padding-box,_linear-gradient(white_0_0)] hover:bg-[length:100%_150%]"
              >
                Cancel
              </button>
              <button
                onClick={editingTask ? handleUpdate : handleCreate}
                disabled={!editingTask && enclaves.length === 0}
                className={`btn flex-1 ${
                  !editingTask && enclaves.length === 0
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'cursor-pointer bg-linear-to-t from-indigo-600 to-indigo-500 bg-[length:100%_100%] bg-[bottom] text-white shadow-[inset_0px_1px_0px_0px_--theme(--color-white/.16)] hover:bg-[length:100%_150%]'
                }`}
              >
                {editingTask ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 