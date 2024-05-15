import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ImportWalletDto,
  SignInDto,
  SignInWithBiometricDto,
  SignUpDto,
} from './auth.dto';
import { generateResponse } from '@/utils/response';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  signUp(@Body() body: SignUpDto) {
    console.log(body);
    return this.authService.signUp(body);
  }

  @Post('sign-in')
  signIn(@Body() body: SignInDto) {
    return this.authService.signIn(body);
  }

  @Post('import')
  async importWallet(@Body() body: ImportWalletDto) {
    const response = await this.authService.importWallet(body);
    return generateResponse('success', response);
  }

  @Post('sign-in-with-biometric')
  async signInWithBiometric(@Body() body: SignInWithBiometricDto) {
    const response = await this.authService.signInWithBiometric(body);
    return generateResponse('success', response);
  }
}
