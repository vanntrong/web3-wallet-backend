import { DEFAULT_TOKEN_DECIMAL } from '@/configs/web3';
import { ERROR_MAP, ERROR_WEB3_MAP } from '@/constants/errorMap';
import { toWei, weiToNumber } from '@/utils/converter';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import Web3, { Bytes } from 'web3';
import { TokenService } from '../token/token.service';
import { Web3Service } from '../web3/web3.service';
import {
  ESwapTokenType,
  TGetSwapERC20TokenFunctionData,
  TGetSwapNativeTokenFunctionData,
  TSwapERC20TokenData,
  TSwapNativeTokenData,
} from './swap.type';
import { Web3Account } from 'web3-eth-accounts';
import * as tokenABI from '@/contracts/tokenContract.json';
import { retry } from '@/utils/retry';

abstract class Swap {
  abstract swap(
    data: TSwapNativeTokenData | TSwapERC20TokenData,
  ): Promise<void>;
  abstract getSwapContractFunctionData(
    data: TGetSwapNativeTokenFunctionData | TGetSwapERC20TokenFunctionData,
  ): any;

  abstract getEstimateGas(data: any, rpcURL: string): Promise<number>;
}

class SwapNativeToken extends Swap {
  constructor(private readonly web3Service: Web3Service) {
    super();
  }

  getSwapContractFunctionData({
    contract,
    tokenOut,
  }: TGetSwapNativeTokenFunctionData) {
    return contract.methods.swapExactNativeTokenInputSingle(tokenOut);
  }

  async getEstimateGas({
    data,
    contract,
    receiverAddress,
    contractAddress,
    rpcURL,
  }: Omit<TSwapNativeTokenData, 'nativeBalance' | 'account'>): Promise<any> {
    try {
      const web3 = new Web3(rpcURL);

      const amountInWei = toWei(data.amount, DEFAULT_TOKEN_DECIMAL);
      const payableMethod = this.getSwapContractFunctionData({
        tokenOut: data.tokenOut,
        contract,
      });

      const rawTransaction = {
        from: receiverAddress,
        to: contractAddress,
        value: amountInWei.toString(),
        data: payableMethod.encodeABI(),
      };

      const gasEstimate = await this.web3Service.$estimateGas(
        web3,
        rawTransaction,
        // omit(rawTransaction, 'from'),
      );

      const { maxFeePerGasGwei, maxFeePerGas, maxPriorityFeePerGas } =
        await this.web3Service.$getTransactionMaxFeePerGas({
          baseFee: data.baseFee,
          maxPriorityFeePerGas: data.maxPriorityFeePerGas,
          rpcURL,
        });

      const transactionFee = this.web3Service.$calculateTransactionFee({
        gasEstimate: gasEstimate,
        maxFeePerGas: maxFeePerGasGwei,
      });

      return {
        amountInWei,
        transactionFee,
        maxFeePerGas,
        maxPriorityFeePerGas,
        payableMethod,
        readableTransactionFee: weiToNumber(
          transactionFee,
          DEFAULT_TOKEN_DECIMAL,
        ),
      };
    } catch (error) {
      let message = 'Cant swap token';
      if (error?.innerError?.code) {
        message = ERROR_WEB3_MAP[error?.innerError?.code] || message;
      }
      console.log(error);

      throw new InternalServerErrorException(message, error);
    }
  }

  async swap({
    data,
    contract,
    nativeBalance,
    account,
    receiverAddress,
    contractAddress,
    rpcURL,
  }: TSwapNativeTokenData): Promise<any> {
    const web3 = new Web3(rpcURL);

    const promise = async () => {
      const {
        amountInWei,
        transactionFee,
        maxFeePerGas,
        maxPriorityFeePerGas,
        payableMethod,
      } = await this.getEstimateGas({
        data,
        contract,
        receiverAddress,
        contractAddress,
        rpcURL,
      });

      const finalValue = this.web3Service.getFinalAmount(
        amountInWei,
        transactionFee,
        nativeBalance,
      );

      const signedTx = await account.signTransaction({
        maxFeePerGas,
        maxPriorityFeePerGas,
        from: receiverAddress,
        to: contractAddress,
        value: finalValue,
        data: payableMethod.encodeABI(),
      });

      return web3.eth.sendSignedTransaction(
        signedTx.rawTransaction as unknown as Bytes,
      );
    };

    const response = await retry(promise);

    console.log('response', response);

    return;
  }
}

class SwapERC20Token extends Swap {
  constructor(
    private readonly web3Service: Web3Service,
    private readonly tokenService: TokenService,
  ) {
    super();
  }

  getSwapContractFunctionData({
    tokenOut,
    tokenIn,
    amountIn,
    contract,
  }: TGetSwapERC20TokenFunctionData) {
    return contract.methods.swapExactInputSingle(tokenIn, tokenOut, amountIn);
  }

  async getEstimateGas({
    data,
    contract,
    receiverAddress,
    contractAddress,
    rpcURL,
    account,
  }: Omit<TSwapERC20TokenData, 'wrappedTokenAddress'>): Promise<any> {
    const web3 = new Web3(rpcURL);

    const tokenNetwork = await this.tokenService.findByAddress(data.tokenIn);
    const amountInWei = toWei(
      data.amount,
      tokenNetwork.token.decimal,
    ).toString();
    const payableMethod = this.getSwapContractFunctionData({
      tokenIn: data.tokenIn,
      tokenOut: data.tokenOut,
      contract,
      amountIn: amountInWei,
    });

    const rawTransaction = {
      from: receiverAddress,
      to: contractAddress,
      data: payableMethod.encodeABI(),
    };
    // call approve to approve contract spend token_in of user
    await this.web3Service.$approve(
      {
        account,
        amount: amountInWei,
        tokenAddress: data.tokenIn,
      },
      web3,
      contractAddress,
    );

    const gasEstimate = await this.web3Service.$estimateGas(
      web3,
      rawTransaction,
    );
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

    return {
      gasEstimate,
      transactionFee,
      maxFeePerGas,
      maxPriorityFeePerGas,
      payableMethod,
      readableTransactionFee: weiToNumber(
        transactionFee,
        DEFAULT_TOKEN_DECIMAL,
      ),
      amountInWei,
    };
  }

  async swap({
    data,
    contract,
    contractAddress,
    rpcURL,
    wrappedTokenAddress,
    account,
    receiverAddress,
  }: TSwapERC20TokenData): Promise<void> {
    try {
      const web3 = new Web3(rpcURL);
      let isSwapERC20ToETH = false;
      if (!data.tokenOut) {
        // swap erc20 to native token
        // because native token doesn't have address, we should use wrapped token
        data.tokenOut = wrappedTokenAddress;
        console.log('change token out', data.tokenOut);
        isSwapERC20ToETH = true;
      }

      const promise = async () => {
        const {
          transactionFee,
          maxFeePerGas,
          maxPriorityFeePerGas,
          payableMethod,
        } = await this.getEstimateGas({
          data,
          contract,
          receiverAddress,
          contractAddress,
          rpcURL,
          account,
        });

        const balance = await web3.eth.getBalance(account.address);

        if (transactionFee > balance) {
          throw new BadRequestException(ERROR_MAP.INSUFFICIENT_BALANCE);
        }

        const signedTx = await account.signTransaction({
          maxFeePerGas,
          maxPriorityFeePerGas,
          from: receiverAddress,
          to: contractAddress,
          data: payableMethod.encodeABI(),
        });

        web3.eth.sendSignedTransaction(
          signedTx.rawTransaction as unknown as Bytes,
        );
      };

      const response = await retry(promise);
      console.log(response);

      if (isSwapERC20ToETH) {
        await retry(() =>
          this.unwrap({
            wrappedTokenAddress,
            account,
            rpcURL,
          }),
        );
      }
    } catch (error) {
      throw error;
      // throw new Error(
      //   ERROR_WEB3_MAP[error?.innerError?.code] || ERROR_MAP.CANNOT_SWAP_TOKEN,
      // );
      // // console.log('asdasd', error);
      // // throw new BadRequestException(ERROR_MAP.CANNOT_SWAP_TOKEN);
      // throw new BadRequestException(
      //   ERROR_WEB3_MAP[error?.innerError?.code] || ERROR_MAP.CANNOT_SWAP_TOKEN,
      // );
    }
  }

  async unwrap({
    wrappedTokenAddress,
    account,
    rpcURL,
  }: {
    wrappedTokenAddress: string;
    account: Web3Account;
    rpcURL: string;
  }) {
    const web3 = new Web3(rpcURL);

    const contract = new web3.eth.Contract(tokenABI, wrappedTokenAddress);

    const balance = await contract.methods.balanceOf(account.address).call();
    const gasPrice = await web3.eth.getGasPrice();
    console.log('balance', balance);
    const tx = await account.signTransaction({
      from: account.address,
      to: wrappedTokenAddress,
      data: contract.methods.withdraw(balance).encodeABI(),
      gasPrice,
    });

    const response = await web3.eth.sendSignedTransaction(tx.rawTransaction);

    console.log('unwrap', response);
  }
}

export class SwapFactory {
  constructor(
    private readonly web3Service: Web3Service,
    private readonly tokenService: TokenService,
  ) {}

  create(type: ESwapTokenType) {
    if (type === ESwapTokenType.ERC20) {
      return new SwapERC20Token(this.web3Service, this.tokenService);
    }
    return new SwapNativeToken(this.web3Service);
  }
}
