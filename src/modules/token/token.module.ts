import { Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Token } from '@/entities/token/token.entity';
import { TokenNetwork } from '@/entities/token/tokenNetwork.entity';
import { TokenController } from './token.controller';
import { NetworkModule } from '../network/network.module';

@Module({
  providers: [TokenService],
  exports: [TokenService],
  controllers: [TokenController],
  imports: [TypeOrmModule.forFeature([Token, TokenNetwork]), NetworkModule],
})
export class TokenModule {}
