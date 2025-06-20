# Wallet Connection Setup

To enable wallet connection for both Ethereum and Solana, you need to set up Privy.

## Quick Setup

1. **Get a Privy App ID:**
   - Go to [console.privy.io](https://console.privy.io)
   - Create an account or sign in
   - Create a new app
   - Copy your App ID

2. **Add to Environment Variables:**
   - Create a `.env.local` file in the project root
   - Add your Privy App ID:
   ```
   NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id-here
   ```

3. **Restart the Development Server:**
   ```bash
   source ~/.nvm/nvm.sh && nvm use 18.20.8
   pnpm dev
   ```

## Supported Wallets

**Ethereum:**
- MetaMask
- Coinbase Wallet
- Rainbow
- WalletConnect compatible wallets

**Solana:**
- Phantom
- Solflare  
- Backpack

## What You'll Get

- ✅ Unified wallet connection for ETH and SOL
- ✅ Automatic wallet type detection
- ✅ Secure authentication for platform features
- ✅ Real wallet addresses for API calls
- ✅ Clean connect/disconnect experience

Once set up, users can connect their wallets and access all platform features including enclaves, tasks, and API key management! 