import { FindOptionsRelations } from 'typeorm';

export type FindRelationOption<T> = FindOptionsRelations<T>;

import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum ESortOrder {
  ASC,
  DESC,
}

export class PaginationDto {
  @IsNotEmpty()
  offset = 0;

  @IsNotEmpty()
  limit = 10;

  @IsString()
  @IsOptional()
  sortBy: string;

  @IsString()
  @IsOptional()
  @IsEnum(ESortOrder)
  sortOrder: 'ASC' | 'DESC';

  @IsString()
  @IsOptional()
  keyword: string;
}
