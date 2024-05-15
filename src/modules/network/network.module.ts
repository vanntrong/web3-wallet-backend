import { Module, forwardRef } from '@nestjs/common';
import { NetworkService } from './network.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Network } from '@/entities/network/network.entity';
import { NetworkController } from './network.controller';
import { UserModule } from '../user/user.module';
import { NetworkSwap } from '@/entities/networkSwap/networkSwap.entity';

@Module({
  providers: [NetworkService],
  exports: [NetworkService],
  controllers: [NetworkController],
  imports: [
    TypeOrmModule.forFeature([Network, NetworkSwap]),
    forwardRef(() => UserModule),
  ],
})
export class NetworkModule {}
