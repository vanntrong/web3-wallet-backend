import { generateResponse } from '@/utils/response';
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CreateSwapQuote, GetSwapQuote } from './swap.dto';
import { SwapService } from './swap.service';
import { JwtAuthGuard } from '@/guards/jwt.guard';
import { User } from '@/decorators';

@Controller('swap')
export class SwapController {
  constructor(private readonly swapService: SwapService) {}

  @Get('quote')
  @UseGuards(JwtAuthGuard)
  async getQuote(@Query() query: GetSwapQuote) {
    const response = await this.swapService.getQuote(query);

    return generateResponse('success', response);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createSwap(@Body() body: CreateSwapQuote, @User('id') id: string) {
    const response = await this.swapService.createSwap(id, body);

    return generateResponse('success', response);
  }

  @Get('estimate-gas')
  @UseGuards(JwtAuthGuard)
  async estimateGas(@Query() query: CreateSwapQuote, @User('id') id: string) {
    const response = await this.swapService.estimateGas(id, query);

    return generateResponse('success', response);
  }
}
