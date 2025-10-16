/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Inject, BadRequestException, forwardRef } from '@nestjs/common';
import { Booking, BookingStatus } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Event, EventType } from '../event/entities/event.entity';
import { EventService } from '../event/event.service';
import { CommentService } from '../comment/comment.service'; 

@Injectable()
export class BookingService {
  private db;

  constructor(
    @Inject('FIREBASE_ADMIN') private firebaseAdmin,
    @Inject(forwardRef(() => EventService)) private eventService: EventService,
    private commentService: CommentService,
  ) {
    this.db = this.firebaseAdmin.firestore();
  }

  async createBooking(dto: CreateBookingDto, userId: string): Promise<string> {
    const eventRef = this.db.collection('events').doc(dto.eventId);
    const eventDoc = await eventRef.get();
    if (!eventDoc.exists) {
      throw new BadRequestException('Event non trouvé.');
    }

    const eventData = eventDoc.data() as Event;
    if (eventData.type === EventType.VIP && !eventData.participants?.includes(userId)) {
      throw new BadRequestException('Vous n\'êtes pas invité à cet event VIP.');
    }

    if (eventData.isLive) {
      throw new BadRequestException('Impossible de booker un event déjà en cours.');
    }

    const bookingRef = this.db.collection('bookings').doc();
    const bookingData: Booking = {
      id: bookingRef.id,
      userId,
      eventId: dto.eventId,
      status: dto.status,
      createdAt: new Date(),
    };

    await bookingRef.set(bookingData);

    // Incrémenter participantsCount si statut est "participating" ou "confirmed" et event en live
    if (eventData.isLive && (dto.status === BookingStatus.Participating || dto.status === BookingStatus.Confirmed)) {
      await this.eventService.updateParticipantCount(dto.eventId, true);
    }

    console.log('Booking créé avec succès, ID:', bookingRef.id);
    return bookingRef.id;
  }

  async updateBooking(bookingId: string, dto: UpdateBookingDto, userId: string): Promise<void> {
    const bookingRef = this.db.collection('bookings').doc(bookingId);
    const doc = await bookingRef.get();
    if (!doc.exists || doc.data().userId !== userId) {
      throw new BadRequestException('Booking non trouvé ou non autorisé.');
    }

    const eventRef = this.db.collection('events').doc(doc.data().eventId);
    const eventDoc = await eventRef.get();
    const eventData = eventDoc.data() as Event;

    const currentStatus = doc.data().status as BookingStatus;
    const updatedData: Partial<Booking> = {};
    if (dto.status !== undefined) updatedData.status = dto.status;
    updatedData.updatedAt = new Date();

    if (Object.keys(updatedData).length === 1) {
      throw new BadRequestException('Aucun champ à mettre à jour.');
    }

    // Gérer les changements de statut pour participantsCount
    if (eventData.isLive) {
      if (currentStatus !== BookingStatus.Participating && currentStatus !== BookingStatus.Confirmed &&
          (dto.status === BookingStatus.Participating || dto.status === BookingStatus.Confirmed)) {
        await this.eventService.updateParticipantCount(doc.data().eventId, true);
      } else if ((currentStatus === BookingStatus.Participating || currentStatus === BookingStatus.Confirmed) &&
                 dto.status !== BookingStatus.Participating && dto.status !== BookingStatus.Confirmed) {
        await this.eventService.updateParticipantCount(doc.data().eventId, false);
      }
    }

    await bookingRef.update(updatedData);
  }

  async getBookingsByUser(userId: string): Promise<Booking[]> {
    const snapshot = await this.db.collection('bookings').where('userId', '==', userId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
  }

  async getBookingsByEvent(eventId: string): Promise<Booking[]> {
    const snapshot = await this.db.collection('bookings').where('eventId', '==', eventId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
  }

/*  async deleteBooking(bookingId: string, userId: string): Promise<void> {
    const bookingRef = this.db.collection('bookings').doc(bookingId);
    const doc = await bookingRef.get();
    if (!doc.exists || doc.data().userId !== userId) {
      throw new BadRequestException('Booking non trouvé ou non autorisé.');
    }

    const eventRef = this.db.collection('events').doc(doc.data().eventId);
    const eventDoc = await eventRef.get();
    const eventData = eventDoc.data() as Event;

    if (eventData.isLive && (doc.data().status === BookingStatus.Participating || doc.data().status === BookingStatus.Confirmed)) {
      await this.eventService.updateParticipantCount(doc.data().eventId, false);
    }

    // Supprimer les commentaires associés au booking (si liés à une vidéo de l'event)
    if (eventData.videoId) {
      const comments = await this.commentService.getCommentsByVideoId(eventData.videoId);
      for (const comment of comments) {
        if (comment.senderId === userId) {
          await this.commentService.deleteComment(comment.id, userId); // À implémenter dans CommentService
        }
      }
    }

    await bookingRef.delete();
  }*/
}