import { Global, Module } from '@nestjs/common';
import { WsGateway } from './ws.gateway';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../user/user.module';

@Global()
@Module({
  providers: [WsGateway],
  exports: [WsGateway],
  imports: [JwtModule, UserModule],
})
export class WsModule {}
