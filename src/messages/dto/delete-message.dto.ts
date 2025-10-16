import { IsString } from 'class-validator';
export class DeleteMessageDto {
  @IsString() messageId: string;
  @IsString() partnerId: string;
}
