/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { GeminiServiceService } from './gemini-service.service';

describe('GeminiServiceService', () => {
  let service: GeminiServiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeminiServiceService],
    }).compile();

    service = module.get<GeminiServiceService>(GeminiServiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
