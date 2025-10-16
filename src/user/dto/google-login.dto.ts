import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEmail, IsOptional } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({ description: "Google ID Token" })
  @IsNotEmpty()
  @IsString()
  idToken: string;

  @ApiProperty({ description: "User's email from Google" })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: "User's display name from Google" })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({ description: "User's photo URL from Google" })
  @IsOptional()
  @IsString()
  photoURL?: string;
}