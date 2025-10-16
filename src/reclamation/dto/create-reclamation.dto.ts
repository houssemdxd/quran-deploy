// src/reclamation/dto/create-reclamation.dto.ts
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReclamationCategory } from '../entities/reclamation.entity';

export class CreateReclamationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Le titre ne peut pas dépasser 100 caractères.' })
  title: string;

  @IsEnum(ReclamationCategory)
  category: ReclamationCategory;

  @IsString()
  @IsOptional()
  @MaxLength(300, { message: 'La réclamation ne peut pas dépasser 300 caractères.' })
  description?: string;
}