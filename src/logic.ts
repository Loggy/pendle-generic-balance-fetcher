import { BigNumber, ethers } from 'ethers';
import { UserRecord, YTInterestData } from './types';
import {
  getAllERC20Balances,
  getAllMarketActiveBalances,
  getAllYTInterestData,
  getYTGeneralData
} from './multicall';
import { POOL_INFO } from './configuration';
import * as constants from './consts';

function increaseUserAmount(
  result: UserRecord,
  user: string,
  amount: ethers.BigNumberish
) {
  if (result[user]) {
    result[user] = result[user].add(amount);
  } else {
    result[user] = ethers.BigNumber.from(amount);
  }
}

export async function applyYtHolderShares(
  result: UserRecord,
  allUsers: string[],
  blockNumber: number
): Promise<void> {
  const generalData = await getYTGeneralData(POOL_INFO.YT, blockNumber);
  if (generalData.isExpired) {
    increaseUserAmount(
      result,
      constants.PENDLE_TREASURY,
      generalData.syReserve
    );
    return;
  }

  const balances = (
    await getAllERC20Balances(POOL_INFO.YT, allUsers, blockNumber)
  ).map((v, i) => {
    return {
      user: allUsers[i],
      balance: v
    };
  });

  const allInterests = (
    await getAllYTInterestData(POOL_INFO.YT, allUsers, blockNumber)
  ).map((v, i) => {
    return {
      user: allUsers[i],
      userIndex: v.index,
      amount: v.accrue
    };
  });

  const YTIndex = allInterests
    .map((v) => v.userIndex)
    .reduce((a, b) => {
      return a.gt(b) ? a : b;
    }, ethers.BigNumber.from(0));

  const YTBalances: UserRecord = {};

  let feeRate = ethers.BigNumber.from(0);
  try {
    const factoryContract = new ethers.Contract(
      generalData.factory,
      constants.ABIs.pendleYieldContractFactory,
      constants.PROVIDER
    );

    try {
      feeRate = await factoryContract.rewardFeeRate({
        blockTag: blockNumber
      });
    } catch (error: any) {
      console.warn(`Error getting reward fee rate: ${error.message}. Using default fee rate of 0.`);
    }
  } catch (error: any) {
    console.warn(`Error creating factory contract: ${error.message}. Using default fee rate of 0.`);
  }

  for (const b of balances) {
    try {
      const impliedBalance = YTIndex.gt(0) 
        ? constants._1E18.mul(b.balance).div(YTIndex)
        : b.balance;
      const feeShare = impliedBalance.mul(feeRate).div(constants._1E18);
      const remaining = impliedBalance.sub(feeShare);
      increaseUserAmount(result, b.user, remaining);
      increaseUserAmount(result, constants.PENDLE_TREASURY, feeShare);
      YTBalances[b.user] = b.balance;
    } catch (error: any) {
      console.warn(`Error calculating balance for user ${b.user}: ${error.message}`);
      YTBalances[b.user] = b.balance;
    }
  }

  for (const i of allInterests) {
    try {
      if (i.user == POOL_INFO.YT) {
        continue;
      }
      if (i.userIndex.eq(0)) {
        continue;
      }
      
      if (YTIndex.eq(0)) {
        continue;
      }

      const pendingInterest = YTBalances[i.user]
        ? YTBalances[i.user]
            .mul(YTIndex.sub(i.userIndex))
            .mul(constants._1E18)
            .div(YTIndex.mul(i.userIndex))
        : ethers.BigNumber.from(0);

      const totalInterest = pendingInterest.add(i.amount);
      increaseUserAmount(result, i.user, totalInterest);
    } catch (error: any) {
      console.warn(`Error calculating interest for user ${i.user}: ${error.message}`);
    }
  }
}

export async function applyLpHolderShares(
  result: UserRecord,
  lpToken: string,
  allUsers: string[],
  blockNumber: number
): Promise<void> {
  try {
    const totalSy = (
      await getAllERC20Balances(POOL_INFO.SY, [lpToken], blockNumber)
    )[0];
    
    const allActiveBalances = await getAllMarketActiveBalances(
      lpToken,
      allUsers,
      blockNumber
    );
    
    const totalActiveSupply = allActiveBalances.reduce(
      (a, b) => a.add(b),
      ethers.BigNumber.from(0)
    );

    // Skip if totalActiveSupply is zero to avoid division by zero
    if (totalActiveSupply.eq(0)) {
      console.warn(`Total active supply for LP token ${lpToken} is zero. Skipping.`);
      return;
    }

    async function processLiquidLocker(
      liquidLocker: string,
      totalBoostedSy: BigNumber
    ) {
      try {
        const validLockers = POOL_INFO.liquidLockers.filter(
          (v) => v.address == liquidLocker && v.lpToken == lpToken
        );

        if (
          validLockers.length == 0 ||
          validLockers[0].deployedBlock > blockNumber
        ) {
          return;
        }

        const receiptToken = validLockers[0].receiptToken;
        const allReceiptTokenBalances = await getAllERC20Balances(
          receiptToken,
          allUsers,
          blockNumber
        );
        const totalLiquidLockerShares = allReceiptTokenBalances.reduce(
          (a, b) => a.add(b),
          ethers.BigNumber.from(0)
        );

        if (totalLiquidLockerShares.eq(0)) {
          return;
        }

        for (let i = 0; i < allUsers.length; ++i) {
          try {
            const user = allUsers[i];
            const receiptTokenBalance = allReceiptTokenBalances[i];
            const boostedSyBalance = totalBoostedSy
              .mul(receiptTokenBalance)
              .div(totalLiquidLockerShares);
            increaseUserAmount(result, user, boostedSyBalance);
          } catch (error: any) {
            console.warn(`Error processing liquid locker user ${allUsers[i]}: ${error.message}`);
          }
        }
      } catch (error: any) {
        console.warn(`Error processing liquid locker ${liquidLocker}: ${error.message}`);
      }
    }

    for (let i = 0; i < allUsers.length; ++i) {
      try {
        const holder = allUsers[i];
        const boostedSyBalance = allActiveBalances[i]
          .mul(totalSy)
          .div(totalActiveSupply);

        if (isLiquidLocker(holder)) {
          await processLiquidLocker(holder, boostedSyBalance);
        } else {
          increaseUserAmount(result, holder, boostedSyBalance);
        }
      } catch (error: any) {
        console.warn(`Error processing LP holder ${allUsers[i]}: ${error.message}`);
      }
    }
  } catch (error: any) {
    console.error(`Error in applyLpHolderShares for LP token ${lpToken}: ${error.message}`);
  }
}

function isLiquidLocker(addr: string) {
  return POOL_INFO.liquidLockers.some((v) => addr == v.address);
}
