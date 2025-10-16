import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { UserModule } from 'src/user/user.module';
import { MessageController } from './messages.controller';


@Module({
  imports: [UserModule], 
  providers: [MessageService],
  controllers: [MessageController]
})
export class MessagesModule {}