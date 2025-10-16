import { IsString } from 'class-validator';
export class UpdateMessageDto {
  @IsString() messageId: string;
  @IsString() newContent: string;
  @IsString() partnerId: string; // pour recalcul lastMessage si besoin
}