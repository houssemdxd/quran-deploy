/* eslint-disable prettier/prettier */
// dto/create-comment.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ description: 'ID of the engagement item selected (encouragement message)' })
  @IsNotEmpty()
  @IsString()
  engagementItemId: string;

  @ApiProperty({ description: 'ID of the video associated' })
  @IsNotEmpty()
  @IsString()
  videoId: string;
}
