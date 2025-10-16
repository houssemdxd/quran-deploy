/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { ConfigModule } from '@nestjs/config';

@Module({ 
   imports: [ConfigModule], // 👈 make ConfigService available here

  providers: [StripeService],
  controllers: [StripeController]
})
export class StripeModule {}
