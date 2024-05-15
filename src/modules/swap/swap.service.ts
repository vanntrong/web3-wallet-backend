import { DEFAULT_TOKEN_DECIMAL, SWAP_FEE } from '@/configs/web3';
import { ERROR_MAP, ERROR_WEB3_MAP } from '@/constants/errorMap';
import * as quoteAbi from '@/contracts/quote.json';
import * as swapTokenAbi from '@/contracts/swapToken2.json';
import { TokenNetwork } from '@/entities/token/tokenNetwork.entity';
import { stringToHex, toWei, weiToNumber } from '@/utils/converter';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import Web3 from 'web3';
import { NetworkService } from '../network/network.service';
import { TokenService } from '../token/token.service';
import { UserService } from '../user/user.service';
import { Web3Service } from '../web3/web3.service';
import { WsGateway } from '../ws/ws.gateway';
import { CreateSwapQuote, GetSwapQuote } from './swap.dto';
import { SwapFactory } from './swap.factory';
import { getSwapType } from './swap.helper';
import { TSwapQuoteResponse } from './swap.type';

@Injectable()
export class SwapService {
  logger: Logger;

  constructor(
    private readonly networkService: NetworkService,
    private readonly tokenService: TokenService,
    private readonly userService: UserService,
    private readonly web3Service: Web3Service,
    private readonly wsGateway: WsGateway,
  ) {
    this.logger = new Logger(SwapService.name);
  }

  async getQuote(data: GetSwapQuote) {
    try {
      const network = await this.networkService.findById(data.networkId, {
        networkSwap: true,
      });

      if (!network) throw new BadRequestException(ERROR_MAP.NETWORK_NOT_FOUND);
      if (!network.networkSwap)
        throw new BadRequestException(ERROR_MAP.SWAP_DOES_NOT_EXIST);

      let tokenNetwork: TokenNetwork = null;
      if (data.tokenIn) {
        tokenNetwork = await this.tokenService.findOrCreateIfNotExist({
          contractAddress: data.tokenIn,
          networkId: data.networkId,
        });
      }

      if (!data.tokenOut) {
        if (!network.networkSwap.wrappedTokenAddress)
          throw new InternalServerErrorException(ERROR_MAP.SWAP_DOES_NOT_EXIST);
        data.tokenOut = network.networkSwap.wrappedTokenAddress;
      }

      const web3 = new Web3(network.rpcURL);
      const contract = new web3.eth.Contract(
        quoteAbi,
        network.networkSwap.quoteContactAddress,
      );

      const response: TSwapQuoteResponse = await contract.methods
        .quoteExactInputSingle({
          tokenIn: data.tokenIn ?? network.networkSwap.wrappedTokenAddress,
          tokenOut: data.tokenOut,
          amountIn: toWei(
            data.amount,
            tokenNetwork?.token?.decimal || DEFAULT_TOKEN_DECIMAL,
          ).toString(),
          fee: SWAP_FEE.toString(),
          sqrtPriceLimitX96: '0',
        })
        .call();

      const amountOut = weiToNumber(
        response.amountOut,
        tokenNetwork?.token?.decimal || DEFAULT_TOKEN_DECIMAL,
      );
      const gasEstimate = weiToNumber(response.gasEstimate);
      return {
        amountOut,
        gasEstimate,
      };
    } catch (error) {
      console.log(error);
      throw new BadRequestException('Please try later or change pair', {
        description: ERROR_MAP.THIS_PAIR_DOES_NOT_READY_TO_SWAP,
      });
    }
  }

  async createSwap(userId: string, data: CreateSwapQuote) {
    try {
      const [user, network] = await Promise.all([
        this.userService.findById(userId),
        this.networkService.findById(data.networkId, {
          networkSwap: true,
        }),
      ]);

      if (!user) throw new BadRequestException(ERROR_MAP.USER_NOT_FOUND);
      if (!network) throw new BadRequestException(ERROR_MAP.NETWORK_NOT_FOUND);
      if (!network.networkSwap)
        throw new BadRequestException(ERROR_MAP.SWAP_DOES_NOT_EXIST);
      const contractAddress = network.networkSwap.swapContractAddress;
      console.log('contractAddress', contractAddress);

      const web3 = new Web3(network.rpcURL);
      const contract = new web3.eth.Contract(swapTokenAbi, contractAddress);
      const account = web3.eth.accounts.privateKeyToAccount(
        stringToHex(user.secret.privateKey),
      );

      const nativeBalance = await web3.eth.getBalance(user.address);
      const type = getSwapType(data.tokenIn);
      const swapFactory = new SwapFactory(
        this.web3Service,
        this.tokenService,
      ).create(type);

      swapFactory
        .swap({
          data,
          contract,
          contractAddress,
          rpcURL: network.rpcURL,
          wrappedTokenAddress: network.networkSwap.wrappedTokenAddress,
          account,
          receiverAddress: user.address,
          nativeBalance,
        })
        .then(() => {
          this.wsGateway.sendToClient(user.id, 'swapSuccess', data);
          this.wsGateway.updateNewBalance(user.id, network.id);
        });
    } catch (error) {
      let message = 'Cant swap token';
      if (error?.innerError?.code) {
        message = ERROR_WEB3_MAP[error?.innerError?.code] || message;
      }
      this.wsGateway.sendToClient(userId, 'swapFailed', {
        message,
      });
      console.log(error);

      throw new InternalServerErrorException(message, error);
    }
  }

  async estimateGas(userId: string, data: CreateSwapQuote) {
    const [user, network] = await Promise.all([
      this.userService.findById(userId),
      this.networkService.findById(data.networkId, {
        networkSwap: true,
      }),
    ]);

    if (!user) throw new BadRequestException(ERROR_MAP.USER_NOT_FOUND);
    if (!network) throw new BadRequestException(ERROR_MAP.NETWORK_NOT_FOUND);
    if (!network.networkSwap)
      throw new BadRequestException(ERROR_MAP.SWAP_DOES_NOT_EXIST);
    const web3 = new Web3(network.rpcURL);

    const contractAddress = network.networkSwap.swapContractAddress;
    const contract = new web3.eth.Contract(swapTokenAbi, contractAddress);
    console.log('contractAddress', contractAddress);
    if (!data.tokenOut) {
      if (!network.networkSwap.wrappedTokenAddress)
        throw new InternalServerErrorException(ERROR_MAP.SWAP_DOES_NOT_EXIST);
      data.tokenOut = network.networkSwap.wrappedTokenAddress;
    }
    const account = web3.eth.accounts.privateKeyToAccount(
      stringToHex(user.secret.privateKey),
    );

    const type = getSwapType(data.tokenIn);
    const swapFactory = new SwapFactory(
      this.web3Service,
      this.tokenService,
    ).create(type);

    const { readableTransactionFee } = await swapFactory.getEstimateGas({
      data,
      contract,
      contractAddress,
      receiverAddress: user.address,
      rpcURL: network.rpcURL,
      account,
    });

    return readableTransactionFee;
  }
  // 0xb98daf27685118e146b4Cf87ee76c56A6A1A76Fc
  // async $createSwapNativeToken({
  //   tokenOut,
  //   contract,
  // }: {
  //   tokenOut: string;
  //   contract: Contract<typeof swapTokenAbi>;
  // }) {
  //   return contract.methods.swapExactNativeTokenInputSingle(tokenOut);
  // }

  // async $createSwapERC20Token({
  //   tokenOut,
  //   contract,
  //   tokenIn,
  //   amountIn,
  // }: {
  //   tokenOut: string;
  //   contract: Contract<typeof swapTokenAbi>;
  //   tokenIn: string;
  //   amountIn: string;
  // }) {
  //   console.log(tokenIn, tokenOut, amountIn);
  //   return contract.methods.swapExactInputSingle(tokenIn, tokenOut, amountIn);
  // }

  // async $swapNativeToken({
  //   data,
  //   contract,
  //   nativeBalance,
  //   account,
  //   receiverAddress,
  //   contractAddress,
  //   web3,
  // }: {
  //   data: Partial<CreateSwapQuote>;
  //   contract: Contract<typeof swapTokenAbi>;
  //   nativeBalance: bigint;
  //   account: Web3Account;
  //   receiverAddress: string;
  //   contractAddress: string;
  //   web3: Web3;
  // }) {
  //   const amountInWei = toWei(data.amount, DEFAULT_TOKEN_DECIMAL);
  //   const payableMethod = await this.$createSwapNativeToken({
  //     tokenOut: data.tokenOut,
  //     contract,
  //   });

  //   const rawTransaction = {
  //     from: receiverAddress,
  //     to: contractAddress,
  //     value: amountInWei.toString(),
  //     data: payableMethod.encodeABI(),
  //   };

  //   const gasEstimate = await this.web3Service.$estimateGas(
  //     web3,
  //     rawTransaction,
  //   );

  //   const { maxFeePerGas, maxFeePerGasGwei, maxPriorityFeePerGas } =
  //     this.web3Service.$getTransactionMaxFee({
  //       baseFee: data.baseFee,
  //       maxPriorityFeePerGas: data.maxPriorityFeePerGas,
  //     });

  //   const transactionFee = this.web3Service.$calculateTransactionFee({
  //     gasEstimate: gasEstimate,
  //     maxFeePerGas: maxFeePerGasGwei,
  //   });

  //   const finalValue = this.web3Service.getFinalAmount(
  //     amountInWei,
  //     transactionFee,
  //     nativeBalance,
  //   );

  //   const signedTx = await account.signTransaction({
  //     maxFeePerGas,
  //     maxPriorityFeePerGas,
  //     from: receiverAddress,
  //     to: contractAddress,
  //     value: finalValue,
  //     data: payableMethod.encodeABI(),
  //   });

  //   const response = await web3.eth.sendSignedTransaction(
  //     signedTx.rawTransaction as unknown as Bytes,
  //   );
  //   console.log(response);

  //   return;
  // }

  // async $swapERC20Token({
  //   data,
  //   contract,
  //   account,
  //   contractAddress,
  //   web3,
  //   receiverAddress,
  //   wrappedTokenAddress,
  // }: {
  //   data: Partial<CreateSwapQuote>;
  //   contract: Contract<typeof swapTokenAbi>;
  //   account: Web3Account;
  //   contractAddress: string;
  //   web3: Web3;
  //   receiverAddress: string;
  //   wrappedTokenAddress: string;
  // }) {
  //   if (!data.tokenOut) {
  //     // swap erc20 to native token
  //     // because native token doesn't have address, we should use wrapped token
  //     data.tokenOut = wrappedTokenAddress;
  //     console.log('change token out', data.tokenOut);
  //   }

  //   const tokenNetwork = await this.tokenService.findByAddress(data.tokenIn);
  //   console.log('tokenNetwork', tokenNetwork);
  //   const amountInWei = toWei(
  //     data.amount,
  //     tokenNetwork.token.decimal,
  //   ).toString();

  //   // call approve to approve contract spend token_in of user
  //   await this.web3Service.$approve(
  //     {
  //       account,
  //       amount: amountInWei,
  //       tokenAddress: data.tokenIn,
  //     },
  //     web3,
  //     contractAddress,
  //   );

  //   const payableMethod = await this.$createSwapERC20Token({
  //     tokenIn: data.tokenIn,
  //     tokenOut: data.tokenOut,
  //     contract,
  //     amountIn: amountInWei,
  //   });

  //   const rawTransaction = {
  //     from: receiverAddress,
  //     to: contractAddress,
  //     data: payableMethod.encodeABI(),
  //   };
  //   const gasEstimate = await this.web3Service.$estimateGas(
  //     web3,
  //     rawTransaction,
  //   );
  //   const balance = await web3.eth.getBalance(account.address);
  //   const { maxFeePerGas, maxFeePerGasGwei, maxPriorityFeePerGas } =
  //     this.web3Service.$getTransactionMaxFee({
  //       baseFee: data.baseFee,
  //       maxPriorityFeePerGas: data.maxPriorityFeePerGas,
  //     });

  //   const transactionFee = this.web3Service.$calculateTransactionFee({
  //     gasEstimate,
  //     maxFeePerGas: maxFeePerGasGwei,
  //   });

  //   if (transactionFee > balance) {
  //     throw new BadRequestException(ERROR_MAP.INSUFFICIENT_BALANCE);
  //   }

  //   const signedTx = await account.signTransaction({
  //     maxFeePerGas,
  //     maxPriorityFeePerGas,
  //     from: receiverAddress,
  //     to: contractAddress,
  //     data: payableMethod.encodeABI(),
  //   });

  //   const response = await web3.eth.sendSignedTransaction(
  //     signedTx.rawTransaction as unknown as Bytes,
  //   );
  //   console.log(response);
  // }
}
