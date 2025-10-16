/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AuthGuard } from './guards/auth.guard';
import { FirebaseModule } from './firebase.module';
import { VideoModule } from './video/video.module';
import { CommentModule } from './comment/comment.module';
import { BookingModule } from './booking/booking.module';
import { EventModule } from './event/event.module';
import { GeminiService } from './gemini-service/gemini-service.service';
import { EngagementItemModule } from './engagement-item/engagement-item.module';
import { StripeModule } from './stripe/stripe.module';
import { MessagesModule } from './messages/messages.module';
import { ReclamationModule } from './reclamation/reclamation.module';
import { LivekitController } from './livekit/livekit.controller';

@Module({
  imports: [ConfigModule.forRoot(), UserModule, FirebaseModule, VideoModule, CommentModule,EventModule, BookingModule, EngagementItemModule, StripeModule, MessagesModule, ReclamationModule],
  controllers: [AppController, LivekitController],
  providers: [AppService, AuthGuard, GeminiService],
})
export class AppModule {}