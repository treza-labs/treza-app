export const privyConfig = {
  loginMethods: ['email' as const],
  appearance: {
    theme: 'dark' as const,
    accentColor: '#6366f1' as const,
    logo: '/images/treza-logo.svg',
  },
  embeddedWallets: {
    createOnLogin: 'users-without-wallets' as const,
  },
}; 