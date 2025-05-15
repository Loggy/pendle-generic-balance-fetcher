import { CHAINS, PoolConfiguration } from './types';

export const CHAIN = CHAINS.ETHEREUM;

export const POOL_INFO: PoolConfiguration = {
  SY: '0xeb91Df8db163AFc0dA16300D448FbD4D6b3F0D2C',
  YT: '0x23dbaaB01bdda67C6DaEA0F180d0BCCC5649A466',
  LPs: [
    {
      address: '0x53a10F17D941D62EF7c65f7c0fFbc91bE2613408',
      deployedBlock: 22368336
    }
  ],
  liquidLockers: [
    {
      address: '0x6e799758cee75dae3d84e09d40dc416ecf713652',
      receiptToken: '0xA47a2Ef6d3360cd305E6cd5dcB07b990596Fcf87',
      lpToken: '0x53a10F17D941D62EF7c65f7c0fFbc91bE2613408',
      deployedBlock: 22423231
    },
    {
      // equilibira
      address: '0x64627901dadb46ed7f275fd4fc87d086cff1e6e3',
      receiptToken: '0x9A7d9340D78157CB78e830F57C9F9b9D892ef216',
      lpToken: '0x53a10F17D941D62EF7c65f7c0fFbc91bE2613408',
      deployedBlock: 22429269
    },
  ]
};
