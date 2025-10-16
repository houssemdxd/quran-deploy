/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Comment } from './entities/comment.entity';
import { UserService } from '../user/user.service';

interface PredefinedMessage {
  id: string;
  content: string;
  price: number;
}

@Injectable()
export class CommentService {
  private db;
  private predefinedMessages: PredefinedMessage[] = [
    { id: '1', content: 'بارك الله فيك', price: 5 },
    { id: '2', content: 'جعله الله في ميزان حسناتك', price: 10 },
    { id: '3', content: 'ما شاء الله', price: 2 },
  ];

  constructor(
    @Inject('FIREBASE_ADMIN') private firebaseAdmin,
    private userService: UserService,
  ) {
    this.db = this.firebaseAdmin.firestore();
  }

async createComment(dto: CreateCommentDto, senderId: string): Promise<string> {
  const engagementRef = this.db.collection('engagementItems').doc(dto.engagementItemId);
  const engagementDoc = await engagementRef.get();
  if (!engagementDoc.exists) {
    throw new BadRequestException('EngagementItem non trouvé.');
  }
  const engagementData = engagementDoc.data() as { content: string; price: number };

  // Vérifier vidéo
  const videoRef = this.db.collection('videos').doc(dto.videoId);
  const videoDoc = await videoRef.get();
  if (!videoDoc.exists) {
    throw new BadRequestException('Vidéo non trouvée.');
  }
  const reciterId = videoDoc.data().userId;

  // Vérifier solde utilisateur
  const sender = await this.userService.getUserProfile(senderId);
  const senderBalance = sender.balance || 0;
  if (senderBalance < engagementData.price) {
    throw new BadRequestException('Solde insuffisant pour envoyer ce message.');
  }

  const commission = 0.10;
  const amountToReciter = engagementData.price * (1 - commission);

  const commentRef = this.db.collection('comments').doc();
  const commentData: Comment = {
    id: commentRef.id,
    engagementItemId: dto.engagementItemId, // reference instead of copying content
    videoId: dto.videoId,
    senderId,
    reciterId,
    sendAt: new Date(),
  };

  await this.db.runTransaction(async (transaction) => {
    const senderRef = this.db.collection('users').doc(senderId);
    const reciterRef = this.db.collection('users').doc(reciterId);

    const [senderDoc, reciterDoc] = await transaction.getAll(senderRef, reciterRef);

    const senderBalanceFromDoc = senderDoc.data().balance || 0;
    const reciterBalanceFromDoc = reciterDoc.data().balance || 0;

    if (senderBalanceFromDoc < engagementData.price) {
      throw new BadRequestException('Solde insuffisant dans la transaction.');
    }

    transaction.update(senderRef, { balance: senderBalanceFromDoc - engagementData.price });
    transaction.update(reciterRef, { balance: reciterBalanceFromDoc + amountToReciter });
    transaction.set(commentRef, commentData);
  });

  console.log('Commentaire créé avec succès, ID:', commentRef.id);
  return commentRef.id;
}



  async updateCommentPrice(commentId: string, dto: UpdateCommentDto): Promise<void> {
    if (!dto.commentPrice) {
      throw new BadRequestException('Aucun prix à mettre à jour.');
    }

    const commentRef = this.db.collection('comments').doc(commentId);
    const doc = await commentRef.get();
    if (!doc.exists) {
      throw new BadRequestException('Commentaire non trouvé.');
    }

    await commentRef.update({
      commentPrice: dto.commentPrice,
    });
  }

  async getCommentsByVideoId(videoId: string): Promise<Comment[]> {
  const snapshot = await this.db
    .collection('comments')
    .where('videoId', '==', videoId)
    .get();

  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
    } as Comment;
  });
}

async deleteComment(commentId: string, senderId: string): Promise<void> {
  const commentRef = this.db.collection('comments').doc(commentId);
  const doc = await commentRef.get();

  if (!doc.exists) {
    throw new BadRequestException('Commentaire non trouvé.');
  }

  const data = doc.data();
  if (!data || data.senderId !== senderId) {
    throw new BadRequestException('Suppression non autorisée.');
  }

  await commentRef.delete();
}

}