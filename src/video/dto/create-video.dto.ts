import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVideoDto {
  
  @ApiProperty({ description: 'Titre de la vidéo', example: 'Recitation Sourate Al-Fatiha' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Sourate associée (optionnel)', example: 'Al-Fatiha', required: false })
  @IsOptional()
  @IsString()
  surah?: string;

  @ApiProperty({ description: 'Description de la vidéo (optionnel)', example: 'Belle recitation', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Fichier vidéo (optionnel, à gérer via multer)', type: 'string', format: 'binary', required: false })
  @IsOptional()
  videoFile?: Express.Multer.File; 
}

