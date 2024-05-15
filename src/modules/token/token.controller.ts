import { JwtAuthGuard } from '@/guards/jwt.guard';
import { generateResponse } from '@/utils/response';
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  CreateTokenDto,
  QueryTokenFromAddressDto,
  QueryTokensDto,
} from './token.dto';
import { TokenService } from './token.service';

@Controller('tokens')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Post('')
  @UseGuards(JwtAuthGuard)
  async createToken(@Body() body: CreateTokenDto) {
    const response = await this.tokenService.createToken(body);
    return generateResponse('success', {
      id: response.token.id,
    });
  }

  @Get('')
  async getTokens(@Query() query: QueryTokensDto) {
    const [response, count] = await this.tokenService.getTokens(query);

    return generateResponse(
      'success',
      response.map((item) => ({
        ...item.token,
        contractAddress: item.contractAddress,
      })),
      {
        limit: query.limit || 10,
        offset: query.offset || 0,
        total: count,
      },
    );
  }

  @Get('/info-from-address')
  @UseGuards(JwtAuthGuard)
  async getInfoFromAddress(@Query() query: QueryTokenFromAddressDto) {
    const response = await this.tokenService.getInfoFromAddress(query);
    return generateResponse('success', response);
  }
}
