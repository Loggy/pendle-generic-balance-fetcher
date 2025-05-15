import { CHAINS, PoolConfiguration } from './types';

/**
 * Select the chain ID for the blockchain network you're working with
 * @see CHAINS enum in types.ts for all supported chains
 */
export const CHAIN = CHAINS.ETHEREUM; // Change to the chain you need

/**
 * Pool Configuration
 * 
 * This defines all the contract addresses and deployment blocks
 * needed to fetch user balances from Pendle pools.
 * 
 * IMPORTANT: All addresses should be in the correct checksum format
 */
export const POOL_INFO: PoolConfiguration = {
  /**
   * SY (Standardized Yield) token address
   * This is the underlying yield-bearing token address
   */
  SY: '0x0000000000000000000000000000000000000000',
  
  /**
   * YT (Yield Token) address
   * Pendle's tokenized yield for the specific expiry
   */
  YT: '0x0000000000000000000000000000000000000000',
  
  /**
   * LP tokens provided by Pendle markets
   * Each entry should include both the token address and its deployment block
   */
  LPs: [
    {
      address: '0x0000000000000000000000000000000000000000',
      deployedBlock: 0 // Block number when this LP token was deployed
    }
    // Add more LP tokens if needed
  ],
  
  /**
   * Liquid lockers - used for staked LP positions
   * Include if your pool has liquid lockers, otherwise leave empty
   */
  liquidLockers: [
    // Example liquid locker configuration:
    // {
    //   address: '0x0000000000000000000000000000000000000000',
    //   receiptToken: '0x0000000000000000000000000000000000000000',
    //   lpToken: '0x0000000000000000000000000000000000000000',
    //   deployedBlock: 0
    // }
  ]
};

/**
 * Usage Instructions:
 * 1. Copy this file to configuration.ts
 * 2. Replace all the placeholder addresses with actual contract addresses
 * 3. Update the deployment blocks with the correct values
 * 4. Set the correct CHAIN value for your target blockchain
 */ 