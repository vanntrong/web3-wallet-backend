import { Token } from '@/entities/token/token.entity';
import { TransactionTokenType } from './transaction.factory';

export const getTransactionType = (token?: Token | string) => {
  return !!token ? TransactionTokenType.ERC20 : TransactionTokenType.Native;
};
