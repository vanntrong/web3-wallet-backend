import * as swapTokenAbi from '@/contracts/swapToken2.json';
import Web3, { Contract } from 'web3';
import { Web3Account } from 'web3-eth-accounts';
import { CreateSwapQuote } from './swap.dto';

export type TSwapQuoteResponse = {
  amountOut: bigint;
  sqrtPriceX96After: bigint;
  initializedTicksCrossed: bigint;
  gasEstimate: bigint;
};

export enum ESwapTokenType {
  Native = 'native',
  ERC20 = 'erc20',
}

type TSwapData = {
  data: Partial<CreateSwapQuote>;
  contract: Contract<typeof swapTokenAbi>;
  account: Web3Account;
  receiverAddress: string;
  contractAddress: string;
  rpcURL: string;
};

export type TSwapNativeTokenData = TSwapData & {
  nativeBalance: bigint;
};

export type TSwapERC20TokenData = TSwapData & {
  wrappedTokenAddress: string;
};

export type TGetSwapNativeTokenFunctionData = {
  tokenOut: string;
  contract: Contract<typeof swapTokenAbi>;
};

export type TGetSwapERC20TokenFunctionData = {
  tokenOut: string;
  contract: Contract<typeof swapTokenAbi>;
  tokenIn: string;
  amountIn: string;
};
