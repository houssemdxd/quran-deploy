import { IsString } from 'class-validator';
export class DeleteConversationDto {
  @IsString() partnerId: string;
}
