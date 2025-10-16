/* eslint-disable prettier/prettier */
// create-engagement-item.dto.ts
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateEngagementItemDto {
  @IsString()
  content: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  currency?: string;
}
