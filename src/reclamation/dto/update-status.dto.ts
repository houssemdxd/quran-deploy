// src/reclamation/dto/update-status.dto.ts
import { IsEnum } from 'class-validator';
import { ReclamationStatus } from '../entities/reclamation.entity';

export class UpdateReclamationStatusDto {
  @IsEnum(ReclamationStatus)
  status: ReclamationStatus;
}