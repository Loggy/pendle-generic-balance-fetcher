# Pendle Generic Balance Fetcher

This tool fetches YT and LP token balances for Pendle users at specific block numbers.

## Setup

1. Install required packages:

```bash
yarn install
```

2. Edit the configuration file (`./src/configuration.ts`) to fill in the pool's information. Do note that **all addresses must be in the correct checksum format**.

## Usage

In `./src/main.ts`, the main function to call is `fetchUserBalanceSnapshotBatch`, where its arguments are simply a list of block numbers to query users' balances from. 

```typescript
// Example usage
const blockNumbers = [19000000]; // Use recent valid block numbers
const results = await fetchUserBalanceSnapshotBatch(blockNumbers);
```

**Important Notes:**
- A buffer of at least 15 minutes is recommended before you can query a balance from a mined block.
- Make sure your RPC provider has access to historical data for the block numbers you're querying.

## Error Handling

The application now includes comprehensive error handling to gracefully manage RPC errors, invalid blocks, or contract call failures. If errors occur, the application will:

1. Log detailed error messages
2. Continue execution with fallback values where possible
3. Provide helpful troubleshooting suggestions

## Troubleshooting

If you encounter issues:

1. **Empty Results**: Verify the block number has data for the configured tokens
2. **RPC Errors**: Check that your provider has access to the historic block data
3. **Contract Call Failures**: Ensure the contract addresses are correct and the contracts exist at the specified block
4. **Performance Issues**: Reduce the `MULTICALL_BATCH_SIZE` in `src/consts.ts` if hitting gas limits

## Configuration

The `src/configuration.ts` file contains the chain ID and pool information:

```typescript
export const CHAIN = CHAINS.ETHEREUM; // Change to other supported chains as needed

export const POOL_INFO: PoolConfiguration = {
  SY: '0x2Ed473F528E5B320f850d17ADfe0e558f0298aA9',
  YT: '0x23dbaaB01bdda67C6DaEA0F180d0BCCC5649A466',
  LPs: [
    {
      address: '0x53a10F17D941D62EF7c65f7c0fFbc91bE2613408',
      deployedBlock: 22368336
    }
  ],
  liquidLockers: []
};
```

Supported chains:
- ETHEREUM (1)
- ARBITRUM (42161)
- BNB (56)
- BASE (8453)
- MANTLE (5000)
- SONIC (146)
- BERA (80094)