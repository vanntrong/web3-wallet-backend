import { User } from '@/entities/user/user.entity';
import { UserSecret } from '@/entities/user/userSecret.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
  imports: [
    TypeOrmModule.forFeature([User, UserSecret]),
    UserModule,
    JwtModule.register({}),
  ],
})
export class AuthModule {}
