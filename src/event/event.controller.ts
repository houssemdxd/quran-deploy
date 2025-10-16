/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */

import { Controller, Post, Get, Put, Delete, Param, Body, UseGuards, Headers } from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import * as firebaseAdmin from 'firebase-admin';

@Controller('events')
export class EventController {
  
  constructor(private readonly eventService: EventService) {}



@Post(':eventId/join/:participantId')
  async joinEvent(
    @Param('eventId') eventId: string,
    @Param('participantId') participantId: string,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return await  this.eventService.joinEvent(eventId, participantId);
  }



@Get('user/:userId/active-vip-streams')
async getActiveVipStreamsForUser(@Param('userId') userId: string) {
  const result = await this.eventService.findActiveVipStreamsForUser(userId);
  return { count: result.length, streams: result };
}


// DELETE /events/:eventId/participant/:participantId
  @Delete(':eventId/participant/:participantId')
  async removeParticipant(
    @Param('eventId') eventId: string,
    @Param('participantId') participantId: string,
  ) {
    return await  this.eventService.removeParticipant(eventId, participantId);
  }







  //ajbouni
  @Get()
  async getEvents() {
   return this.eventService.getEvents();
  }

  @Get('live')
  async getLiveEvents() {
   return this.eventService.getLiveEvents();
  }
  //ajbouni

  @Post()
  //@UseGuards(AuthGuard)
  @ApiBearerAuth()
  async createEvent(@Body() dto: CreateEventDto, @Headers('authorization') token: string): Promise<string> {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token.replace('Bearer ', ''));
    const reciterId = decodedToken.uid;
    return this.eventService.createEvent(dto, reciterId);
  }
  @Post(':userId')
  async createEvent1(
    @Param('userId') userId: string,
    @Body() dto: CreateEventDto,
  ): Promise<string> {
    return this.eventService.createEvent(dto, userId);
  }
  
/*
  @Post('instant')
  
  @ApiBearerAuth()
  async createInstantEvent(@Body() dto: Partial<CreateEventDto>, @Headers('authorization') token: string): Promise<string> {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token.replace('Bearer ', ''));
    const reciterId = decodedToken.uid;
    return this.eventService.createInstantEvent(dto, reciterId);
  }
/*
  

  @Put(':id/start')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async startLiveStream(@Param('id') eventId: string, @Headers('authorization') token: string) {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token.replace('Bearer ', ''));
    const reciterId = decodedToken.uid;
    await this.eventService.startLiveStream(eventId, reciterId);
    return { message: 'Live stream démarré' };
  }
*/
  @Put(':id/stop')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async stopLiveStream(@Param('id') eventId: string, @Headers('authorization') token: string) {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token.replace('Bearer ', ''));
    const reciterId = decodedToken.uid;
    await this.eventService.stopLiveStream(eventId, reciterId);
    return { message: 'Live stream arrêté' };
  }

 @Put(':id/stop/:userId')
  async stopLiveStream1(
    @Param('id') eventId: string,
    @Param('userId') userId: string,
  ) {
    await this.eventService.stopLiveStream(eventId, userId);
    return { message: `Live stream arrêté pour l'utilisateur ${userId}` };
  }


/*
  @Put(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async updateEvent(@Param('id') eventId: string, @Body() dto: UpdateEventDto, @Headers('authorization') token: string) {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token.replace('Bearer ', ''));
    const reciterId = decodedToken.uid;
    await this.eventService.updateEvent(eventId, dto, reciterId);
    return { message: 'Event mis à jour avec succès' };
  }



*/

}



/*  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async deleteEvent(@Param('id') eventId: string, @Headers('authorization') token: string) {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token.replace('Bearer ', ''));
    const reciterId = decodedToken.uid;
    await this.eventService.deleteEvent(eventId, reciterId);
    return { message: 'Event supprimé avec succès' };
  }
}


*/