import { ethers } from 'ethers';

/**
 * KYCVerifier contract ABI - only the functions we need
 */
const KYC_VERIFIER_ABI = [
  // Submit proof
  "function submitProof(bytes32 _commitment, bytes _proof, string[] _publicInputs) external returns (bytes32)",
  
  // Verify proof
  "function verifyProof(bytes32 _proofId) external returns (bool)",
  
  // Get proof details
  "function getProof(bytes32 _proofId) external view returns (bytes32 commitment, string[] publicInputs, uint256 timestamp, address submitter, bool isVerified, uint256 expiresAt)",
  
  // Check if user has valid KYC
  "function hasValidKYC(address _user) external view returns (bool)",
  
  // Get user's proof ID
  "function getUserProofId(address _user) external view returns (bytes32)",
  
  // Events
  "event ProofSubmitted(bytes32 indexed proofId, address indexed submitter, bytes32 commitment, uint256 timestamp)",
  "event ProofVerified(bytes32 indexed proofId, bool isValid, address verifier)"
];

export interface BlockchainConfig {
  rpcUrl: string;
  chainId: number;
  contractAddress: string;
  privateKey?: string; // Optional - for server-side operations
}

export interface ZKProofOnChain {
  commitment: string;
  publicInputs: string[];
  timestamp: number;
  submitter: string;
  isVerified: boolean;
  expiresAt: number;
}

/**
 * KYCVerifier contract client
 */
export class KYCVerifierClient {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private signer?: ethers.Wallet;

  constructor(config: BlockchainConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.contract = new ethers.Contract(
      config.contractAddress,
      KYC_VERIFIER_ABI,
      this.provider
    );

    // If private key provided, create signer for write operations
    if (config.privateKey) {
      this.signer = new ethers.Wallet(config.privateKey, this.provider);
      this.contract = this.contract.connect(this.signer) as ethers.Contract;
    }
  }

  /**
   * Submit a ZK proof to the blockchain
   */
  async submitProof(
    commitment: string,
    proof: string,
    publicInputs: string[]
  ): Promise<{ proofId: string; txHash: string }> {
    if (!this.signer) {
      throw new Error('Signer required for write operations. Provide privateKey in config.');
    }

    // Convert commitment to bytes32
    const commitmentBytes = commitment.startsWith('0x') 
      ? commitment 
      : '0x' + commitment;

    // Convert proof to bytes
    const proofBytes = proof.startsWith('0x') 
      ? proof 
      : '0x' + proof;

    // Submit proof transaction
    const tx = await this.contract.submitProof(
      commitmentBytes,
      proofBytes,
      publicInputs
    );

    const receipt = await tx.wait();

    // Extract proofId from event
    const event = receipt.logs
      .map((log: any) => {
        try {
          return this.contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e: any) => e?.name === 'ProofSubmitted');

    if (!event) {
      throw new Error('ProofSubmitted event not found');
    }

    return {
      proofId: event.args.proofId,
      txHash: receipt.hash,
    };
  }

  /**
   * Verify a proof on-chain
   */
  async verifyProof(proofId: string): Promise<{ isValid: boolean; txHash: string }> {
    if (!this.signer) {
      throw new Error('Signer required for write operations');
    }

    const tx = await this.contract.verifyProof(proofId);
    const receipt = await tx.wait();

    // Extract verification result from event
    const event = receipt.logs
      .map((log: any) => {
        try {
          return this.contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e: any) => e?.name === 'ProofVerified');

    return {
      isValid: event?.args.isValid ?? false,
      txHash: receipt.hash,
    };
  }

  /**
   * Get proof details
   */
  async getProof(proofId: string): Promise<ZKProofOnChain> {
    const result = await this.contract.getProof(proofId);
    
    return {
      commitment: result.commitment,
      publicInputs: result.publicInputs,
      timestamp: Number(result.timestamp),
      submitter: result.submitter,
      isVerified: result.isVerified,
      expiresAt: Number(result.expiresAt),
    };
  }

  /**
   * Check if a user has valid KYC
   */
  async hasValidKYC(userAddress: string): Promise<boolean> {
    return await this.contract.hasValidKYC(userAddress);
  }

  /**
   * Get user's latest proof ID
   */
  async getUserProofId(userAddress: string): Promise<string> {
    return await this.contract.getUserProofId(userAddress);
  }

  /**
   * Get network info
   */
  async getNetworkInfo() {
    const network = await this.provider.getNetwork();
    const blockNumber = await this.provider.getBlockNumber();
    
    return {
      chainId: Number(network.chainId),
      name: network.name,
      blockNumber,
    };
  }
}

/**
 * Create KYCVerifier client from environment variables
 */
export function createKYCVerifierClient(): KYCVerifierClient {
  const config: BlockchainConfig = {
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || process.env.SEPOLIA_RPC_URL || '',
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 11155111),
    contractAddress: process.env.NEXT_PUBLIC_KYC_VERIFIER_ADDRESS || '',
    privateKey: process.env.PRIVATE_KEY, // Server-side only
  };

  if (!config.rpcUrl) {
    throw new Error('RPC URL not configured');
  }

  if (!config.contractAddress) {
    throw new Error('KYCVerifier contract address not configured');
  }

  return new KYCVerifierClient(config);
}

