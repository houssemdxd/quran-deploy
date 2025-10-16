import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { Conversation } from './entities/conversation.entities';
import { Message } from './entities/message.entities';
import { UserService } from 'src/user/user.service';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class MessageService {
  private db: FirebaseFirestore.Firestore;
  private messaging: admin.messaging.Messaging;

  constructor(
    @Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin,
    private userService: UserService,
  ) {
    this.db = this.firebaseAdmin.firestore();
    this.messaging = this.firebaseAdmin.messaging();
  }

  /** Crée un cid déterministe A_B */
  private makeCid(a: string, b: string): string {
    return [a, b].sort().join('_');
  }

  private convRef(cid: string) {
    return this.db.collection('conversations').doc(cid);
  }

  private msgsRef(cid: string) {
    return this.convRef(cid).collection('messages');
  }

  /** Assure l’existence du doc conversation (idempotent) */
  private async ensureConversation(
    a: string,
    b: string,
    isInvitation = false,
  ): Promise<Conversation> {
    const cid = this.makeCid(a, b);
    const ref = this.convRef(cid);
    const doc = await ref.get();
    if (doc.exists) {
      const data = doc.data()!;
      return {
        id: cid,
        participants: data.participants,
        lastMessage: data.lastMessage,
        lastMessageAt: data.lastMessageAt?.toDate?.() ?? data.lastMessageAt,
        lastMessageSenderId: data.lastMessageSenderId,
        unreadCount: data.unreadCount ?? { [a]: 0, [b]: 0 },
        invitation: data.invitation,
        createdAt: data.createdAt?.toDate?.() ?? data.createdAt ?? new Date(),
        updatedAt: data.updatedAt?.toDate?.() ?? data.updatedAt ?? new Date(),
      };
    }
    const base: Conversation = {
      id: cid,
      participants: [a, b].sort() as [string, string],
      unreadCount: { [a]: 0, [b]: 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
      invitation: isInvitation
        ? { from: a, status: 'pending', count: 0 }
        : undefined,
    };
    await ref.set({
      ...base,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return base;
  }

  /** Envoyer un message */
  async sendMessage(
    senderId: string,
    receiverId: string,
    content: string,
  ): Promise<Message> {
    if (senderId === receiverId)
      throw new BadRequestException(
        'Impossible de s’envoyer un message à soi-même.',
      );
    if (!content?.trim()) throw new BadRequestException('Contenu vide.');

    const receiver = await this.getUser(receiverId);
    const isFollowedByReceiver =
      receiver.followersList?.includes(senderId) || false;

    const cid = this.makeCid(senderId, receiverId);
    const conv = await this.ensureConversation(
      senderId,
      receiverId,
      !isFollowedByReceiver,
    );

    if (
      !isFollowedByReceiver &&
      conv.invitation &&
      conv.invitation.status === 'pending' &&
      conv.invitation.from === senderId
    ) {
      // Incrémenter le compteur d'invitations si en attente
      await this.convRef(cid).update({
        'invitation.count': admin.firestore.FieldValue.increment(1),
      });
    } else if (conv.invitation && conv.invitation.status === 'rejected') {
      throw new ForbiddenException('Invitation refusée.');
    }

    const msgRef = this.msgsRef(cid).doc();
    const convRef = this.convRef(cid);

    await this.db.runTransaction(async (tx) => {
      const convSnap = await tx.get(convRef);
      const convData = convSnap.data() || {};
      const unread = convData.unreadCount || { [senderId]: 0, [receiverId]: 0 };
      unread[receiverId] = (unread[receiverId] || 0) + 1;

      tx.set(msgRef, {
        id: msgRef.id,
        conversationId: cid,
        senderId,
        receiverId,
        content: content.trim(),
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent',
      });

      tx.set(
        convRef,
        {
          participants: [senderId, receiverId].sort(),
          lastMessage: content.trim(),
          lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
          lastMessageSenderId: senderId,
          unreadCount: unread,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });

    // Notification push
    const receiverToken = await this.getFCMToken(receiverId);
    if (receiverToken) {
      await this.messaging
        .send({
          token: receiverToken,
          notification: {
            title: 'Nouvelle invitation',
            body: content.trim().slice(0, 50),
          },
        })
        .catch((err) => console.error('Erreur FCM:', err));
    }

    const saved = await msgRef.get();
    const data = saved.data() as any;
    return {
      ...(data as any),
      sentAt: data.sentAt?.toDate?.() ?? new Date(),
    } as Message;
  }
  /** Récupérer messages d’une conversation + marquer vus */
  async getConversationAndMarkSeen(
    uid: string,
    partnerId: string,
    limit = 50,
    cursorMessageId?: string,
  ): Promise<{
    messages: Message[];
    conversation: Conversation | null;
    nextCursor?: string;
  }> {
    const cid = this.makeCid(uid, partnerId);
    const convRef = this.convRef(cid);
    const convSnap = await convRef.get();
    if (!convSnap.exists) {
      return { messages: [], conversation: null };
    }

    let q = this.msgsRef(cid).orderBy('sentAt', 'desc').limit(limit);
    if (cursorMessageId) {
      const cursorDoc = await this.msgsRef(cid).doc(cursorMessageId).get();
      if (cursorDoc.exists) {
        q = q.startAfter(cursorDoc);
      }
    }

    const snap = await q.get();
    const docs = snap.docs;

    // batch "seen" pour les messages reçus non vus
    const batch = this.db.batch();
    let markedCount = 0;
    docs.forEach((d) => {
      const m = d.data() as any;
      if (m.receiverId === uid && m.status !== 'seen') {
        batch.update(d.ref, { status: 'seen' });
        markedCount++;
      }
    });

    if (markedCount > 0) {
      batch.update(convRef, {
        [`unreadCount.${uid}`]: 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await batch.commit();
    }

    const messages: Message[] = docs
      .map((d) => {
        const m = d.data() as any;
        return {
          id: m.id,
          conversationId: m.conversationId,
          senderId: m.senderId,
          receiverId: m.receiverId,
          content: m.content,
          status: m.status,
          sentAt: m.sentAt?.toDate?.() ?? new Date(),
          editedAt: m.editedAt?.toDate?.(),
        } as Message;
      })
      .reverse();

    const nextCursor =
      docs.length === limit ? docs[docs.length - 1].id : undefined;

    const cdata = convSnap.data()!;
    const conversation: Conversation = {
      id: cid,
      participants: cdata.participants,
      lastMessage: cdata.lastMessage,
      lastMessageAt: cdata.lastMessageAt?.toDate?.() ?? cdata.lastMessageAt,
      lastMessageSenderId: cdata.lastMessageSenderId,
      unreadCount: cdata.unreadCount ?? { [uid]: 0, [partnerId]: 0 },
      invitation: cdata.invitation,
      createdAt: cdata.createdAt?.toDate?.() ?? new Date(),
      updatedAt: cdata.updatedAt?.toDate?.() ?? new Date(),
    };

    return { messages, conversation, nextCursor };
  }

  /** Home Chat : toutes les conversations d’un user */
  async listUserConversations(
    uid: string,
    limit = 30,
    cursorUpdatedAt?: FirebaseFirestore.Timestamp,
  ) {
    let q = this.db
      .collection('conversations')
      .where('participants', 'array-contains', uid)
      .orderBy('updatedAt', 'desc')
      .limit(limit);
    if (cursorUpdatedAt) q = q.startAfter(cursorUpdatedAt);

    const snap = await q.get();
    const items = snap.docs.map((d) => {
      const c = d.data() as any;
      const obj: Conversation = {
        id: d.id,
        participants: c.participants,
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt?.toDate?.() ?? c.lastMessageAt,
        lastMessageSenderId: c.lastMessageSenderId,
        unreadCount: c.unreadCount ?? {},
        invitation: c.invitation,
        createdAt: c.createdAt?.toDate?.() ?? new Date(),
        updatedAt: c.updatedAt?.toDate?.() ?? new Date(),
      };
      return obj;
    });

    const nextCursor =
      snap.docs.length === limit
        ? (snap.docs[snap.docs.length - 1].get(
            'updatedAt',
          ) as FirebaseFirestore.Timestamp)
        : undefined;

    return { conversations: items, nextCursor };
  }

  /** Modifier un message (expéditeur uniquement) */
  async updateMessageContent(
    uid: string,
    partnerId: string,
    messageId: string,
    newContent: string,
  ): Promise<Message> {
    const cid = this.makeCid(uid, partnerId);
    const msgRef = this.msgsRef(cid).doc(messageId);
    const convRef = this.convRef(cid);

    const snap = await msgRef.get();
    if (!snap.exists) throw new BadRequestException('Message introuvable.');
    const data = snap.data() as any;
    if (data.senderId !== uid)
      throw new ForbiddenException(
        'Vous ne pouvez modifier que vos propres messages.',
      );

    await this.db.runTransaction(async (tx) => {
      const convSnap = await tx.get(convRef);
      const isLast =
        convSnap.exists &&
        convSnap.get('lastMessageAt') &&
        (convSnap.get('lastMessageAt') as FirebaseFirestore.Timestamp).isEqual(
          data.sentAt,
        );

      tx.update(msgRef, {
        content: newContent,
        editedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (isLast) {
        tx.update(convRef, {
          lastMessage: newContent,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });

    const updated = await msgRef.get();
    const u = updated.data() as any;
    return {
      id: u.id,
      conversationId: cid,
      senderId: u.senderId,
      receiverId: u.receiverId,
      content: u.content,
      status: u.status,
      sentAt: u.sentAt?.toDate?.() ?? new Date(),
      editedAt: u.editedAt?.toDate?.(),
    };
  }

  /** Supprimer un message (expéditeur uniquement) */
  async deleteMessage(
    uid: string,
    partnerId: string,
    messageId: string,
  ): Promise<void> {
    const cid = this.makeCid(uid, partnerId);
    const msgRef = this.msgsRef(cid).doc(messageId);
    const convRef = this.convRef(cid);

    const snap = await msgRef.get();
    if (!snap.exists) return;
    const data = snap.data() as any;
    if (data.senderId !== uid)
      throw new ForbiddenException(
        'Vous ne pouvez supprimer que vos propres messages.',
      );

    await this.db.runTransaction(async (tx) => {
      const convSnap = await tx.get(convRef);
      const isLast =
        convSnap.exists &&
        convSnap.get('lastMessageAt') &&
        (convSnap.get('lastMessageAt') as FirebaseFirestore.Timestamp).isEqual(
          data.sentAt,
        );

      let replacement: {
        content: string;
        sentAt: FirebaseFirestore.Timestamp;
        senderId: string;
      } | null = null;
      if (isLast) {
        const twoNewest = await this.msgsRef(cid)
          .orderBy('sentAt', 'desc')
          .limit(2)
          .get();
        if (twoNewest.size >= 2) {
          const candidate = twoNewest.docs.find((d) => d.id !== messageId);
          if (candidate) {
            const cm = candidate.data() as any;
            replacement = {
              content: cm.content,
              sentAt: cm.sentAt,
              senderId: cm.senderId,
            };
          }
        }
      }

      tx.delete(msgRef);

      if (isLast) {
        if (replacement) {
          tx.update(convRef, {
            lastMessage: replacement.content,
            lastMessageAt: replacement.sentAt,
            lastMessageSenderId: replacement.senderId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          tx.update(convRef, {
            lastMessage: admin.firestore.FieldValue.delete(),
            lastMessageAt: admin.firestore.FieldValue.delete(),
            lastMessageSenderId: admin.firestore.FieldValue.delete(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    });
  }

  /** Supprimer une conversation complète (si participant) */
  async deleteConversation(uid: string, partnerId: string): Promise<void> {
    const cid = this.makeCid(uid, partnerId);
    const convRef = this.convRef(cid);
    const convSnap = await convRef.get();
    if (!convSnap.exists) return;
    const participants: string[] = convSnap.get('participants') || [];
    if (!participants.includes(uid))
      throw new ForbiddenException('Accès refusé.');

    const pageSize = 500;
    while (true) {
      const page = await this.msgsRef(cid).limit(pageSize).get();
      if (page.empty) break;
      const batch = this.db.batch();
      page.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      if (page.size < pageSize) break;
    }
    await convRef.delete();
  }

  /** Récupérer le FCM token d'un utilisateur */
  private async getFCMToken(uid: string): Promise<string | null> {
    const user = await this.getUser(uid);
    return user.fcmToken || null;
  }

  private async getUser(uid: string): Promise<User> {
    const userDoc = await this.db.collection('users').doc(uid).get();
    if (!userDoc.exists)
      throw new BadRequestException('Utilisateur introuvable.');
    return userDoc.data() as User;
  }

  /** Gérer une invitation de message */
  async handleInvitation(
    uid: string,
    partnerId: string,
    accept: boolean,
  ): Promise<void> {
    const cid = this.makeCid(uid, partnerId);
    const convRef = this.convRef(cid);
    const convSnap = await convRef.get();
    if (
      !convSnap.exists ||
      !convSnap.get('invitation') ||
      convSnap.get('invitation').status !== 'pending'
    ) {
      throw new BadRequestException('Aucune invitation en attente.');
    }

    await this.db.runTransaction(async (tx) => {
      const convData = convSnap.data()!;
      if (convData.invitation.from !== partnerId)
        throw new ForbiddenException('Invitation invalide.');

      if (accept) {
        tx.update(convRef, {
          invitation: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Ajouter partnerId comme follower de uid
        const uidRef = this.db.collection('users').doc(uid);
        tx.update(uidRef, {
          followersList: admin.firestore.FieldValue.arrayUnion(partnerId),
          followerCount: admin.firestore.FieldValue.increment(1),
        });

        // Ajouter uid comme follower de partnerId (relation bidirectionnelle)
        const partnerRef = this.db.collection('users').doc(partnerId);
        tx.update(partnerRef, {
          followersList: admin.firestore.FieldValue.arrayUnion(uid),
          followerCount: admin.firestore.FieldValue.increment(1),
        });

        // Notification push au demandeur
        const senderToken = await this.getFCMToken(partnerId);
        if (senderToken) {
          await this.messaging
            .send({
              token: senderToken,
              notification: {
                title: 'Invitation acceptée',
                body: `${uid} a accepté votre invitation.`,
              },
            })
            .catch((err) => console.error('Erreur FCM:', err));
        }
      } else {
        tx.update(convRef, {
          'invitation.status': 'rejected',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Notification push au demandeur
        const senderToken = await this.getFCMToken(partnerId);
        if (senderToken) {
          await this.messaging
            .send({
              token: senderToken,
              notification: {
                title: 'Invitation refusée',
                body: `${uid} a refusé votre invitation.`,
              },
            })
            .catch((err) => console.error('Erreur FCM:', err));
        }
      }
    });
  }

  // Ajout dans MessageService (après listUserConversations)
  async listInvitationMessages(
    uid: string,
    limit = 30,
    cursorUpdatedAt?: FirebaseFirestore.Timestamp,
  ): Promise<{
    invitations: { conversation: Conversation; messages: Message[] }[];
    nextCursor?: FirebaseFirestore.Timestamp;
  }> {
    let q = this.db
      .collection('conversations')
      .where('participants', 'array-contains', uid)
      .where('invitation', '!=', null) // Filtrer les conversations avec une invitation
      .orderBy('updatedAt', 'desc')
      .limit(limit);

    if (cursorUpdatedAt) q = q.startAfter(cursorUpdatedAt);

    const snap = await q.get();
    const items = await Promise.all(
      snap.docs.map(async (doc) => {
        const cdata = doc.data() as any;
        const conversation: Conversation = {
          id: doc.id,
          participants: cdata.participants,
          lastMessage: cdata.lastMessage,
          lastMessageAt: cdata.lastMessageAt?.toDate?.() ?? cdata.lastMessageAt,
          lastMessageSenderId: cdata.lastMessageSenderId,
          unreadCount: cdata.unreadCount ?? {},
          invitation: cdata.invitation,
          createdAt: cdata.createdAt?.toDate?.() ?? new Date(),
          updatedAt: cdata.updatedAt?.toDate?.() ?? new Date(),
        };

        // Récupérer tous les messages de la conversation
        const messagesSnap = await this.msgsRef(doc.id)
          .orderBy('sentAt', 'desc')
          .get();
        const messages: Message[] = messagesSnap.docs.map((msgDoc) => {
          const mdata = msgDoc.data() as any;
          return {
            id: msgDoc.id,
            conversationId: mdata.conversationId,
            senderId: mdata.senderId,
            receiverId: mdata.receiverId,
            content: mdata.content,
            status: mdata.status,
            sentAt: mdata.sentAt?.toDate?.() ?? new Date(),
            editedAt: mdata.editedAt?.toDate?.(),
          } as Message;
        });

        return { conversation, messages };
      }),
    );

    const nextCursor =
      snap.docs.length === limit
        ? (snap.docs[snap.docs.length - 1].get(
            'updatedAt',
          ) as FirebaseFirestore.Timestamp)
        : undefined;

    return { invitations: items, nextCursor };
  }
}
