/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// engagement-item.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { CreateEngagementItemDto } from './dto/create-engagement-item.dto';
import { UpdateEngagementItemDto } from './dto/update-engagement-item.dto';
import { EngagementItem } from './entities/engagement-item.entity';

@Injectable()
export class EngagementItemService {
  private db;

  constructor(@Inject('FIREBASE_ADMIN') private firebaseAdmin) {
    this.db = this.firebaseAdmin.firestore();
  }

  async createEngagementItem(dto: CreateEngagementItemDto): Promise<string> {
    try {
      const engagementRef = this.db.collection('engagementItems').doc();
      const now = new Date();

      const engagementData: EngagementItem = {
        id: engagementRef.id,
        content: dto.content,
        price: dto.price,
        currency: dto.currency || 'USD',
        createdAt: now,
        updatedAt: now,
      };

      await engagementRef.set(engagementData);
      return engagementRef.id;
    } catch (error) {
      throw new BadRequestException('Erreur lors de la création de l’item : ' + error.message);
    }
  }

  async getAllEngagementItems(): Promise<EngagementItem[]> {
    const snapshot = await this.db.collection('engagementItems').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EngagementItem));
  }

  async getEngagementItemById(id: string): Promise<EngagementItem> {
    const doc = await this.db.collection('engagementItems').doc(id).get();
    if (!doc.exists) {
      throw new BadRequestException('EngagementItem non trouvé.');
    }
    return { id: doc.id, ...doc.data() } as EngagementItem;
  }

  async updateEngagementItem(id: string, dto: UpdateEngagementItemDto): Promise<void> {
    const engagementRef = this.db.collection('engagementItems').doc(id);
    const doc = await engagementRef.get();
    if (!doc.exists) {
      throw new BadRequestException('EngagementItem non trouvé.');
    }

    const updatedData: Partial<EngagementItem> = {
      ...dto,
      updatedAt: new Date(),
    };

    await engagementRef.update(updatedData);
  }

  async deleteEngagementItem(id: string): Promise<void> {
    const engagementRef = this.db.collection('engagementItems').doc(id);
    const doc = await engagementRef.get();
    if (!doc.exists) {
      throw new BadRequestException('EngagementItem non trouvé.');
    }

    await engagementRef.delete();
  }
}
