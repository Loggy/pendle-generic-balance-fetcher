import MulticalABI from '../abis/Multicall.json';
import { BigNumber, utils } from 'ethers';
import * as constants from './consts';
import { YTInterestData } from './types';

export async function aggregateMulticall(
  callDatas: { target: string; callData: string }[],
  blockNumber: number
) {
  const multicall = constants.Contracts.multicall;
  const result = [];
  for (
    let start = 0;
    start < callDatas.length;
    start += constants.MULTICALL_BATCH_SIZE
  ) {
    try {
      const batch = callDatas.slice(start, start + constants.MULTICALL_BATCH_SIZE)
        .map((c) => [c.target, c.callData]);
      
      const resp = (
        await multicall.callStatic.aggregate(
          batch,
          {
            blockTag: blockNumber
          }
        )
      ).returnData;
      result.push(...resp);
    } catch (error: any) {
      console.error(`Multicall failed at block ${blockNumber}:`);
      console.error(`Batch size: ${callDatas.slice(start, start + constants.MULTICALL_BATCH_SIZE).length}`);
      if (error.message) console.error(`Error message: ${error.message}`);
      
      // Check if the blockchain has this block
      try {
        const blockInfo = await constants.PROVIDER.getBlock(blockNumber);
        if (!blockInfo) {
          throw new Error(`Block ${blockNumber} does not exist on this chain`);
        }
      } catch (blockError: any) {
        throw new Error(`Failed to fetch block ${blockNumber}: ${blockError.message || 'Unknown error'}`);
      }
      
      throw error;
    }
  }
  return result;
}

export async function getAllERC20Balances(
  token: string,
  addresses: string[],
  blockNumber: number
): Promise<BigNumber[]> {
  const callDatas = addresses.map((address) => ({
    target: token,
    callData: constants.Contracts.marketInterface.encodeFunctionData(
      'balanceOf',
      [address]
    )
  }));
  
  try {
    const balances = await aggregateMulticall(callDatas, blockNumber);
    return balances.map((b) => {
      if (!b || b.length === 0) {
        console.warn(`Received empty data for a balance call. Using 0 as fallback.`);
        return BigNumber.from(0);
      }
      try {
        return BigNumber.from(utils.defaultAbiCoder.decode(['uint256'], b)[0]);
      } catch (error: any) {
        console.warn(`Error decoding balance: ${error.message}. Using 0 as fallback.`);
        return BigNumber.from(0);
      }
    });
  } catch (error: any) {
    console.error(`Error retrieving ERC20 balances: ${error.message}`);
    // Return zero balances in case of error
    return addresses.map(() => BigNumber.from(0));
  }
}

export async function getAllMarketActiveBalances(
  market: string,
  addresses: string[],
  blockNumber: number
): Promise<BigNumber[]> {
  const callDatas = addresses.map((address) => ({
    target: market,
    callData: constants.Contracts.marketInterface.encodeFunctionData(
      'activeBalance',
      [address]
    )
  }));
  
  try {
    const balances = await aggregateMulticall(callDatas, blockNumber);
    return balances.map((b) => {
      if (!b || b.length === 0) {
        console.warn(`Received empty data for an active balance call. Using 0 as fallback.`);
        return BigNumber.from(0);
      }
      try {
        return BigNumber.from(utils.defaultAbiCoder.decode(['uint256'], b)[0]);
      } catch (error: any) {
        console.warn(`Error decoding active balance: ${error.message}. Using 0 as fallback.`);
        return BigNumber.from(0);
      }
    });
  } catch (error: any) {
    console.error(`Error retrieving market active balances: ${error.message}`);
    // Return zero balances in case of error
    return addresses.map(() => BigNumber.from(0));
  }
}

export async function getAllYTInterestData(
  yt: string,
  addresses: string[],
  blockNumber: number
): Promise<YTInterestData[]> {
  const callDatas = addresses.map((address) => ({
    target: yt,
    callData: constants.Contracts.yieldTokenInterface.encodeFunctionData(
      'userInterest',
      [address]
    )
  }));
  
  try {
    const interests = await aggregateMulticall(callDatas, blockNumber);
    return interests.map((b, idx) => {
      if (!b || b.length === 0) {
        console.warn(`Received empty data for interest data. Using default values.`);
        return {
          index: BigNumber.from(0),
          accrue: BigNumber.from(0)
        };
      }
      try {
        const rawData = utils.defaultAbiCoder.decode(['uint128', 'uint128'], b);
        return {
          index: BigNumber.from(rawData[0]),
          accrue: BigNumber.from(rawData[1])
        };
      } catch (error: any) {
        console.warn(`Error decoding interest data for ${addresses[idx]}: ${error.message}. Using default values.`);
        return {
          index: BigNumber.from(0),
          accrue: BigNumber.from(0)
        };
      }
    });
  } catch (error: any) {
    console.error(`Error retrieving YT interest data: ${error.message}`);
    // Return default values in case of error
    return addresses.map(() => ({
      index: BigNumber.from(0),
      accrue: BigNumber.from(0)
    }));
  }
}

export async function getYTGeneralData(
  ytAddr: string,
  blockNumber: number
): Promise<{ isExpired: boolean; syReserve: BigNumber; factory: string }> {
  const callDatas = [
    {
      target: ytAddr,
      callData: constants.Contracts.yieldTokenInterface.encodeFunctionData(
        'isExpired',
        []
      )
    },
    {
      target: ytAddr,
      callData: constants.Contracts.yieldTokenInterface.encodeFunctionData(
        'syReserve',
        []
      )
    },
    {
      target: ytAddr,
      callData: constants.Contracts.yieldTokenInterface.encodeFunctionData(
        'factory',
        []
      )
    }
  ];

  try {
    const result = await aggregateMulticall(callDatas, blockNumber);
    
    let isExpired = false;
    let syReserve = BigNumber.from(0);
    let factory = constants.PENDLE_TREASURY; // Default to treasury
    
    try {
      if (result[0] && result[0].length > 0) {
        isExpired = utils.defaultAbiCoder.decode(['bool'], result[0])[0];
      } else {
        console.warn('Received empty data for isExpired. Using default: false');
      }
    } catch (error: any) {
      console.warn(`Error decoding isExpired: ${error.message}. Using default: false`);
    }
    
    try {
      if (result[1] && result[1].length > 0) {
        syReserve = BigNumber.from(
          utils.defaultAbiCoder.decode(['uint256'], result[1])[0]
        );
      } else {
        console.warn('Received empty data for syReserve. Using default: 0');
      }
    } catch (error: any) {
      console.warn(`Error decoding syReserve: ${error.message}. Using default: 0`);
    }
    
    try {
      if (result[2] && result[2].length > 0) {
        factory = utils.defaultAbiCoder.decode(['address'], result[2])[0];
      } else {
        console.warn(`Received empty data for factory. Using default: ${constants.PENDLE_TREASURY}`);
      }
    } catch (error: any) {
      console.warn(`Error decoding factory: ${error.message}. Using default: ${constants.PENDLE_TREASURY}`);
    }

    return {
      isExpired,
      syReserve,
      factory
    };
  } catch (error: any) {
    console.error(`Error retrieving YT general data: ${error.message}`);
    return {
      isExpired: false,
      syReserve: BigNumber.from(0),
      factory: constants.PENDLE_TREASURY
    };
  }
}
