/* eslint-disable prettier/prettier */
import { Module, forwardRef } from '@nestjs/common';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { BookingModule } from '../booking/booking.module'; 
import { CommentModule } from 'src/comment/comment.module';
import { UserModule } from 'src/user/user.module';

@Module({
imports: [
    forwardRef(() => BookingModule),
    forwardRef(() => CommentModule), 
    forwardRef(() => UserModule),
  ],  
  controllers: [EventController],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}

