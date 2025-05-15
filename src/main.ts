import { POOL_INFO } from './configuration';
import { applyLpHolderShares, applyYtHolderShares } from './logic';
import { PendleAPI } from './pendle-api';
import { UserRecord } from './types';
import * as constants from './consts';
import { ethers } from 'ethers';
type SnapshotResult = {
  resultYT: UserRecord;
  resultLP: UserRecord;
};

async function fetchUserBalanceSnapshot(
  allYTUsers: string[],
  allLPUsers: string[],
  blockNumber: number
): Promise<SnapshotResult> {
  const resultYT: UserRecord = {};
  const resultLP: UserRecord = {};
  await applyYtHolderShares(resultYT, allYTUsers, blockNumber);
  for (const lp of POOL_INFO.LPs) {
    if (lp.deployedBlock <= blockNumber) {
      await applyLpHolderShares(resultLP, lp.address, allLPUsers, blockNumber);
    }
  }
  return {
    resultYT,
    resultLP
  };
}

async function fetchUserBalanceSnapshotBatch(
  blockNumbers: number[]
): Promise<SnapshotResult[]> {
  const allLiquidLockerTokens = POOL_INFO.liquidLockers.map(
    (l) => l.receiptToken
  );
  const allLPTokens = POOL_INFO.LPs.map((l) => l.address);

  const allYTUsers = await PendleAPI.query(POOL_INFO.YT);
  const allLPUsers = await PendleAPI.queryAllTokens([
    ...allLPTokens,
    ...allLiquidLockerTokens
  ]);

  return await Promise.all(
    blockNumbers.map((b) => fetchUserBalanceSnapshot(allYTUsers, allLPUsers, b))
  );
}

async function main() {
  let block = 22489540;
  const res = (await fetchUserBalanceSnapshotBatch([block]))[0];

  let ytUserCount = 0;
  console.log('YT Users:');
  for (let user in res.resultYT) {
    if (res.resultYT[user].eq(0)) continue;
    console.log(user, res.resultYT[user].toString());
    ytUserCount++;
  }
  if (ytUserCount === 0) {
    console.log('No YT users with non-zero balances found for block', block);
  }

  let lpUserCount = 0;
  console.log('\nLP Users:');
  for (let user in res.resultLP) {
    if (res.resultLP[user].eq(0)) continue;
    console.log(user, res.resultLP[user].toString());
    lpUserCount++;
  }
  if (lpUserCount === 0) {
    console.log('No LP users with non-zero balances found for block', block);
  }

  // sum LP and YT balances
  console.log('\nCombined Users (LP + YT):');
  const combinedBalances: UserRecord = {};
  
  // Add YT balances to combined record
  for (let user in res.resultYT) {
    if (!combinedBalances[user]) {
      combinedBalances[user] = ethers.BigNumber.from(0);
    }
    combinedBalances[user] = combinedBalances[user].add(res.resultYT[user]);
  }
  
  // Add LP balances to combined record
  for (let user in res.resultLP) {
    if (!combinedBalances[user]) {
      combinedBalances[user] = ethers.BigNumber.from(0);
    }
    combinedBalances[user] = combinedBalances[user].add(res.resultLP[user]);
  }
  
  // Display combined balances
  let combinedUserCount = 0;
  for (let user in combinedBalances) {
    if (combinedBalances[user].eq(0)) continue;
    console.log(user, combinedBalances[user].div(ethers.BigNumber.from(10).pow(18)).toString());
    combinedUserCount++;
  }
  
  if (combinedUserCount === 0) {
    console.log('No users with non-zero combined balances found for block', block);
  }

  // Display troubleshooting tips if no users found
  if (ytUserCount === 0 && lpUserCount === 0) {
    console.log('\nTroubleshooting tips:');
    console.log('1. Check that the block number is valid and has data for the configured tokens');
    console.log('2. Verify the token addresses in src/configuration.ts are correct');
    console.log('3. Ensure the RPC provider is working and has historical data for the requested block');
    console.log('4. Try using a more recent block number');
  }
}

main().catch(console.error);
