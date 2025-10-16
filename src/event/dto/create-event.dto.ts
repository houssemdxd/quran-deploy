/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsDateString, IsOptional, IsArray } from 'class-validator';
import { EventType } from '../entities/event.entity';

export class CreateEventDto {
  @ApiProperty({ description: 'Titre de l\'event' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Description de l\'event (optionnel)' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Date et heure de début' })
  //@IsNotEmpty()
  @IsOptional()

  @IsDateString()
  startTime: string;

  @ApiProperty({ description: 'Date et heure de fin (optionnel)' })
  //@IsOptional()
    @IsOptional()

  @IsDateString()
  endTime?: string;

  @ApiProperty({ description: 'Type de l\'event (public or vip)', enum: EventType })
  @IsNotEmpty()
  @IsEnum(EventType)
  type: EventType;

  @ApiProperty({ description: 'Liste des participants pour VIP (optionnel)', type: [String] })
  @IsOptional()
  @IsArray()
  participants?: string[];

  streamUrl?: string; // URL générée par LiveKit/ZEGOCLOUD


  isLive?: boolean; // Statut du live stream


 
}