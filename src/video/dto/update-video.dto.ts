import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UpdateVideoDto {
  @ApiProperty({ description: 'Nouveau titre (optionnel)', example: 'Recitation Mise à Jour', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Nouvelle sourate (optionnel)', example: 'Al-Baqarah', required: false })
  @IsOptional()
  @IsString()
  surah?: string;

  @ApiProperty({ description: 'Nouvelle description (optionnel)', example: 'Mise à jour de la recitation', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
