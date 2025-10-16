/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { PartialType } from '@nestjs/swagger';
import { CreateEngagementItemDto } from './create-engagement-item.dto';
import { IsOptional, IsString, IsNumber } from 'class-validator';

export class UpdateEngagementItemDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;
}
