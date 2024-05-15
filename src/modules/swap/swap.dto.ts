import { IsAddress } from '@/common/validators';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class GetSwapQuote {
  @IsAddress()
  @IsOptional()
  tokenIn?: string;

  @IsAddress()
  @IsOptional()
  tokenOut?: string;

  @IsNumber()
  @Transform(({ value }) => Number(value))
  amount: number;

  @IsUUID('4')
  @IsNotEmpty()
  networkId: string;
}

export class CreateSwapQuote extends GetSwapQuote {
  @IsNumber()
  @IsOptional()
  @Transform((param) => Number(param.value))
  maxPriorityFeePerGas?: number;

  @IsNumber()
  @IsOptional()
  @Transform((param) => Number(param.value))
  baseFee?: number;
}
