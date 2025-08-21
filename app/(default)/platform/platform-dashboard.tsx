"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePrivy } from '@privy-io/react-auth';
import EmailConnection from "./components/email-connection";
import EnclavesSection from "./components/enclaves-section";
import TasksSection from "./components/tasks-section";
import ApiKeysSection from "./components/api-keys-section";

export default function PlatformDashboard() {
  const { authenticated, user } = usePrivy();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connectedUser, setConnectedUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'enclaves' | 'tasks' | 'api-keys'>('enclaves');

  // Get the actual user identifier for API calls
  const userIdentifier = authenticated && user?.email?.address ? user.email.address : null;
  
  // Update active tab based on URL parameters
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['tasks', 'api-keys'].includes(tab)) {
      setActiveTab(tab as 'enclaves' | 'tasks' | 'api-keys');
    } else {
      setActiveTab('enclaves');
    }
  }, [searchParams]);
  
  // Listen for navigation events from side panel (keep for backward compatibility)
  React.useEffect(() => {
    const handleNavigation = (event: CustomEvent) => {
      setActiveTab(event.detail);
    };
    
    window.addEventListener('navigate-to-tab', handleNavigation as EventListener);
    return () => window.removeEventListener('navigate-to-tab', handleNavigation as EventListener);
  }, []);

  const tabs = [
    { id: 'enclaves', label: 'Enclaves' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'api-keys', label: 'API Keys' },
  ];

  return (
    <div className="space-y-8">
              {/* Email Authentication */}
        <div className="relative rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
          <EmailConnection 
            connectedUser={connectedUser}
            setConnectedUser={setConnectedUser}
          />
        </div>

        {/* Main Content - Only show if user is authenticated */}
        {authenticated && userIdentifier && (
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex space-x-1 rounded-xl bg-gray-900/50 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'enclaves') {
                    router.push('/platform');
                  } else {
                    router.push(`/platform?tab=${tab.id}`);
                  }
                }}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-indigo-500/20 text-white border border-indigo-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="relative rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
            {activeTab === 'enclaves' && <EnclavesSection />}
            {activeTab === 'tasks' && <TasksSection />}
            {activeTab === 'api-keys' && <ApiKeysSection />}
          </div>
        </div>
      )}

              {/* Instructions when user not authenticated */}
        {!authenticated && (
          <div className="text-center py-12">
            <p className="text-gray-400">
              Sign in with your email to access the platform features
            </p>
          </div>
        )}
    </div>
  );
} 