/* eslint-disable prettier/prettier */
import { Controller, Post, Body } from '@nestjs/common';
import { StripeService } from './stripe.service';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('checkout')
  async createCheckout(@Body() body: { amount: number; currency: string; email: string }) {
    return this.stripeService.createCheckoutSession(
      body.amount,
      body.currency,
      body.email,
    );
  }
}
