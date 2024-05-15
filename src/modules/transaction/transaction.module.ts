import { Transaction } from '@/entities/transaction/transaction.entity';
import { AccessTokenStrategy } from '@/strategies';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NetworkModule } from '../network/network.module';
import { TokenModule } from '../token/token.module';
import { UserModule } from '../user/user.module';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { WsModule } from '../ws/ws.module';
import { ExpoModule } from '../expo/expo.module';

@Module({
  controllers: [TransactionController],
  providers: [TransactionService, AccessTokenStrategy],
  exports: [TransactionService],
  imports: [
    UserModule,
    TokenModule,
    NetworkModule,
    TypeOrmModule.forFeature([Transaction]),
    WsModule,
    ExpoModule,
  ],
})
export class TransactionModule {}
