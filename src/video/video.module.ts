/* eslint-disable prettier/prettier */
import { forwardRef, Module } from '@nestjs/common';
import { VideoService } from './video.service';
import { VideoController } from './video.controller';
import { UserModule } from 'src/user/user.module';
import { GeminiService } from 'src/gemini-service/gemini-service.service';

@Module({
  imports: [forwardRef(() => UserModule)],
  controllers: [VideoController],
  providers: [VideoService,GeminiService],
  exports: [VideoService,GeminiService],
})
export class VideoModule {}
