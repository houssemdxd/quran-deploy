/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable prettier/prettier */
import { Injectable, Inject, BadRequestException, forwardRef } from '@nestjs/common';
import { Event, EventType } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { BookingService } from '../booking/booking.service';
import { CommentService } from '../comment/comment.service';
import { Timestamp } from 'firebase-admin/firestore';

//import { RtcTokenBuilder } from 'agora-access-token';
/*
const RtcRole = {
  PUBLISHER: 1,
  AUDIENCE: 2,
} as const;
type RtcRoleType = typeof RtcRole[keyof typeof RtcRole];
*/
@Injectable()
export class EventService {
  private db;

  constructor(
    @Inject('FIREBASE_ADMIN') private firebaseAdmin,
    @Inject(forwardRef(() => BookingService)) private bookingService: BookingService,
    @Inject(CommentService) private commentService: CommentService,
  ) {
    this.db = this.firebaseAdmin.firestore();
  }

  async createEvent(dto: CreateEventDto, reciterId: string): Promise<any> {
    console.log(dto);
    const eventRef = this.db.collection('events').doc();
    const eventData: Partial<Event> = {
  id: eventRef.id,
  reciterId,
  title: dto.title,
  description: dto.description,
  ...(dto.startTime ? { startTime: new Date(dto.startTime) } : {}),
  ...(dto.endTime ? { endTime: new Date(dto.endTime) } : {}),
  type: dto.type,
  ...(dto.type === EventType.VIP && { participants: dto.participants || [] }),
  participantsCount: 0,
  streamUrl: dto.streamUrl,
  isLive: dto.isLive,
  createdAt: new Date(), // plain JS Date to match your Event entity
};

    await eventRef.set(eventData);
    console.log('Event créé avec succès, ID:', eventRef.id);
    return { id: eventRef.id };
  }


async removeParticipant(eventId: string, participantId: string): Promise<any> {
  try {
    const eventRef = this.db.collection('events').doc(eventId);
    const eventSnap = await eventRef.get();

    if (!eventSnap.exists) {
      throw new Error('Event not found');
    }

    const eventData = eventSnap.data();
    const participants: string[] = eventData.participants || [];

    if (!participants.includes(participantId)) {
      return { message: 'Participant not found in this event', participants };
    }

    // Remove the participant
    const updatedParticipants = participants.filter(id => id !== participantId);

    // Update Firestore
    await eventRef.update({
      participants: updatedParticipants,
      participantsCount: updatedParticipants.length,
    });

    console.log(`Participant ${participantId} removed from event ${eventId}`);
    return { message: 'Participant removed successfully', participants: updatedParticipants };
  } catch (error) {
    console.error('Error removing participant:', error);
    throw new Error(`Failed to remove participant: ${error.message}`);
  }
}


  async  joinEvent(eventId: string, participantId: string): Promise<any> {
  try {
    const eventRef = this.db.collection('events').doc(eventId);
    const eventSnap = await eventRef.get();

    if (!eventSnap.exists) {
      throw new Error('Event not found');
    }

    const eventData = eventSnap.data();

    // Initialize participants array if missing
    const participants = eventData.participants || [];

    // Check if participant already exists
    if (participants.includes(participantId)) {
      return { message: 'Participant already joined', participants };
    }

    // Add participant
    participants.push(participantId);

    // Update event in Firestore
    await eventRef.update({
      participants,
      participantsCount: participants.length,
    });

    console.log(`Participant ${participantId} added to event ${eventId}`);
    return { message: 'Participant joined successfully', participants };
  } catch (error) {
    console.error('Error joining event:', error);
    throw new Error(`Failed to join event: ${error.message}`);
  }
}


async findActiveVipStreamsForUser(userId: string): Promise<any[]> {
  const eventsRef = this.db.collection('events');

  // 🔹 Query Firestore
  const snapshot = await eventsRef
    .where('isLive', '==', true)
    .where('type', '==', 'vip')
    .where('participants', 'array-contains', userId)
    .get();

  // 🔹 If no matching streams
  if (snapshot.empty) {
    console.log(`No active VIP streams found for user: ${userId}`);
    return [];
  }

  // 🔹 Map results
  const streams = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  console.log(`Found ${streams.length} VIP live streams for user ${userId}`);
  return streams;
}







/*
  async createInstantEvent(dto: Partial<CreateEventDto>, reciterId: string): Promise<string> {
    const eventRef = this.db.collection('events').doc();
    const channelName = `event-${eventRef.id}`;
    const streamUrl = await this.generateStreamUrl(channelName, reciterId, RtcRole.PUBLISHER);

    const eventData: Partial<Event> = {
      id: eventRef.id,
      reciterId,
      title: dto.title || 'Live instantané',
      startTime: new Date(),
      type: dto.type || EventType.Public,
      ...(dto.type === EventType.VIP && { participants: dto.participants || [] }),
      participantsCount: 0,
      isLive: true,
      streamUrl,
      createdAt: new Date(),
    };

    await eventRef.set(eventData);
    await this.sendLiveNotification(eventRef.id);
    return eventRef.id;
  }
*/
  async getEvents(): Promise<Event[]> {
    const snapshot = await this.db.collection('events').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
  }

  /*
  // Ajbouni
  async getLiveEvents(): Promise<Event[]> {
    const snapshot = await this.db.collection('events').where('isLive', '==', true).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
  }
  */
    async getLiveEvents(): Promise<any[]> {
  // Get all live events
  const snapshot = await this.db.collection('events')
    .where('isLive', '==', true)
    .get();

  // Process events in parallel to get reciter details
  const events = await Promise.all(snapshot.docs.map(async (doc) => {
    const eventData = doc.data();
    const reciterId = eventData.reciterId;
    
    try {
      // Get reciter details
      const reciterDoc = await this.db.collection('users').doc(reciterId).get();
      const reciterData = reciterDoc.data();
      
      return {
        id: doc.id,
        ...eventData,
        reciterName: reciterData ? 
          `${reciterData.firstName || ''} ${reciterData.lastName || ''}`.trim() || 'مستخدم' : 
          'مستخدم',
        reciterPhoto: reciterData?.avatar || 'default-avatar-url'
      };
    } catch (error) {
      console.error(`Error fetching reciter ${reciterId}:`, error);
      return {
        id: doc.id,
        ...eventData,
        reciterName: 'مستخدم',
        reciterPhoto: 'default-avatar-url'
      };
    }
  }));

  return events;
}
// Ajbouni

/*
  async startLiveStream(eventId: string, reciterId: string): Promise<void> {
    const eventRef = this.db.collection('events').doc(eventId);
    const doc = await eventRef.get();
    if (!doc.exists || doc.data().reciterId !== reciterId) {
      throw new BadRequestException('Event non trouvé ou non autorisé.');
    }

    const channelName = `event-${eventId}`;
    const streamUrl = await this.generateStreamUrl(channelName, reciterId, RtcRole.PUBLISHER);

    await eventRef.update({
      isLive: true,
      streamUrl,
      participantsCount: 0,
      updatedAt: new Date(),
    });
  }*/

  async stopLiveStream(eventId: string, reciterId: string): Promise<void> {
    const eventRef = this.db.collection('events').doc(eventId);
    const doc = await eventRef.get();
    if (!doc.exists || doc.data().reciterId !== reciterId) {
      throw new BadRequestException('Event non trouvé ou non autorisé.');
    }
    console.log("function of storrping stream "+eventId+" is invocked")

    await eventRef.update({
      isLive: false,
      endTime: new Date(), // Toujours défini ici
      participantsCount: 0,
      updatedAt: new Date(),
    });
  }

  async updateParticipantCount(eventId: string, increment: boolean): Promise<void> {
    const eventRef = this.db.collection('events').doc(eventId);
    const doc = await eventRef.get();
    if (!doc.exists) {
      throw new BadRequestException('Event non trouvé.');
    }

    const currentCount = doc.data().participantsCount || 0;
    const newCount = increment ? currentCount + 1 : Math.max(0, currentCount - 1);
    await eventRef.update({
      participantsCount: newCount,
      updatedAt: new Date(),
    });
  }

  async updateEvent(eventId: string, dto: UpdateEventDto, reciterId: string): Promise<void> {
    const eventRef = this.db.collection('events').doc(eventId);
    const doc = await eventRef.get();
    if (!doc.exists || doc.data().reciterId !== reciterId) {
      throw new BadRequestException('Event non trouvé ou non autorisé.');
    }

    const updatedData: Partial<Event> = {};
    if (dto.title !== undefined) updatedData.title = dto.title;
    if (dto.description !== undefined) updatedData.description = dto.description;
    if (dto.startTime !== undefined) updatedData.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) updatedData.endTime = new Date(dto.endTime); // Inclut uniquement si défini
    if (dto.type !== undefined) updatedData.type = dto.type;
    if (dto.participants !== undefined) updatedData.participants = dto.type === EventType.VIP ? dto.participants : undefined;
    if (Object.keys(updatedData).length > 1) updatedData.updatedAt = new Date(); // updatedAt uniquement si des changements

    if (Object.keys(updatedData).length <= 1) {
      throw new BadRequestException('Aucun champ à mettre à jour.');
    }

    await eventRef.update(updatedData);
  }

/*  async deleteEvent(eventId: string, reciterId: string): Promise<void> {
    const eventRef = this.db.collection('events').doc(eventId);
    const doc = await eventRef.get();
    if (!doc.exists || doc.data().reciterId !== reciterId) {
      throw new BadRequestException('Event non trouvé ou non autorisé.');
    }

    const bookings = await this.bookingService.getBookingsByEvent(eventId);
    for (const booking of bookings) {
      await this.bookingService.deleteBooking(booking.id, booking.userId);
    }

    await eventRef.delete();
  }*/

  
  /*  private async generateStreamUrl(channelName: string, userId: string, role: RtcRoleType): Promise<string> {
    const appID = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;
    if (!appID || !appCertificate) {
      throw new BadRequestException('Agora credentials manquants dans .env');
    }

    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    //const token = RtcTokenBuilder.buildTokenWithUid(appID, appCertificate, channelName, 0, role, privilegeExpiredTs);
    //return `rtc://${channelName}?token=${token}&appId=${appID}`;
  }
*/
  private async sendLiveNotification(eventId: string): Promise<void> {
    console.log(`Notification envoyée pour event ${eventId}`);
  }
}

