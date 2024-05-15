import { IsNotEmpty, IsUUID } from 'class-validator';

export class GetSuggestedGasFeesDto {
  @IsUUID('4')
  @IsNotEmpty()
  networkId: string;
}
