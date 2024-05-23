import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { NetworkService } from './network.service';
import { JwtAuthGuard } from '@/guards/jwt.guard';
import { User } from '@/decorators';
import { CreateNetworkDto, CreateNetworkSwapDto } from './network.dto';
import { generateResponse } from '@/utils/response';

@Controller('networks')
export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  createNetwork(@User('id') id: string, @Body() body: CreateNetworkDto) {
    return this.networkService.createNetwork(id, body);
  }

  @Post(':id/swap')
  @UseGuards(JwtAuthGuard)
  async createNetworkSwap(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateNetworkSwapDto,
  ) {
    const response = await this.networkService.createNetworkSwap(id, body);
    return generateResponse('success', response.id);
  }
}
