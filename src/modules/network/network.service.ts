import { Network } from '@/entities/network/network.entity';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsRelationByString,
  FindOptionsRelations,
  In,
  Repository,
} from 'typeorm';
import { CreateNetworkDto, CreateNetworkSwapDto } from './network.dto';
import { UserService } from '../user/user.service';
import { ERROR_MAP } from '@/constants/errorMap';
import { generateResponse } from '@/utils/response';
import { PythService } from '../pyth/pyth.service';
import { NetworkSwap } from '@/entities/networkSwap/networkSwap.entity';

@Injectable()
export class NetworkService {
  logger: Logger;

  constructor(
    @InjectRepository(Network)
    private readonly networkRepository: Repository<Network>,

    @InjectRepository(NetworkSwap)
    private readonly networkSwapRepository: Repository<NetworkSwap>,

    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,

    private readonly pythService: PythService,
  ) {
    this.logger = new Logger(NetworkService.name);
  }

  async getDefaultNetworks() {
    return this.networkRepository.find({
      where: {
        isDefaultNetwork: true,
        deletedAt: null,
      },
    });
  }

  async createNetwork(requestId: string, data: CreateNetworkDto) {
    const user = await this.userService.findById(requestId);

    if (!user) throw new BadRequestException(ERROR_MAP.USER_NOT_FOUND);

    const priceFeedId = await this.pythService.getPriceFeedId(
      data.currentSymbol,
    );

    const network = await this.networkRepository.save({
      ...data,
      priceFeedId,
      creator: user,
    });

    if (data.networkSwap) {
      const networkSwap = await this.$createNetworkSwap(
        network.id,
        data.networkSwap,
      );

      await this.networkRepository.save({
        ...network,
        networkSwap,
      });
    }

    return generateResponse('success', network.id);
  }

  async createNetworkSwap(networkId: string, data: CreateNetworkSwapDto) {
    const network = await this.findById(networkId, { networkSwap: true });

    if (!network) throw new BadRequestException(ERROR_MAP.NETWORK_NOT_FOUND);
    if (network.networkSwap)
      throw new BadRequestException(ERROR_MAP.SWAP_EXIST);

    const networkSwap = await this.$createNetworkSwap(network, data);

    await this.networkRepository.save({
      ...network,
      networkSwap,
    });

    return networkSwap;
  }

  private async $createNetworkSwap(
    network: string | Network,
    data: CreateNetworkSwapDto,
  ) {
    if (typeof network === 'string') {
      network = await this.findById(network);
    }

    const networkSwap = await this.networkSwapRepository.save({
      ...data,
      network: network,
    });

    return networkSwap;
  }

  async getNetworkRelatedUser(userId: string) {
    const networks = await this.networkRepository.find({
      where: {
        users: {
          id: userId,
        },
      },
    });

    return networks;
  }

  async findManyById(ids: string[]) {
    return this.networkRepository.find({
      where: {
        id: In(ids),
      },
    });
  }

  async findById(
    id: string,
    relations?: FindOptionsRelationByString | FindOptionsRelations<Network>,
  ) {
    return this.networkRepository.findOne({
      where: {
        id,
      },
      relations: {
        networkSwap: true,
        ...relations,
      },
    });
  }
}
