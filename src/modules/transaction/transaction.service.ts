import { DEFAULT_TOKEN_DECIMAL } from '@/configs/web3';
import { ERROR_MAP } from '@/constants/errorMap';
import {
  ETransactionStatus,
  Transaction,
} from '@/entities/transaction/transaction.entity';
import { generateResponse } from '@/utils/response';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { NetworkService } from '../network/network.service';
import { TokenService } from '../token/token.service';
import { UserService } from '../user/user.service';
import { Web3Service } from '../web3/web3.service';
import {
  CreateTransactionDto,
  EstimateGasDto,
  QueryUserLastSentTransactionsDto,
  QueryUserTransactionsDto,
} from './transaction.dto';
import { TransactionFactory } from './transaction.factory';
import { getTransactionType } from './transaction.helper';
import { WsGateway } from '../ws/ws.gateway';
import { ExpoService } from '../expo/expo.service';
import { User } from '@/entities/user/user.entity';

@Injectable()
export class TransactionService {
  logger: Logger;

  constructor(
    private readonly userService: UserService,
    private readonly web3Service: Web3Service,
    private readonly tokenService: TokenService,
    private readonly networkService: NetworkService,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly wsGateway: WsGateway,
    private readonly expoService: ExpoService,
  ) {
    this.logger = new Logger(TransactionService.name);
  }

  async estimateGas(requesterId: string, data: EstimateGasDto) {
    const user = await this.userService.findById(requesterId);

    if (!user) throw new NotFoundException(ERROR_MAP.ACCOUNT_NOT_FOUND);

    const [tokenToNetwork, network] = await Promise.all([
      this.tokenService.findByAddress(data.tokenAddress),
      this.networkService.findById(data.networkId),
    ]);

    if (!network) throw new BadRequestException(ERROR_MAP.NETWORK_NOT_FOUND);

    const type = getTransactionType(tokenToNetwork?.contractAddress);

    const transactionFactory = new TransactionFactory(this.web3Service).create(
      type,
    );

    return transactionFactory.getEstimateGas(
      {
        ...data,
        decimal: tokenToNetwork?.token?.decimal,
        from: user.address,
        privateKey: user.secret.privateKey,
        tokenAddress: tokenToNetwork?.contractAddress,
      },
      network.rpcURL,
    );
  }

  async createTransaction(requesterId: string, body: CreateTransactionDto) {
    const user = await this.userService.findById(requesterId);

    if (!user) throw new NotFoundException(ERROR_MAP.ACCOUNT_NOT_FOUND);

    const [tokenToNetwork, network] = await Promise.all([
      this.tokenService.findByAddress(body.tokenAddress),
      this.networkService.findById(body.networkId),
    ]);

    await this.$isBalanceEnough({
      requesterAddress: user.address,
      tokenAddress: tokenToNetwork?.contractAddress,
      decimal: tokenToNetwork?.token?.decimal,
      amount: body.amount,
      rpcURL: network.rpcURL,
    });

    const transaction = this.transactionRepository.create({
      ...body,
      toAddress: body.to,
      fromAddress: user.address,
      token: tokenToNetwork?.token,
      network: network,
      tokenContractAddress: tokenToNetwork?.contractAddress,
    });
    console.log('transaction', transaction);

    await this.transactionRepository.save(transaction);
    this.$sendNotificationTransactionCreated(user, transaction);

    this.confirmTransaction(user.address, transaction);

    return generateResponse('success', transaction);
  }

  async confirmTransaction(requestAddress: string, transaction: Transaction) {
    const user = await this.userService.findByAddress(requestAddress);
    try {
      this.$isTransactionAlready(transaction, requestAddress);

      const type = getTransactionType(transaction.token);

      const transactionFactory = new TransactionFactory(
        this.web3Service,
      ).create(type);

      const value = await transactionFactory.send(transaction.network.rpcURL, {
        decimal: transaction.token?.decimal || DEFAULT_TOKEN_DECIMAL,
        amount: transaction.amount,
        from: transaction.fromAddress,
        to: transaction.toAddress,
        privateKey: user.secret.privateKey,
        tokenAddress: transaction.tokenContractAddress,
        maxPriorityFeePerGas: transaction.maxPriorityFeePerGas, // gWei
        baseFee: transaction.baseFee, // gWei
      });

      console.log(`transaction ${type} success`, value);

      const gasUsed = await this.web3Service.getGasUsed(
        value.gasUsed as number,
        transaction.network.rpcURL,
        value.effectiveGasPrice as number,
      );

      const transactionUpdated = await this.transactionRepository.save({
        ...transaction,
        transactionHash: value.transactionHash as string,
        blockHash: value.blockHash as string,
        blockNumber: value.blockNumber as number,
        transactionGas: Number(gasUsed),
        transactionStatus: ETransactionStatus.COMPLETED,
      });

      this.$sendNotificationTransactionConfirmed(user, transactionUpdated);
      this.userService.findByAddress(transaction.toAddress).then((user) => {
        if (!user) return;
        console.log('updateNewBalance', user.id, transaction.network.id);
        this.$sendNotificationTransactionConfirmedToReceiver(
          user,
          transactionUpdated,
        );
      });
    } catch (error) {
      const transactionUpdated = await this.transactionRepository.save({
        ...transaction,
        transactionStatus: ETransactionStatus.FAILED,
      });
      this.$sendNotificationTransactionFailed(user, transactionUpdated);
      console.log(error);
    }
  }

  async cancelTransaction(requestAddress: string, transactionId: string) {
    const transaction = await this.transactionRepository.findOne({
      where: {
        id: transactionId,
      },
      relations: {
        token: true,
      },
    });

    this.$isTransactionAlready(transaction, requestAddress);

    this.transactionRepository.save({
      ...transaction,
      transactionStatus: ETransactionStatus.CANCELED,
    });
  }

  async getUserTransactions(
    userAddress: string,
    query: QueryUserTransactionsDto,
  ) {
    const {
      offset = 0,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      ...filter
    } = query;

    const [data, total] = await this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.token', 'token')
      .select()

      .where(
        new Brackets((sub) => {
          sub
            .where('transaction.from_address = :address', {
              address: userAddress,
            })
            .orWhere('transaction.to_address = :address', {
              address: userAddress,
            });
        }),
      )
      .andWhere('transaction.networkId = :network', {
        network: filter.networkId,
      })
      .andWhere(
        new Brackets((sub) => {
          if (query.tokenId) {
            sub.andWhere('transaction.tokenId = :token', {
              token: filter.tokenId,
            });
          }
        }),
      )
      .skip(offset)
      .take(limit)
      .orderBy(`transaction.${sortBy}`, sortOrder)
      .setParameter('address', userAddress)
      .getManyAndCount();

    return generateResponse(
      'success',
      this.$mapTransactionTypeToTransactions(data, userAddress),
      {
        limit,
        offset,
        total,
      },
    );
  }

  private $isTransactionAlready(
    transaction: Transaction,
    requestAddress: string,
  ) {
    if (!transaction)
      throw new NotFoundException(ERROR_MAP.TRANSACTION_NOT_FOUND);

    if (transaction.fromAddress !== requestAddress)
      throw new ForbiddenException(ERROR_MAP.NOT_ALLOW_CONFIRM_TRANSACTION);

    if (transaction.transactionStatus !== ETransactionStatus.PENDING)
      throw new BadRequestException(ERROR_MAP.TRANSACTION_IS_NOT_PENDING);
  }

  private async $isBalanceEnough(data: {
    requesterAddress: string;
    amount: number;
    tokenAddress?: string;
    decimal?: number;
    rpcURL: string;
  }) {
    const balance = await this.web3Service.checkBalance({
      target: data.requesterAddress,
      tokenAddress: data.tokenAddress,
      tokenDecimal: data.decimal,
      rpcURL: data.rpcURL,
    });

    if (data.amount > balance)
      throw new BadRequestException(ERROR_MAP.NOT_ENOUGH_BALANCE);
  }

  private $sendNotificationTransactionCreated(
    user: User,
    transaction: Transaction,
  ) {
    this.wsGateway.sendToClient(user.id, 'transactionCreated', transaction);
    this.expoService.pushNotification(user.pushNotificationTokens, {
      title: 'New transaction created',
      body: 'Your transaction will take time to confirmation',
      data: transaction,
    });
  }

  private $sendNotificationTransactionConfirmed(
    user: User,
    transaction: Transaction,
  ) {
    this.wsGateway.sendToClient(
      user.id,
      'createTransactionSuccess',
      transaction,
    );
    this.expoService.pushNotification(user.pushNotificationTokens, {
      title: 'Transaction completed',
      body: 'Your transaction has been completed',
      data: transaction,
    });
    this.wsGateway.updateNewBalance(user.id, transaction.network.id);
  }

  private $sendNotificationTransactionFailed(
    user: User,
    transaction: Transaction,
  ) {
    this.wsGateway.sendToClient(user.id, 'createTransactionFail', transaction);
    this.expoService.pushNotification(user.pushNotificationTokens, {
      title: 'Transaction failed',
      body: 'Your transaction has been failed',
      data: transaction,
    });
  }

  private $sendNotificationTransactionConfirmedToReceiver(
    user: User,
    transaction: Transaction,
  ) {
    this.wsGateway.updateNewBalance(user.id, transaction.network.id); // update for receiver
    this.expoService.pushNotification(user.pushNotificationTokens, {
      title: 'New transaction detected',
      body: 'You have a new transaction detected',
      data: transaction,
    });
  }

  private $mapTransactionTypeToTransactions(
    transactions: Transaction[],
    userAddress: string,
  ) {
    return transactions.map((transaction) => ({
      ...transaction,
      transactionType: transaction.fromAddress === userAddress ? 'OUT' : 'IN',
    }));
  }
}
