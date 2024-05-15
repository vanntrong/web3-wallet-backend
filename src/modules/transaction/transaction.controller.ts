import { User } from '@/decorators';
import { JwtAuthGuard } from '@/guards/jwt.guard';
import { generateResponse } from '@/utils/response';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SubscribeMessage, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'ws';
import {
  CreateTransactionDto,
  EstimateGasDto,
  QueryUserLastSentTransactionsDto,
  QueryUserTransactionsDto,
} from './transaction.dto';
import { TransactionService } from './transaction.service';

@Controller('transactions')
export class TransactionController {
  @WebSocketServer() private readonly server: Server;
  constructor(private readonly transactionService: TransactionService) {}

  @Post('')
  @SubscribeMessage('createTransaction')
  @UseGuards(JwtAuthGuard)
  createTransaction(
    @Body() body: CreateTransactionDto,
    @User('id') id: string,
  ) {
    return this.transactionService.createTransaction(id, body);
  }

  @Get('')
  @UseGuards(JwtAuthGuard)
  getUserTransactions(
    @Query() query: QueryUserTransactionsDto,
    @User('address') userAddress: string,
  ) {
    return this.transactionService.getUserTransactions(userAddress, query);
  }

  // @Get('last-sent')
  // @UseGuards(JwtAuthGuard)
  // getUserLastSentTransactions(
  //   @Query() query: QueryUserLastSentTransactionsDto,
  //   @User('address') userAddress: string,
  // ) {
  //   return this.transactionService.getUserTransactions(userAddress, query);
  // }

  @Get('estimate-gas')
  @UseGuards(JwtAuthGuard)
  async estimateGas(@Query() body: EstimateGasDto, @User('id') id: string) {
    const response = await this.transactionService.estimateGas(id, body);
    return generateResponse('success', response);
  }

  // @Patch('/:id/confirm')
  // @UseGuards(JwtAuthGuard)
  // confirmTransaction(
  //   @Param('id') id: string,
  //   @User('address') address: string,
  // ) {
  //   return this.transactionService.confirmTransaction(address, id);
  // }

  @Patch('/:id/cancel')
  @UseGuards(JwtAuthGuard)
  cancelTransaction(@Param('id') id: string, @User('address') address: string) {
    return this.transactionService.cancelTransaction(address, id);
  }
}
