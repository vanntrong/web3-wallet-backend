import { PaginationDto } from '@/common/types';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateTokenDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsNumber()
  decimal: number;

  @IsString()
  @IsNotEmpty()
  contractAddress: string;

  @IsString()
  @IsOptional()
  thumbnail: string;

  @IsString()
  @IsOptional()
  priceFeedId?: string;

  @IsString()
  @IsOptional()
  ['24hrPercentChange']?: string;

  @IsUUID('4')
  networkId: string;
}

export class QueryTokenFromAddressDto {
  @IsString()
  @IsNotEmpty()
  contractAddress: string;

  @IsUUID('4')
  networkId: string;
}

export class QueryTokensDto extends PaginationDto {
  @IsUUID('4')
  networkId: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  excludeContractAddresses?: string[];
}
