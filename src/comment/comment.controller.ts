/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Patch, Param, UseGuards, Headers } from '@nestjs/common';
import { CommentService } from './comment.service';
  import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import * as firebaseAdmin from 'firebase-admin';

@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async create(@Body() dto: CreateCommentDto, @Headers('authorization') token: string): Promise<string> {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token.replace('Bearer ', ''));
    const senderId = decodedToken.uid;
    return this.commentService.createComment(dto, senderId);
  }

  @Patch(':id/price')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async updatePrice(@Param('id') commentId: string, @Body() dto: UpdateCommentDto) {
    await this.commentService.updateCommentPrice(commentId, dto);
    return { message: 'Prix du commentaire mis à jour avec succès' };
  }

  @Get('video/:videoId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async getCommentsByVideo(@Param('videoId') videoId: string) {
    return this.commentService.getCommentsByVideoId(videoId);
  }
}