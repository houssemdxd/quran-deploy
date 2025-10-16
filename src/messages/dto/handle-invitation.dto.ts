import { IsString, IsBoolean } from 'class-validator';

export class HandleInvitationDto {
  @IsString() partnerId: string;
  @IsBoolean() accept: boolean;
}