import { HERMES_PYTH_ENDPOINT } from '@/configs/web3';
import { Injectable } from '@nestjs/common';
import axios, { Axios } from 'axios';
import { PythPrice } from './pyth.type';

@Injectable()
export class PythService {
  axios: Axios;

  constructor() {
    this.axios = axios.create({
      baseURL: HERMES_PYTH_ENDPOINT,
    });
  }

  async getPriceFeedId(symbol: string) {
    const query = `Crypto.${symbol.toLocaleUpperCase()}/USD`;
    const res = await axios.get<PythPrice[]>(
      `${HERMES_PYTH_ENDPOINT}/price_feeds`,
      {
        params: { query, asset_type: 'crypto' },
      },
    );

    const priceFeedId = res.data?.[0]?.id ? `0x${res.data[0].id}` : null;
    return priceFeedId;
  }
}
