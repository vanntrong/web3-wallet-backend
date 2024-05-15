import { PaginationDto } from '@/common/types';
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  @IsOptional()
  tokenAddress?: string;

  @IsUUID('4')
  networkId: string;

  @IsString()
  to: string;

  @IsNumber()
  @Transform((param) => Number(param.value))
  amount: number;

  @IsNumber()
  @IsOptional()
  maxPriorityFeePerGas?: number;

  @IsNumber()
  @IsOptional()
  baseFee?: number;
}

export class QueryUserTransactionsDto extends PaginationDto {
  @IsUUID('4')
  networkId: string;

  @IsUUID('4')
  @IsOptional()
  tokenId?: string;
}

export class QueryUserLastSentTransactionsDto extends PaginationDto {
  @IsUUID('4')
  networkId: string;
}

export class EstimateGasDto {
  @IsString()
  @IsOptional()
  tokenAddress?: string;

  @IsUUID('4')
  networkId: string;

  @IsString()
  to: string;

  @IsNumber()
  @Transform((param) => Number(param.value))
  amount: number;

  @IsNumber()
  @IsOptional()
  @Transform((param) => Number(param.value))
  maxPriorityFeePerGas?: number;

  @IsNumber()
  @IsOptional()
  @Transform((param) => Number(param.value))
  baseFee?: number;
}

export class CreateTransactionNetworkDto {
  @IsString()
  privateKey: string;

  @IsString()
  from: string;

  @IsString()
  to: string;

  @IsNumber()
  amount: number;

  @IsNumber()
  decimal: number;

  @IsNumber()
  @IsOptional()
  maxPriorityFeePerGas?: number;

  @IsNumber()
  @IsOptional()
  baseFee?: number;
}

export class CreateTransactionERC20Dto extends CreateTransactionNetworkDto {
  @IsString()
  tokenAddress: string;
}
