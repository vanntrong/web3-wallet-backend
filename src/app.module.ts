import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './configs/configuration';
import { DatabaseLoader } from './loaders/database/database.loader';
import { AuthModule } from './modules/auth/auth.module';
import { TokenModule } from './modules/token/token.module';
import { TransactionModule } from './modules/transaction/transaction.module';
import { UserModule } from './modules/user/user.module';
import { Web3Module } from './modules/web3/web3.module';
import { NetworkModule } from './modules/network/network.module';
import { PythModule } from './modules/pyth/pyth.module';
import { SwapModule } from './modules/swap/swap.module';
import { GasModule } from './modules/gas/gas.module';
import { WsModule } from './modules/ws/ws.module';
import { UploadModule } from './modules/upload/upload.module';
import { ExpoModule } from './modules/expo/expo.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
      // ignoreEnvFile: true,
      load: [configuration],
    }),
    DatabaseLoader.init(),
    AuthModule,
    UserModule,
    Web3Module,
    TransactionModule,
    TokenModule,
    NetworkModule,
    PythModule,
    SwapModule,
    GasModule,
    WsModule,
    UploadModule,
    ExpoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
