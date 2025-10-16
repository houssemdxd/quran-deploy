import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { BookingStatus } from '../entities/booking.entity';

export class CreateBookingDto {
  @ApiProperty({ description: 'ID de l\'événement à réserver' })
  @IsNotEmpty()
  @IsString()
  eventId: string;

  @ApiProperty({ description: 'Statut initial de la réservation', enum: BookingStatus })
  @IsNotEmpty()
  @IsEnum(BookingStatus)
  status: BookingStatus;
}