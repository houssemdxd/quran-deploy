/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  
constructor(private configService: ConfigService) {
  const stripeSecret = this.configService.get<string>('STRIPE_SECRET') ?? '';
  this.stripe = new Stripe(stripeSecret);
}


  async createCheckoutSession(amount: number, currency: string, customerEmail: string) {
    return await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: 'Test Payment',
            },
            unit_amount: amount * 100, // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      success_url: 'https://yourdomain.com/success',
      cancel_url: 'https://yourdomain.com/cancel',
    });
  }
}
