import { PartialType } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';
import { CreateCommentDto } from './create-comment.dto';

export class UpdateCommentDto extends PartialType(CreateCommentDto) {
  @ApiProperty({ description: 'Nouveau prix (pour admins)', required: false })
  @IsOptional()
  @IsNumber()
  commentPrice?: number;
}