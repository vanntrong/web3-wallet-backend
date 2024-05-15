import { FindRelationOption } from '@/common/types';
import configuration from '@/configs/configuration';
import { ERROR_MAP } from '@/constants/errorMap';
import { Token } from '@/entities/token/token.entity';
import { TokenNetwork } from '@/entities/token/tokenNetwork.entity';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Moralis from 'moralis';
import { ILike, In, Not, Repository } from 'typeorm';
import { NetworkService } from '../network/network.service';
import { PythService } from '../pyth/pyth.service';
import {
  CreateTokenDto,
  QueryTokenFromAddressDto,
  QueryTokensDto,
} from './token.dto';

@Injectable()
export class TokenService {
  logger: Logger;

  constructor(
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,

    @InjectRepository(TokenNetwork)
    private readonly tokenNetworkRepository: Repository<TokenNetwork>,

    private readonly networkService: NetworkService,
    private readonly pythService: PythService,
  ) {
    const config = configuration();
    Moralis.start({
      apiKey: config.moralis.api_key,
    });
  }

  async findByAddress(
    tokenAddress?: string,
    relations?: FindRelationOption<TokenNetwork>,
  ) {
    if (!tokenAddress) return null;

    const tokenNetwork = await this.tokenNetworkRepository.findOneOrFail({
      where: {
        contractAddress: tokenAddress,
      },
      relations: {
        token: true,
        ...relations,
      },
    });

    return tokenNetwork;
  }

  async createToken({ networkId, contractAddress, ...body }: CreateTokenDto) {
    const network = await this.networkService.findById(networkId);
    if (!network) throw new BadRequestException(ERROR_MAP.NETWORK_NOT_FOUND);
    const priceFeedId = await this.pythService.getPriceFeedId(body.symbol);

    const token = await this.tokenRepository.save({
      ...body,
      priceFeedId,
    });

    const tokenNetwork = await this.tokenNetworkRepository.save({
      contractAddress,
      network,
      token,
    });

    return {
      token,
      tokenNetwork,
    };
  }

  async findOrCreateIfNotExist(query: QueryTokenFromAddressDto) {
    const tokenNetwork = await this.tokenNetworkRepository.findOne({
      where: {
        contractAddress: query.contractAddress,
        network: {
          id: query.networkId,
        },
      },
      relations: {
        token: true,
        network: true,
      },
    });

    if (tokenNetwork) return tokenNetwork;

    const network = await this.networkService.findById(query.networkId);

    const tokenInfo = await this.$getTokenInfoMoralis(
      network.chainId,
      query.contractAddress,
    );

    const existToken = await this.tokenRepository.findOne({
      where: [
        {
          name: tokenInfo.name,
        },
      ],
    });

    if (existToken) {
      const tokenNetwork = await this.tokenNetworkRepository.save({
        contractAddress: query.contractAddress,
        network,
        token: existToken,
      });

      return tokenNetwork;
    }

    const priceFeedId = await this.pythService.getPriceFeedId(tokenInfo.symbol);

    const result = await this.createToken({
      ...tokenInfo,
      contractAddress: query.contractAddress,
      networkId: query.networkId,
      priceFeedId,
    });

    return result.tokenNetwork;
  }

  async getInfoFromAddress(query: QueryTokenFromAddressDto) {
    const tokenNetwork = await this.tokenNetworkRepository.findOne({
      where: {
        contractAddress: query.contractAddress,
        network: {
          id: query.networkId,
        },
      },
      relations: {
        token: true,
      },
    });

    if (tokenNetwork) {
      return {
        name: tokenNetwork.token.name,
        symbol: tokenNetwork.token.symbol,
        decimal: tokenNetwork.token.decimal,
        thumbnail: tokenNetwork.token.thumbnail,
        priceFeedId: tokenNetwork.token.priceFeedId,
      };
    }

    const network = await this.networkService.findById(query.networkId);

    // const data =
    const token = await this.$getTokenInfoMoralis(
      network.chainId,
      query.contractAddress,
    );

    if (!token) return null;

    return token;
  }

  async getTokens(query: QueryTokensDto): Promise<[TokenNetwork[], number]> {
    const {
      limit = 10,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      keyword = '',
      excludeContractAddresses = [],
      ...filter
    } = query;

    const network = await this.networkService.findById(filter.networkId);
    if (!network) throw new BadRequestException(ERROR_MAP.NETWORK_NOT_FOUND);

    const [tokensNetwork, count] =
      await this.tokenNetworkRepository.findAndCount({
        where: {
          network: {
            id: filter.networkId,
          },
          token: [
            {
              name: ILike(`%${keyword}%`),
            },
            {
              symbol: ILike(`%${keyword}%`),
            },
          ],
          contractAddress: Not(In(excludeContractAddresses)),
        },
        relations: {
          token: true,
        },
        take: limit,
        skip: offset,
        // order: {
        //   [`token.${sortBy}`]: sortOrder,
        // },
      });

    return [tokensNetwork, count];
  }

  async $getTokenInfoMoralis(chainId: number, address: string) {
    try {
      const chainHex = '0x' + chainId.toString(16);
      const [infoData] = await Promise.all([
        Moralis.EvmApi.token.getTokenMetadata({
          chain: chainHex,
          addresses: [address],
        }),
      ]);
      const token = infoData.raw[0];

      if (!token) return null;

      return {
        name: token.name,
        symbol: token.symbol,
        decimal: Number(token.decimals),
        thumbnail: token.thumbnail,
      };
    } catch (error) {
      console.log(error);
    }
  }
}
