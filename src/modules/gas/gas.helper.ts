import { TBlockGas } from './gas.types';

export const formatFeeHistory = (
  feeHistory: {
    readonly oldestBlock: bigint;
    readonly baseFeePerGas: bigint;
    readonly reward: bigint[][];
    readonly gasUsedRatio: bigint[];
  },
  historicalBlocks: number,
): TBlockGas[] => {
  let blockNum = Number(feeHistory.oldestBlock);
  let index = 0;
  const blocks: TBlockGas[] = [];
  while (index < historicalBlocks) {
    blocks.push({
      number: blockNum,
      baseFeePerGas: Number(feeHistory.baseFeePerGas[index]),
      gasUsedRatio: Number(feeHistory.gasUsedRatio[index]),
      priorityFeePerGas: feeHistory.reward[index].map((x) => Number(x)),
    });
    blockNum += 1;
    index += 1;
  }

  return blocks;
};

export function averageSuggestGas(arr: number[]) {
  const sum = arr.reduce((a, v) => a + v);
  return Math.round(sum / arr.length);
}
