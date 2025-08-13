"use client";

import React from 'react';
import { usePrivy } from '@privy-io/react-auth';

interface EmailConnectionProps {
  connectedUser: string | null;
  setConnectedUser: (user: string | null) => void;
}

export default function EmailConnection({ connectedUser, setConnectedUser }: EmailConnectionProps) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  
  // If no Privy App ID, show fallback
  if (!appId) {
    return (
      <div className="text-center space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Email Authentication Setup Required</h3>
          <p className="text-gray-400">Add your NEXT_PUBLIC_PRIVY_APP_ID to .env.local to enable email authentication</p>
        </div>
        <div className="max-w-md mx-auto">
          <button
            disabled
            className="btn w-full bg-gray-600 text-gray-400 cursor-not-allowed"
          >
            Sign In with Email (Setup Required)
          </button>
        </div>
        <div className="text-xs text-gray-500 max-w-md mx-auto">
          <p>Get your Privy App ID from <a href="https://console.privy.io" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">console.privy.io</a></p>
        </div>
      </div>
    );
  }
  
  const { ready, authenticated, user, login, logout } = usePrivy();

  // Update parent component when authentication state changes
  React.useEffect(() => {
    if (authenticated && user) {
      if (user.email?.address) {
        setConnectedUser(user.email.address);
      }
    } else {
      setConnectedUser(null);
    }
  }, [authenticated, user, setConnectedUser]);

  if (!ready) {
    return (
      <div className="text-center py-6">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (authenticated && user) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-3 w-3 rounded-full bg-green-500"></div>
          <div>
            <h3 className="font-medium text-white">Email Authenticated</h3>
            <p className="text-sm text-gray-400">
              {user.email?.address || 'Connected'}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="btn-sm bg-gradient-to-b from-gray-800 to-gray-900 text-gray-300 hover:from-gray-700 hover:to-gray-800 transition-colors border border-gray-600 hover:border-gray-500"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="text-center space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Sign In with Email</h3>
        <p className="text-gray-400">Enter your email to access the Treza platform</p>
      </div>

      <div className="max-w-md mx-auto">
        <button
          onClick={login}
          className="btn cursor-pointer w-full bg-linear-to-t from-indigo-600 to-indigo-500 bg-[length:100%_100%] bg-[bottom] text-white shadow-[inset_0px_1px_0px_0px_--theme(--color-white/.16)] hover:bg-[length:100%_150%]"
        >
          Sign In with Email
        </button>
      </div>

      <div className="text-xs text-gray-500 max-w-md mx-auto">
        <p>We'll send you a secure link to authenticate your account</p>
      </div>
    </div>
  );
} 