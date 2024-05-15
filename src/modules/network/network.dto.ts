import { IsAddress } from '@/common/validators';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';

export class CreateNetworkSwapDto {
  @IsAddress()
  @IsNotEmpty()
  swapContractAddress: string;

  @IsAddress()
  @IsNotEmpty()
  factoryContactAddress: string;

  @IsAddress()
  @IsNotEmpty()
  quoteContactAddress: string;

  @IsAddress()
  @IsNotEmpty()
  wrappedTokenAddress: string;
}

export class CreateNetworkDto {
  @IsString()
  name: string;

  @IsUrl()
  rpcURL: string;

  @IsNumber()
  chainId: number;

  @IsString()
  currentSymbol: string;

  @IsString()
  @IsOptional()
  blockExplorerUrl: string;

  @IsString()
  @IsOptional()
  thumbnail: string;

  @IsBoolean()
  @IsOptional()
  isDefaultNetwork: boolean;

  @ValidateNested()
  @Type(() => CreateNetworkSwapDto)
  @IsOptional()
  networkSwap?: CreateNetworkSwapDto;
}
