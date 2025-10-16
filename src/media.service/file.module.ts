import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { multerOptions } from './multer.config';

@Module({
  imports: [MulterModule.register(multerOptions)],
  exports: [MulterModule], 
})
export class FileModule {}