import { User } from '@/entities/user/user.entity';
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserSecret } from '@/entities/user/userSecret.entity';
import { NetworkModule } from '../network/network.module';
import { TokenModule } from '../token/token.module';
import { UserNetworkToken } from '@/entities/user/userNetworkToken.entity';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserSecret, UserNetworkToken]),
    forwardRef(() => NetworkModule),
    TokenModule,
    UploadModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
