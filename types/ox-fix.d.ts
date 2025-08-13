// Targeted fix for ox package TypeScript errors
// This only overrides the problematic Authorization module

declare module 'ox/core/Authorization' {
  export interface AuthorizationParameters {
    address: `0x${string}`;
    chainId: number;
    nonce: bigint;
    r?: bigint;
    s?: bigint;
    yParity?: number;
  }
  
  export function from(params: AuthorizationParameters): any;
  export * from 'ox/core/Authorization';
}

// Re-export everything else from ox normally
declare module 'ox' {
  export * from 'ox/dist/index';
}
