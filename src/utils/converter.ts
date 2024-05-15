import { DEFAULT_TOKEN_DECIMAL } from '@/configs/web3';
import Decimal from 'decimal.js';

export function uint8ArrayToHex(uint8Array: Uint8Array) {
  return Array.prototype.map
    .call(uint8Array, function (byte) {
      return ('0' + (byte & 0xff).toString(16)).slice(-2);
    })
    .join('');
}

export function toWei(amount: number, decimal = DEFAULT_TOKEN_DECIMAL) {
  const weiNumber = new Decimal(amount).times(10 ** decimal).toNumber();
  return BigInt(weiNumber);
}

export function stringToHex(data: string): Buffer {
  return Buffer.from(data, 'hex');
}

export function weiToNumber(
  wei: number | bigint,
  decimal = DEFAULT_TOKEN_DECIMAL,
) {
  return new Decimal(Number(wei)).div(10 ** decimal).toNumber();
}
