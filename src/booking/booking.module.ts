/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Module, forwardRef } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { CommentModule } from '../comment/comment.module';
import { UserModule } from 'src/user/user.module';
import { EventModule } from 'src/event/event.module';

@Module({
  imports: [
    forwardRef(() => EventModule),
    forwardRef(() => CommentModule),
    forwardRef(() => UserModule),
  ],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}