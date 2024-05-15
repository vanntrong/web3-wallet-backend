import { HexString } from 'web3';

export type TSignedTransaction = {
  readonly messageHash: HexString;
  readonly r: HexString;
  readonly s: HexString;
  readonly v: HexString;
  readonly rawTransaction: HexString;
  readonly transactionHash: HexString;
};
