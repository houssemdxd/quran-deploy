import { Test, TestingModule } from '@nestjs/testing';
import { EngagementItemController } from './engagement-item.controller';
import { EngagementItemService } from './engagement-item.service';

describe('EngagementItemController', () => {
  let controller: EngagementItemController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EngagementItemController],
      providers: [EngagementItemService],
    }).compile();

    controller = module.get<EngagementItemController>(EngagementItemController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
