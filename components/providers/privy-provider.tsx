"use client";

import { PrivyProvider } from '@privy-io/react-auth';
import { privyConfig } from '@/lib/privy-config';

interface PrivyWrapperProps {
  children: React.ReactNode;
}

export default function PrivyWrapper({ children }: PrivyWrapperProps) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    console.warn('NEXT_PUBLIC_PRIVY_APP_ID is not set - wallet connection will be unavailable');
    return (
      <div>
        {children}
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={privyConfig}
    >
      {children}
    </PrivyProvider>
  );
} 