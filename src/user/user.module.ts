import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { FileModule } from 'src/media.service/file.module';
import { VideoModule } from 'src/video/video.module';

@Module({
  imports: [FileModule, forwardRef(() => VideoModule)],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService]
})
export class UserModule {}
