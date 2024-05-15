import { Module } from '@nestjs/common';
import { GasService } from './gas.service';
import { GasController } from './gas.controller';
import { NetworkModule } from '../network/network.module';

@Module({
  providers: [GasService],
  exports: [GasService],
  controllers: [GasController],
  imports: [NetworkModule],
})
export class GasModule {}
