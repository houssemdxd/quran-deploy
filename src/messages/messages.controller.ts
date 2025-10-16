import {
  Controller,
  Post,
  Body,
  UseGuards,
  Headers,
  Get,
  Query,
  Put,
  Delete,
  UsePipes,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { SendMessageDto } from './dto/send-message.dto';
import { GetConversationDto } from './dto/get-conversation.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { DeleteMessageDto } from './dto/delete-message.dto';
import { DeleteConversationDto } from './dto/delete-conversation.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import * as firebaseAdmin from 'firebase-admin'; // Ajout de l'import
import { MessageService } from './message.service';

@Controller('messages')
@UsePipes(new ValidationPipe({ transform: true }))
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  /** Helper: extraire uid depuis Authorization: Bearer <token> */
  private async uidFromHeader(authHeader: string): Promise<string> {
    console.log(
      '[uidFromHeader] header reçu =',
      authHeader?.slice(0, 25) + '...',
    );
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('[uidFromHeader][ERROR] Authorization manquante ou invalide');
      throw new BadRequestException('Authorization manquante.');
    }
    const token = authHeader.replace('Bearer ', '');
    const decoded = await firebaseAdmin.auth().verifyIdToken(token);
    console.log('[uidFromHeader] uid décodé =', decoded.uid);
    return decoded.uid;
  }

  // Envoyer un message
  @Post('send')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async send(
    @Headers('authorization') auth: string,
    @Body() dto: SendMessageDto,
  ) {
    const t0 = Date.now();
    console.log('\n[POST /messages/send] START', { dto });
    try {
      const uid = await this.uidFromHeader(auth);
      console.log(
        '[send] sender uid =',
        uid,
        '-> receiverId =',
        dto.receiverId,
      );
      const res = await this.messageService.sendMessage(
        uid,
        dto.receiverId,
        dto.content,
      );
      console.log(
        '[send] OK messageId =',
        res.id,
        'durée(ms)=',
        Date.now() - t0,
      );
      return res;
    } catch (e: any) {
      console.log('[send][ERROR]', e?.message, e?.stack);
      throw e;
    }
  }

  // Récupérer messages d’une conversation (et marquer vus)
  @Get('conversation')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async getConversation(
    @Headers('authorization') auth: string,
    @Query() q: GetConversationDto,
  ) {
    const t0 = Date.now();
    console.log('\n[GET /messages/conversation] START', { q });
    try {
      const uid = await this.uidFromHeader(auth);
      const limit = q.limit ? parseInt(q.limit, 10) : 50;
      console.log(
        '[getConversation] uid =',
        uid,
        'partner =',
        q.userId,
        'limit =',
        limit,
        'cursor =',
        q.cursor,
      );
      const res = await this.messageService.getConversationAndMarkSeen(
        uid,
        q.userId,
        limit,
        q.cursor,
      );
      console.log(
        '[getConversation] msgs =',
        res.messages.length,
        'convId =',
        res.conversation?.id,
        'durée(ms)=',
        Date.now() - t0,
      );
      return res;
    } catch (e: any) {
      console.log('[getConversation][ERROR]', e?.message, e?.stack);
      throw e;
    }
  }

  // Home Chat : toutes les conversations de l’utilisateur
  @Get('home')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async home(
    @Headers('authorization') auth: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const t0 = Date.now();
    console.log('\n[GET /messages/home] START', { limit, cursor });
    try {
      const uid = await this.uidFromHeader(auth);
      const n = limit ? parseInt(limit, 10) : 30;
      console.log('[home] uid =', uid, 'limit =', n, 'cursor =', cursor);
      const res = await this.messageService.listUserConversations(
        uid,
        n /*, cursorTimestamp optionnel */,
      );
      console.log(
        '[home] conversations =',
        res.conversations.length,
        'nextCursor =',
        !!res.nextCursor,
        'durée(ms)=',
        Date.now() - t0,
      );
      return res;
    } catch (e: any) {
      console.log('[home][ERROR]', e?.message, e?.stack);
      throw e;
    }
  }

  // Modifier un message (expéditeur uniquement)
  @Put('update')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async update(
    @Headers('authorization') auth: string,
    @Body() dto: UpdateMessageDto,
  ) {
    const t0 = Date.now();
    console.log('\n[PUT /messages/update] START', { dto });
    try {
      const uid = await this.uidFromHeader(auth);
      console.log(
        '[update] uid =',
        uid,
        'messageId =',
        dto.messageId,
        'partnerId =',
        dto.partnerId,
      );
      const res = await this.messageService.updateMessageContent(
        uid,
        dto.partnerId,
        dto.messageId,
        dto.newContent,
      );
      console.log(
        '[update] OK newContent =',
        res.content,
        'editedAt =',
        res.editedAt,
        'durée(ms)=',
        Date.now() - t0,
      );
      return res;
    } catch (e: any) {
      console.log('[update][ERROR]', e?.message, e?.stack);
      throw e;
    }
  }

  // Supprimer un message (expéditeur uniquement)
  @Delete('delete')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async deleteMsg(
    @Headers('authorization') auth: string,
    @Body() dto: DeleteMessageDto,
  ) {
    const t0 = Date.now();
    console.log('\n[DELETE /messages/delete] START', { dto });
    try {
      const uid = await this.uidFromHeader(auth);
      console.log(
        '[deleteMsg] uid =',
        uid,
        'messageId =',
        dto.messageId,
        'partnerId =',
        dto.partnerId,
      );
      await this.messageService.deleteMessage(
        uid,
        dto.partnerId,
        dto.messageId,
      );
      console.log('[deleteMsg] OK durée(ms)=', Date.now() - t0);
      return { ok: true };
    } catch (e: any) {
      console.log('[deleteMsg][ERROR]', e?.message, e?.stack);
      throw e;
    }
  }

  // Supprimer une conversation complète (si participant)
  @Delete('conversation')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async deleteConversation(
    @Headers('authorization') auth: string,
    @Body() dto: DeleteConversationDto,
  ) {
    const t0 = Date.now();
    console.log('\n[DELETE /messages/conversation] START', { dto });
    try {
      const uid = await this.uidFromHeader(auth);
      console.log(
        '[deleteConversation] uid =',
        uid,
        'partnerId =',
        dto.partnerId,
      );
      await this.messageService.deleteConversation(uid, dto.partnerId);
      console.log('[deleteConversation] OK durée(ms)=', Date.now() - t0);
      return { ok: true };
    } catch (e: any) {
      console.log('[deleteConversation][ERROR]', e?.message, e?.stack);
      throw e;
    }
  }

  @Post('invitation')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async handleInvitation(
    @Headers('authorization') auth: string,
    @Body() body: { partnerId: string; accept: boolean },
  ) {
    const t0 = Date.now();
    console.log('\n[POST /messages/invitation] START', { body });
    try {
      const uid = await this.uidFromHeader(auth);
      console.log(
        '[handleInvitation] uid =',
        uid,
        'partnerId =',
        body.partnerId,
        'accept =',
        body.accept,
      );
      await this.messageService.handleInvitation(
        uid,
        body.partnerId,
        body.accept,
      );
      console.log('[handleInvitation] OK durée(ms)=', Date.now() - t0);
      return { ok: true };
    } catch (e: any) {
      console.log('[handleInvitation][ERROR]', e?.message, e?.stack);
      throw e;
    }
  }

  @Get('invitations')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async getInvitations(
    @Headers('authorization') auth: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const t0 = Date.now();
    console.log('\n[GET /messages/invitations] START', { limit, cursor });
    try {
      const uid = await this.uidFromHeader(auth);
      const n = limit ? parseInt(limit, 10) : 30;
      console.log(
        '[getInvitations] uid =',
        uid,
        'limit =',
        n,
        'cursor =',
        cursor,
      );
      const res = await this.messageService.listInvitationMessages(
        uid,
        n,
        cursor
          ? firebaseAdmin.firestore.Timestamp.fromMillis(parseInt(cursor))
          : undefined,
      ); // Correction ici
      console.log(
        '[getInvitations] invitations =',
        res.invitations.length,
        'nextCursor =',
        !!res.nextCursor,
        'durée(ms)=',
        Date.now() - t0,
      );
      return res;
    } catch (e: any) {
      console.log('[getInvitations][ERROR]', e?.message, e?.stack);
      throw e;
    }
  }
}
