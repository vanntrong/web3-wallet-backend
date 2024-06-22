import { DEFAULT_TOKEN_DECIMAL, SWAP_FEE } from '@/configs/web3';
import { ERROR_MAP, ERROR_WEB3_MAP } from '@/constants/errorMap';
import * as quoteAbi from '@/contracts/quote.json';
import * as swapTokenAbi from '@/contracts/swapToken2.json';
import { TokenNetwork } from '@/entities/token/tokenNetwork.entity';
import { stringToHex, toWei, weiToNumber } from '@/utils/converter';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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
          throw new BadRequestException(ERROR_MAP.SWAP_DOES_NOT_EXIST);
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
    // try {
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
      })
      .catch((error) => {
        let message = 'Cant swap token';
        if (error?.innerError?.code) {
          message = ERROR_WEB3_MAP[error?.innerError?.code] || message;
        }
        this.wsGateway.sendToClient(userId, 'swapFailed', {
          message,
        });
      });
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
        throw new BadRequestException(ERROR_MAP.SWAP_DOES_NOT_EXIST);
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
}
