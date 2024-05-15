import { CONTRACT_ADDRESS, DEFAULT_TOKEN_DECIMAL } from '@/configs/web3';
import { weiToNumber } from '@/utils/converter';
import { Injectable } from '@nestjs/common';
import Web3, { Transaction, utils } from 'web3';
import { Web3Account } from 'web3-eth-accounts';

import * as tokenContractAbi from '@/contracts/tokenContract.json';

@Injectable()
export class Web3Service {
  async checkBalance(data: {
    target: string;
    rpcURL: string;
    tokenAddress?: string;
    tokenDecimal?: number;
  }) {
    const { target, rpcURL, tokenAddress, tokenDecimal } = data;
    const web3 = new Web3(rpcURL);

    if (tokenAddress) {
      const contact = new web3.eth.Contract(tokenContractAbi, tokenAddress);
      return weiToNumber(
        await contact.methods.balanceOf(target).call(),
        tokenDecimal,
      );
    }
    return weiToNumber(
      await web3.eth.getBalance(target),
      DEFAULT_TOKEN_DECIMAL,
    );
  }

  async getGasUsed(gasUsed: number, rpcURL: string, gasPrice: number) {
    const web3 = new Web3(rpcURL);
    const _gasPrice = gasPrice ? gasPrice : await web3.eth.getGasPrice();
    return weiToNumber(BigInt(gasUsed) * BigInt(_gasPrice));
  }

  getFinalAmount(
    amountInWei: bigint,
    transactionFee: bigint,
    balance: bigint,
  ): bigint {
    const funds = amountInWei + transactionFee;
    console.log({
      funds,
      balance,
      amount: utils.fromWei(amountInWei, 'ether'),
    });
    if (funds > balance) {
      return amountInWei - transactionFee;
    }
    return amountInWei;
  }

  $estimateGas(web3: Web3, transaction: Transaction) {
    return web3.eth.estimateGas(transaction);
  }

  async $approve(
    data: {
      tokenAddress: string;
      account: Web3Account;
      amount: string | number;
    },
    web3Instance: Web3,
    spenderAddress = CONTRACT_ADDRESS,
  ) {
    const contract = new web3Instance.eth.Contract(
      tokenContractAbi,
      data.tokenAddress,
    );
    const gasPrice = await web3Instance.eth.getGasPrice();
    const transaction: Transaction = {
      from: data.account.address,
      to: data.tokenAddress,
      data: contract.methods.approve(spenderAddress, data.amount).encodeABI(),
      gasPrice,
    };

    const signedTx = await data.account.signTransaction(transaction);

    await web3Instance.eth.sendSignedTransaction(signedTx.rawTransaction);

    console.log('approved');
  }

  async $getTransactionMaxFeePerGas({
    baseFee = 0,
    maxPriorityFeePerGas = 1,
    rpcURL,
  }: {
    baseFee: number | null;
    maxPriorityFeePerGas: number | null;
    rpcURL: string;
  }) {
    if (!baseFee) baseFee = 0;
    if (!maxPriorityFeePerGas) maxPriorityFeePerGas = 1;
    const web3 = new Web3(rpcURL);
    const block = await web3.eth.getBlock('latest');

    const baseFeeFromBlock = +utils.fromWei(block.baseFeePerGas || 0, 'Gwei');

    const maxFeePerGas = Math.max(
      baseFeeFromBlock,
      baseFee + maxPriorityFeePerGas,
    );

    if (baseFeeFromBlock >= baseFee + maxPriorityFeePerGas) {
      console.log(
        'baseFeeFromBlock >= maxFeePerGas',
        baseFeeFromBlock,
        baseFee + maxPriorityFeePerGas,
      );
    }

    const maxFeePerGasWei = utils.toWei(maxFeePerGas, 'Gwei');

    return {
      maxFeePerGas: maxFeePerGasWei,
      maxPriorityFeePerGas: utils.toWei(maxPriorityFeePerGas, 'Gwei'),
      maxFeePerGasGwei: maxFeePerGas,
    };
  }

  $calculateTransactionFee({
    gasEstimate,
    maxFeePerGas,
  }: {
    gasEstimate: number | bigint | null;
    maxFeePerGas: number | bigint | null;
  }): bigint {
    const _gasEstimate = Number(gasEstimate);
    const _maxFeePerGas = Number(maxFeePerGas);
    console.log({ _maxFeePerGas, _gasEstimate });

    const transactionFee = utils.toWei(_maxFeePerGas * _gasEstimate, 'Gwei');

    return BigInt(transactionFee);
  }
}
