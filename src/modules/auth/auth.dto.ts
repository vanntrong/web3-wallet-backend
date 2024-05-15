import { Match, Mnemonic } from '@/common/validators';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class SignUpDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  biometricPublicKey?: string;
}

export class SignInDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  biometricPublicKey?: string;
}

export class SignInWithBiometricDto {
  @IsString()
  @IsNotEmpty()
  signature: string;

  @IsUUID('4')
  @IsNotEmpty()
  userId: string;
}

export class ImportWalletDto {
  @Mnemonic()
  mnemonic: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Match('password', {
    message: 'Passwords do not match',
  })
  confirmPassword: string;

  @IsString()
  @IsOptional()
  biometricPublicKey?: string;
}
