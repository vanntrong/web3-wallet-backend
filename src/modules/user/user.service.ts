import { User } from '@/entities/user/user.entity';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsRelationByString,
  FindOptionsRelations,
  Repository,
} from 'typeorm';
import {
  AddPushNotificationTokenDto,
  CreateUserDto,
  GetBalanceTokenDto,
  ImportTokenDto,
  UpdateUserDto,
} from './user.dto';
import { UserSecret } from '@/entities/user/userSecret.entity';
import { NetworkService } from '../network/network.service';
import { ERROR_MAP } from '@/constants/errorMap';
import { TokenService } from '../token/token.service';
import { UserNetworkToken } from '@/entities/user/userNetworkToken.entity';
import { Web3Service } from '../web3/web3.service';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class UserService {
  logger: Logger;
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(UserSecret)
    private readonly userSecretRepository: Repository<UserSecret>,
    @InjectRepository(UserNetworkToken)
    private readonly userNetworkTokenRepository: Repository<UserNetworkToken>,
    private readonly networkService: NetworkService,
    private readonly tokenService: TokenService,
    private readonly web3Service: Web3Service,
    private readonly uploadService: UploadService,
  ) {
    this.logger = new Logger(UserService.name);
  }

  async createUser(data: CreateUserDto, addDefaultNetwork?: boolean) {
    const user = await this.userRepository.save({
      ...data,
    });

    const userSecret = await this.userSecretRepository.save({
      ...data,
      user,
    });

    if (addDefaultNetwork) {
      this.$addDefaultNetworkForUser(user);
    }

    this.userRepository.save({
      ...user,
      secret: userSecret,
    });

    return {
      user,
      userSecret,
    };
  }

  async findById(
    id: string,
    relations?: FindOptionsRelationByString | FindOptionsRelations<User>,
  ) {
    const user = await this.userRepository.findOne({
      where: { id, deletedAt: null },
      relations: {
        secret: true,
        ...relations,
      },
    });

    return user;
  }

  async findByAddress(address: string) {
    const user = await this.userRepository.findOne({
      where: { address, deletedAt: null },
      relations: ['secret'],
    });

    return user;
  }

  async addNetwork(userId: string, networkIds: string[]) {
    const user = await this.userRepository.findOne({
      where: { id: userId, deletedAt: null },
      relations: {
        networks: true,
      },
    });

    if (!user) throw new BadRequestException(ERROR_MAP.USER_NOT_FOUND);

    const networks = await this.networkService.findManyById(networkIds);

    this.userRepository.save({
      ...user,
      networks: [...user.networks, ...networks],
    });
  }

  async removeNetwork(userId: string, networkIds: string[]) {
    const user = await this.userRepository.findOne({
      where: { id: userId, deletedAt: null },
      relations: {
        networks: true,
      },
    });

    if (!user) throw new BadRequestException(ERROR_MAP.USER_NOT_FOUND);

    const newNetworkList = user.networks.filter(
      (network) => !networkIds.includes(network.id),
    );

    this.userRepository.save({
      ...user,
      networks: newNetworkList,
    });
  }

  async importToken(userId: string, data: ImportTokenDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId, deletedAt: null },
    });

    if (!user) throw new BadRequestException(ERROR_MAP.USER_NOT_FOUND);

    const tokenNetworks = await Promise.all(
      data.contractAddresses.map((contractAddress) =>
        this.tokenService.findOrCreateIfNotExist({
          contractAddress,
          networkId: data.networkId,
        }),
      ),
    );

    tokenNetworks.forEach((tokenNetwork) => {
      this.userNetworkTokenRepository.save({
        tokenNetwork,
        user,
      });
    });
  }

  async getUserTokens(userId: string, networkId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, deletedAt: null },
    });

    const network = await this.networkService.findById(networkId);
    if (!network) throw new BadRequestException(ERROR_MAP.NETWORK_NOT_FOUND);

    const userTokens = await this.userNetworkTokenRepository.find({
      where: {
        user: {
          id: user.id,
        },
        tokenNetwork: {
          network: {
            id: network.id,
          },
        },
      },
      relations: {
        tokenNetwork: {
          token: true,
        },
      },
    });

    const tokensWithBalance = await Promise.all(
      userTokens.map(async (userToken) => {
        const balance = await this.web3Service.checkBalance({
          rpcURL: network.rpcURL,
          target: user.address,
          tokenAddress: userToken.tokenNetwork.contractAddress,
          tokenDecimal: userToken.tokenNetwork.token.decimal,
        });

        return {
          // ...userToken,
          balance,
          token: userToken.tokenNetwork.token,
          contractAddress: userToken.tokenNetwork.contractAddress,
        };
      }),
    );

    const mainTokenBalance = await this.web3Service.checkBalance({
      target: user.address,
      rpcURL: network.rpcURL,
    });

    return {
      mainToken: {
        symbol: network.currentSymbol,
        balance: mainTokenBalance,
        priceFeedId: network.priceFeedId,
        thumbnail: network.thumbnail,
      },
      otherTokens: tokensWithBalance.map((token) => ({
        balance: token.balance,
        contractAddress: token.contractAddress,
        ...token.token,
      })),
    };
  }

  async update(
    id: string,
    { selectedNetworkId, avatar, ...body }: UpdateUserDto,
  ) {
    const user = await this.userRepository.findOne({
      where: {
        id,
      },
      relations: {
        currentSelectedNetwork: true,
      },
    });

    if (!user) throw new BadRequestException(ERROR_MAP.USER_NOT_FOUND);

    let network = user.currentSelectedNetwork;

    if (selectedNetworkId) {
      network = await this.networkService.findById(selectedNetworkId, {
        networkSwap: false,
      });
      if (!network) throw new BadRequestException(ERROR_MAP.NETWORK_NOT_FOUND);
    }

    if (avatar) {
      avatar = (
        await this.uploadService.uploadFile(avatar, {
          prefix: `${user.id}/avatar/`,
          input: {
            ACL: 'public-read',
          },
        })
      ).url;
      user.avatar = avatar;
    }

    return this.userRepository.save({
      ...user,
      ...body,
      currentSelectedNetwork: network,
    });
  }

  async getBalance(userId: string, query: GetBalanceTokenDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId, deletedAt: null },
    });

    if (!user) throw new BadRequestException(ERROR_MAP.USER_NOT_FOUND);

    const network = await this.networkService.findById(query.networkId);

    if (!network) throw new BadRequestException(ERROR_MAP.NETWORK_NOT_FOUND);

    return this.web3Service.checkBalance({
      target: user.address,
      rpcURL: network.rpcURL,
      tokenAddress: query.contractAddress,
      tokenDecimal: query.tokenDecimal,
    });
  }

  async addPushNotificationToken(
    userId: string,
    body: AddPushNotificationTokenDto,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new BadRequestException(ERROR_MAP.USER_NOT_FOUND);

    if (!user.pushNotificationTokens.includes(body.token)) {
      await this.userRepository.save({
        ...user,
        pushNotificationTokens: [...user.pushNotificationTokens, body.token],
      });
    }
  }

  async $isEmailExist(email: string) {
    const existUser = await this.userRepository.findOne({
      where: {
        email,
        deletedAt: null,
      },
    });

    if (existUser) return true;
    return false;
  }

  private async $addDefaultNetworkForUser(user: User) {
    const networks = await this.networkService.getDefaultNetworks();

    this.userRepository.save({
      ...user,
      networks,
      currentSelectedNetwork: networks[0],
    });
  }
}
