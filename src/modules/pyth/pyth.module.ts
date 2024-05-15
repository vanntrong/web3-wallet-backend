import { Global, Module } from '@nestjs/common';
import { PythService } from './pyth.service';

@Global()
@Module({
  exports: [PythService],
  providers: [PythService],
})
export class PythModule {}
