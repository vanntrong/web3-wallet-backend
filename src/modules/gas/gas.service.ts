import configuration from '@/configs/configuration';
import { BadRequestException, Injectable } from '@nestjs/common';
import { TSuggestedGasFees } from './gas.types';
import axios from 'axios';
import { GetSuggestedGasFeesDto } from './gas.dto';
import { NetworkService } from '../network/network.service';
import { ERROR_MAP } from '@/constants/errorMap';
import { gasNetworkChainIdInfuraSupported } from './gas.config';
import Web3, { utils } from 'web3';
import { averageSuggestGas, formatFeeHistory } from './gas.helper';

@Injectable()
export class GasService {
  private readonly historicalBlocks = 4;
  constructor(private readonly networkService: NetworkService) {}

  async getSuggestedGasFees(
    query: GetSuggestedGasFeesDto,
  ): Promise<TSuggestedGasFees> {
    const network = await this.networkService.findById(query.networkId);
    if (!network) throw new BadRequestException(ERROR_MAP.NETWORK_NOT_FOUND);
    if (!gasNetworkChainIdInfuraSupported.includes(network.chainId)) {
      return null;
    }

    const configs = configuration();
    const auth = Buffer.from(
      configs.infura.api_key + ':' + configs.infura.key_secret,
    ).toString('base64');

    const { data } = await axios.get<TSuggestedGasFees>(
      `https://gas.api.infura.io/networks/${network.chainId}/suggestedGasFees`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      },
    );
    return data;
  }

  async getSuggestedGasFeesV2(query: GetSuggestedGasFeesDto) {
    const network = await this.networkService.findById(query.networkId);
    if (!network) throw new BadRequestException(ERROR_MAP.NETWORK_NOT_FOUND);
    const web3 = new Web3(network.rpcURL);
    const feeHistory = await web3.eth.getFeeHistory(
      this.historicalBlocks,
      'latest',
      [1, 50, 90],
    );
    const blocks = formatFeeHistory(feeHistory, this.historicalBlocks);

    const slow = averageSuggestGas(blocks[0].priorityFeePerGas);
    const average = averageSuggestGas(blocks[1].priorityFeePerGas);
    const fast = averageSuggestGas(blocks[2].priorityFeePerGas);

    const blockResult = await web3.eth.getBlock('latest');
    const baseFeePerGas = Number(blockResult.baseFeePerGas);

    return {
      slow: {
        suggestedMaxPriorityFeePerGas: +utils.fromWei(slow, 'Gwei'),
        suggestedMaxFeePerGas: +utils.fromWei(slow + baseFeePerGas, 'Gwei'),
      },
      average: {
        suggestedMaxPriorityFeePerGas: +utils.fromWei(average, 'Gwei'),
        suggestedMaxFeePerGas: +utils.fromWei(average + baseFeePerGas, 'Gwei'),
      },
      fast: {
        suggestedMaxPriorityFeePerGas: +utils.fromWei(fast, 'Gwei'),
        suggestedMaxFeePerGas: +utils.fromWei(fast + baseFeePerGas, 'Gwei'),
      },
      estimatedBaseFee: +utils.fromWei(baseFeePerGas, 'Gwei'),
    };
  }
}
