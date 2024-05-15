import { ERROR_MAP } from '@/constants/errorMap';
import * as tokenContractAbi from '@/contracts/tokenContract.json';
import { stringToHex, toWei, weiToNumber } from '@/utils/converter';
import { BadRequestException } from '@nestjs/common';
import Web3, { Bytes, TransactionReceipt } from 'web3';
import {
  CreateTransactionERC20Dto,
  CreateTransactionNetworkDto,
} from './transaction.dto';
import { Web3Service } from '../web3/web3.service';
import { omit } from 'lodash';

export enum TransactionTokenType {
  ERC20 = 'ERC20',
  Native = 'Native',
}

abstract class Transaction {
  abstract send(
    rpcUrl: string,
    data: CreateTransactionNetworkDto | CreateTransactionERC20Dto,
  ): Promise<TransactionReceipt>;

  abstract getRawTransactionData(
    data: CreateTransactionNetworkDto | CreateTransactionERC20Dto,
    rpcURL: string,
  ): any;

  abstract getEstimateGas(
    data: Partial<CreateTransactionNetworkDto | CreateTransactionERC20Dto>,
    rpcURL: string,
  ): Promise<number>;
}

class TransactionNativeToken extends Transaction {
  constructor(private readonly web3Service: Web3Service) {
    super();
  }

  getRawTransactionData(data: CreateTransactionNetworkDto) {
    const amountInWeiString = toWei(data.amount, data.decimal).toString();
    return {
      from: data.from,
      to: data.to,
      value: amountInWeiString,
    };
  }

  async getEstimateGas(
    data: CreateTransactionNetworkDto,
    rpcURL: string,
  ): Promise<number> {
    try {
      const web3 = new Web3(rpcURL);
      const rawTransaction = this.getRawTransactionData(data);
      const gasEstimate = await this.web3Service.$estimateGas(
        web3,
        omit(rawTransaction, 'from'),
      );

      const { maxFeePerGasGwei } =
        await this.web3Service.$getTransactionMaxFeePerGas({
          baseFee: data.baseFee,
          maxPriorityFeePerGas: data.maxPriorityFeePerGas,
          rpcURL,
        });

      const transactionFee = this.web3Service.$calculateTransactionFee({
        gasEstimate,
        maxFeePerGas: maxFeePerGasGwei,
      });
      console.log(transactionFee);

      return weiToNumber(transactionFee, data.decimal);
    } catch (error) {
      console.log(error);
      throw new BadRequestException(ERROR_MAP.INSUFFICIENT_BALANCE);
    }
  }
  async send(rpcURL: string, data: CreateTransactionNetworkDto) {
    console.log('send transaction native token', data);
    const web3 = new Web3(rpcURL);
    const amountInWei = toWei(data.amount, data.decimal);
    const rawTransaction = this.getRawTransactionData(data);

    const account = web3.eth.accounts.privateKeyToAccount(
      stringToHex(data.privateKey),
    );
    if (!account) throw new BadRequestException(ERROR_MAP.ACCOUNT_NOT_FOUND);
    console.log('rawTransaction', rawTransaction);

    const [gasEstimate, balance] = await Promise.all([
      // remove from because when we send all balance, estimate gas will thrown unexpected error
      // remove from for ignore check balance of estimateGas
      this.web3Service.$estimateGas(web3, omit(rawTransaction, 'from')),
      web3.eth.getBalance(account.address),
    ]);

    const { maxFeePerGas, maxFeePerGasGwei, maxPriorityFeePerGas } =
      await this.web3Service.$getTransactionMaxFeePerGas({
        baseFee: data.baseFee,
        maxPriorityFeePerGas: data.maxPriorityFeePerGas,
        rpcURL,
      });

    const transactionFee = this.web3Service.$calculateTransactionFee({
      gasEstimate,
      maxFeePerGas: maxFeePerGasGwei,
    });

    console.log('gasEstimate', gasEstimate);
    console.log('transactionFee', transactionFee);
    console.log('balance', balance);

    const signedTx = await account.signTransaction({
      ...rawTransaction,
      gas: gasEstimate,
      gasLimit: gasEstimate,
      maxFeePerGas,
      maxPriorityFeePerGas,
      value: this.web3Service.getFinalAmount(
        amountInWei,
        transactionFee,
        balance,
      ),
    });

    return web3.eth.sendSignedTransaction(
      signedTx.rawTransaction as unknown as Bytes,
    );
  }
}

class TransactionERC20Token extends Transaction {
  constructor(private readonly web3Service: Web3Service) {
    super();
  }

  getRawTransactionData(data: CreateTransactionERC20Dto, rpcURL: string) {
    const amountInWeiString = toWei(data.amount, data.decimal).toString();
    const web3 = new Web3(rpcURL);
    const contract = new web3.eth.Contract(tokenContractAbi, data.tokenAddress);

    return {
      from: data.from,
      to: data.tokenAddress,
      data: contract.methods.transfer(data.to, amountInWeiString).encodeABI(),
    };
  }

  async getEstimateGas(
    data: CreateTransactionERC20Dto,
    rpcURL: string,
  ): Promise<number> {
    try {
      const web3 = new Web3(rpcURL);
      console.log('getEstimateGas', JSON.stringify(data));
      const rawTransaction = this.getRawTransactionData(data, rpcURL);
      const gasEstimate = await this.web3Service.$estimateGas(
        web3,
        rawTransaction,
      );

      const { maxFeePerGasGwei } =
        await this.web3Service.$getTransactionMaxFeePerGas({
          baseFee: data.baseFee,
          maxPriorityFeePerGas: data.maxPriorityFeePerGas,
          rpcURL,
        });

      const transactionFee = this.web3Service.$calculateTransactionFee({
        gasEstimate,
        maxFeePerGas: maxFeePerGasGwei,
      });
      console.log(transactionFee);

      return weiToNumber(transactionFee, data.decimal);
    } catch (error) {
      console.log(error);
      throw new BadRequestException(ERROR_MAP.INSUFFICIENT_BALANCE);
    }
  }

  async send(rpcURL: string, data: CreateTransactionERC20Dto) {
    const web3 = new Web3(rpcURL);
    const account = web3.eth.accounts.privateKeyToAccount(
      stringToHex(data.privateKey),
    );

    const rawTransaction = this.getRawTransactionData(data, rpcURL);
    const [gasEstimate, balance] = await Promise.all([
      this.web3Service.$estimateGas(web3, rawTransaction),
      web3.eth.getBalance(account.address),
    ]);

    const { maxFeePerGas, maxPriorityFeePerGas, maxFeePerGasGwei } =
      await this.web3Service.$getTransactionMaxFeePerGas({
        baseFee: data.baseFee,
        maxPriorityFeePerGas: data.maxPriorityFeePerGas,
        rpcURL,
      });

    const transactionFee = this.web3Service.$calculateTransactionFee({
      gasEstimate,
      maxFeePerGas: maxFeePerGasGwei,
    });

    console.log('gasEstimate', gasEstimate);
    console.log('transactionFee', transactionFee);
    console.log('balance', balance);

    if (transactionFee > balance) {
      throw new BadRequestException(ERROR_MAP.INSUFFICIENT_BALANCE);
    }

    const signedTx = await account.signTransaction({
      ...rawTransaction,
      gas: gasEstimate,
      gasLimit: gasEstimate,
      maxFeePerGas,
      maxPriorityFeePerGas,
    });

    return web3.eth.sendSignedTransaction(
      signedTx.rawTransaction as unknown as Bytes,
    );
  }
}

export class TransactionFactory {
  constructor(private readonly web3Service: Web3Service) {
    console.log('TransactionFactory');
  }

  create(type: TransactionTokenType) {
    if (type === TransactionTokenType.ERC20) {
      return new TransactionERC20Token(this.web3Service);
    }

    return new TransactionNativeToken(this.web3Service);
  }

  test() {
    console.log('abc');
  }
}
