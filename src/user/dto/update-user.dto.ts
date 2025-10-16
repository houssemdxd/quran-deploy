import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, Matches, IsDateString } from 'class-validator';
import { RegisterUserDto } from './register-user.dto';

export class UpdateUserDto extends PartialType(RegisterUserDto) {
  @ApiProperty({
    description: "The user's new first name (optional)",
    required: false,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    description: "The user's new last name (optional)",
    required: false,
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    description: "The user's new phone number (only digits, optional)",
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]+$/, {
    message: 'Le numéro de téléphone doit contenir uniquement des chiffres',
  })
  phoneNumber?: string;

  @ApiProperty({
    description: "The user's new bio (optional)",
    required: false,
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({
    description: "The user's new location (optional)",
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: "The user's new avatar file (optional)",
    type: 'string',
    format: 'binary',
    required: false,
  })
  @IsOptional()
  avatar?: Express.Multer.File | string;

  @ApiProperty({
    description: "The user's birthdate (ISO string, optional)",
    required: false,
  })
  @IsOptional()
  @IsDateString()
  birthdate?: string;
  latitude?: number;
  longitude?: number;
}
