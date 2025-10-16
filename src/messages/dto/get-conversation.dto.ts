import { IsString, IsOptional, IsNumberString } from 'class-validator';
export class GetConversationDto {
  @IsString() userId: string;               // partenaire
  @IsOptional() @IsNumberString() limit?: string;     // par défaut 50
  @IsOptional() cursor?: string;            // messageId pour pagination (avant ce message)
}