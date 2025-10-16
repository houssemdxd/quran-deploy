import { Test, TestingModule } from '@nestjs/testing';
import { EngagementItemService } from './engagement-item.service';

describe('EngagementItemService', () => {
  let service: EngagementItemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EngagementItemService],
    }).compile();

    service = module.get<EngagementItemService>(EngagementItemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
