import { Module } from '@nestjs/common';
import { EngagementItemService } from './engagement-item.service';
import { EngagementItemController } from './engagement-item.controller';

@Module({
  controllers: [EngagementItemController],
  providers: [EngagementItemService],
})
export class EngagementItemModule {}
