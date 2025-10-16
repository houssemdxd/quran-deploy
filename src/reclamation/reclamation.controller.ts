
import {
  Body, Controller, Post, Get, Param, Put, Delete,
  UseGuards, Headers, UploadedFile, UseInterceptors
} from '@nestjs/common';
import { CreateReclamationDto } from './dto/create-reclamation.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import * as firebaseAdmin from 'firebase-admin';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReclamationService } from './reclamation.service';
import { UpdateReclamationStatusDto } from './dto/update-status.dto';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';

@Controller('reclamations')
@UseGuards(AuthGuard, RolesGuard)
export class ReclamationController {
  constructor(private readonly reclamationService: ReclamationService) {}

  // ----------- USER -----------
  @Post()
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Headers('authorization') token: string,
    @Body() dto: CreateReclamationDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const decoded = await firebaseAdmin.auth().verifyIdToken(token.replace('Bearer ', ''));
    return this.reclamationService.createReclamation(decoded.uid, dto, file);
  }

  @Get('me')
  @ApiBearerAuth()
  async myReclamations(@Headers('authorization') token: string) {
    const decoded = await firebaseAdmin.auth().verifyIdToken(token.replace('Bearer ', ''));
    return this.reclamationService.getUserReclamations(decoded.uid);
  }

  // ----------- ADMIN -----------
  @Get()
  @Roles('Admin')
  @ApiBearerAuth()
  async findAll() {
    return this.reclamationService.getAllReclamations();
  }

  @Put(':id/status')
  @Roles('Admin')
  @ApiBearerAuth()
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateReclamationStatusDto) {
    return this.reclamationService.updateReclamationStatus(id, dto);
  }

  @Delete(':id')
  @Roles('Admin')
  @ApiBearerAuth()
  async remove(@Param('id') id: string) {
    return this.reclamationService.deleteReclamation(id);
  }
}