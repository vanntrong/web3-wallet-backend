import { Module } from '@nestjs/common';
import { SwapService } from './swap.service';
import { SwapController } from './swap.controller';
import { NetworkModule } from '../network/network.module';
import { TokenModule } from '../token/token.module';
import { UserModule } from '../user/user.module';

@Module({
  providers: [SwapService],
  exports: [SwapService],
  controllers: [SwapController],
  imports: [NetworkModule, TokenModule, UserModule],
})
export class SwapModule {}
