import { Controller, Post, Get, Put, Delete, Param, Body, UseGuards, Headers } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import * as firebaseAdmin from 'firebase-admin';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async createBooking(@Body() dto: CreateBookingDto, @Headers('authorization') token: string): Promise<string> {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token.replace('Bearer ', ''));
    const userId = decodedToken.uid;
    return this.bookingService.createBooking(dto, userId);
  }

  @Get('user/:userId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async getBookingsByUser(@Param('userId') userId: string) {
    return this.bookingService.getBookingsByUser(userId);
  }

  @Get('event/:eventId')
  async getBookingsByEvent(@Param('eventId') eventId: string) {
    return this.bookingService.getBookingsByEvent(eventId);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async updateBooking(@Param('id') bookingId: string, @Body() dto: UpdateBookingDto, @Headers('authorization') token: string) {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token.replace('Bearer ', ''));
    const userId = decodedToken.uid;
    await this.bookingService.updateBooking(bookingId, dto, userId);
    return { message: 'Booking mis à jour avec succès' };
  }

  /*@Delete(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async deleteBooking(@Param('id') bookingId: string, @Headers('authorization') token: string) {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token.replace('Bearer ', ''));
    const userId = decodedToken.uid;
    await this.bookingService.deleteBooking(bookingId, userId);
    return { message: 'Booking supprimé avec succès' };
  }*/
}