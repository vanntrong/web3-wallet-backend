import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { GasService } from './gas.service';
import { JwtAuthGuard } from '@/guards/jwt.guard';
import { GetSuggestedGasFeesDto } from './gas.dto';
import { generateResponse } from '@/utils/response';

@Controller('gas')
export class GasController {
  constructor(private readonly gasService: GasService) {}

  @Get('/suggested-gas-fees')
  @UseGuards(JwtAuthGuard)
  async getSuggestedGasFees(@Query() query: GetSuggestedGasFeesDto) {
    const response = await this.gasService.getSuggestedGasFees(query);
    return generateResponse('success', response);
  }
}
