/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// video.controller.ts
import { Controller, Post, Get, Param, Body, Put, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Headers, Delete } from '@nestjs/common';
import { VideoService } from './video.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from 'src/media.service/multer.config';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import * as firebaseAdmin from 'firebase-admin';
import { GeminiService } from 'src/gemini-service/gemini-service.service';

@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService,
        private readonly geminiService: GeminiService, // ✅ injected here

  ) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('video', multerOptions))
  async createVideo(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateVideoDto,
    @Headers('authorization') token: string, // Syntaxe corrigée
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('Le fichier vidéo est requis.');
    }
    dto.videoFile = file; // Mappez le fichier uploadé

    // Extraire le userId du token JWT
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token.replace('Bearer ', ''));
    const userId = decodedToken.uid;
// ✅ Check video with Gemini before saving
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
/*  const analysis = await this.geminiService.analyzeVideo(file);

  if (analysis.toLowerCase().includes('inappropriate')) {
    throw new BadRequestException('Le contenu de la vidéo n’est pas autorisé.');
  }*/
    return this.videoService.createVideo({ ...dto, userId }); // Passez le userId extrait
  }

  @Get('user/:userId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  getVideosByUserId(@Param('userId') userId: string) {
    return this.videoService.getVideosByUserId(userId);
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async getAllVideos() {
    return this.videoService.getAllVideos();
  }

  @Post(':id/like')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async likeVideo(@Param('id') videoId: string, @Headers('authorization') token: string) {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token.replace('Bearer ', ''));
    const userId = decodedToken.uid;
    return this.videoService.likeVideo(videoId, userId);
  }

  @Get(':id/likes')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  getLikes(@Param('id') videoId: string) {
    return this.videoService.getVideoLikes(videoId);
  }

  @Put(':id')
@UseGuards(AuthGuard)
@ApiBearerAuth()
async updateVideo(@Param('id') videoId: string, @Body() dto: UpdateVideoDto, @Headers('authorization') token: string) {
  const decodedToken = await firebaseAdmin.auth().verifyIdToken(token.replace('Bearer ', ''));
  const userId = decodedToken.uid;
  await this.videoService.updateVideo(videoId, dto, userId);
  return { message: 'Vidéo mise à jour avec succès' };
}

  @Get('my-videos')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async getMyVideos(@Headers('authorization') token: string) {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token.replace('Bearer ', ''));
    const userId = decodedToken.uid;
    return this.videoService.getVideosByUserId(userId);
  }


  @Get('my-video/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async getMyVideo(@Param('id') videoId: string, @Headers('authorization') token: string) {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token.replace('Bearer ', ''));
    const userId = decodedToken.uid;
    return this.videoService.getVideoById(videoId, userId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async deleteVideo(@Param('id') videoId: string, @Headers('authorization') token: string) {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token.replace('Bearer ', ''));
    const userId = decodedToken.uid;
    await this.videoService.deleteVideo(videoId, userId);
    return { message: 'Vidéo supprimée avec succès' };
  }

  @Post(':id/view')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async incrementView(@Param('id') videoId: string, @Headers('authorization') token: string) {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token.replace('Bearer ', ''));
    const userId = decodedToken.uid;
    await this.videoService.incrementView(videoId, userId);
    return { message: 'Vue enregistrée avec succès' };
  }

  @Post(':id/share')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async shareVideo(@Param('id') videoId: string, @Headers('authorization') token: string): Promise<{ message: string }> {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token.replace('Bearer ', ''));
    const userId = decodedToken.uid;
    await this.videoService.incrementShare(videoId, userId);
    return { message: 'Vidéo partagée avec succès' };
  }

}

