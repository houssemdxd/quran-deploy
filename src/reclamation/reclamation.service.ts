import { BadRequestException, Injectable, Inject } from '@nestjs/common';
import { CreateReclamationDto } from './dto/create-reclamation.dto';
import { Reclamation, ReclamationStatus } from './entities/reclamation.entity';
import { UpdateReclamationStatusDto } from './dto/update-status.dto';

@Injectable()
export class ReclamationService {
  private db;

  constructor(@Inject('FIREBASE_ADMIN') private firebaseAdmin) {
    this.db = this.firebaseAdmin.firestore();
  }

  async createReclamation(
    userId: string,
    dto: CreateReclamationDto,
    file?: Express.Multer.File,
  ): Promise<Reclamation> {
    const reclamationRef = this.db.collection('reclamations').doc();

    let fileUrl = '';
    if (file) {
      const bucket = this.firebaseAdmin.storage().bucket();
      const filename = `reclamations/${userId}/${Date.now()}_${file.originalname}`;
      const fileUpload = bucket.file(filename);

      await fileUpload.save(file.buffer, {
        metadata: { contentType: file.mimetype },
      });

      const [url] = await fileUpload.getSignedUrl({
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      fileUrl = url;
    }

    const newReclamation: Reclamation = {
      id: reclamationRef.id,
      userId,
      title: dto.title,
      category: dto.category,
      description: dto.description || '',
      fileUrl,
      status: ReclamationStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await reclamationRef.set(newReclamation);
    return newReclamation;
  }

  async getUserReclamations(userId: string): Promise<Reclamation[]> {
    const snapshot = await this.db
      .collection('reclamations')
      .where('userId', '==', userId)
      .get();

    return snapshot.docs.map((doc) => doc.data() as Reclamation);
  }

  async getAllReclamations(): Promise<Reclamation[]> {
    const snapshot = await this.db.collection('reclamations').get();
    return snapshot.docs.map((doc) => doc.data() as Reclamation);
  }

  async updateReclamationStatus(
    id: string,
    dto: UpdateReclamationStatusDto,
  ): Promise<Reclamation> {
    const ref = this.db.collection('reclamations').doc(id);
    const doc = await ref.get();
    if (!doc.exists) throw new BadRequestException('Réclamation non trouvée');

    const updated: Partial<Reclamation> = {
      status: dto.status,
      updatedAt: new Date(),
    };

    await ref.update(updated);
    return { ...(doc.data() as Reclamation), ...updated };
  }

  async deleteReclamation(id: string): Promise<{ ok: boolean }> {
    const ref = this.db.collection('reclamations').doc(id);
    const doc = await ref.get();
    if (!doc.exists) throw new BadRequestException('Réclamation non trouvée');
    await ref.delete();
    return { ok: true };
  }
}
