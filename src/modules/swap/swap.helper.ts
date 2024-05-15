import { ESwapTokenType } from './swap.type';

export const getSwapType = (tokenIn?: string) => {
  return !!tokenIn ? ESwapTokenType.ERC20 : ESwapTokenType.Native;
};
