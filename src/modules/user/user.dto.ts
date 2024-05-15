import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty()
  privateKey: string;

  @IsString()
  @IsNotEmpty()
  publicKey: string;

  @IsString()
  @IsNotEmpty()
  mnemonic: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsOptional()
  biometricPublicKey?: string;
}

export class AddNetworksDto {
  @IsArray()
  @IsString({ each: true })
  networkIds: string[];
}

export class RemoveNetworksDto extends AddNetworksDto {}

export class ImportTokenDto {
  @IsArray()
  @IsString({ each: true })
  contractAddresses: string[];

  @IsUUID('4')
  networkId: string;
}

export class GetBalanceTokenDto {
  @IsString()
  @IsOptional()
  contractAddress?: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  tokenDecimal?: number;

  @IsUUID('4')
  networkId: string;
}

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsUUID('4')
  @IsOptional()
  selectedNetworkId?: string;

  @IsOptional()
  avatar?: any;
}

export class AddPushNotificationTokenDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^ExponentPushToken\[[a-zA-Z0-9-_]+\]$/, {
    message: 'Invalid token must be ExponentPushToken[...] format',
  })
  token: string;
}
