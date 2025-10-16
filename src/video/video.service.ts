import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { Video } from './entities/video.entity';

import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';

@Injectable()
export class VideoService {
  private db;

  constructor(@Inject('FIREBASE_ADMIN') private firebaseAdmin) {
    this.db = this.firebaseAdmin.firestore();
  }
  async createVideo(dto: CreateVideoDto & { userId: string }): Promise<string> {
  try {
    const videoRef = this.db.collection('videos').doc();
    let videoUrl = '';

    if (dto.videoFile) {
      const file = dto.videoFile as Express.Multer.File;
      const bucket = this.firebaseAdmin.storage().bucket();

      // Simple filename: avoids spaces and special characters
      const filename = `videos/${dto.userId}/${Date.now()}_video.mp4`;
      const fileUpload = bucket.file(filename);

      console.log("Préparation de l'upload de la vidéo dans:", filename);

      // Ensure contentType matches video format
      await fileUpload.save(file.buffer, {
        metadata: {
          contentType: 'video/mp4', // force mp4
          cacheControl: 'public, max-age=31536000',
        },
      });

      console.log("Upload terminé, génération de l'URL Firebase");

      // Use signed URL to guarantee playback even if filename is complex
      const [signedUrl] = await fileUpload.getSignedUrl({
        action: 'read',
        expires: '03-01-2505',
      });
      videoUrl = signedUrl;

      console.log('URL Firebase générée (signed):', videoUrl);
    } else {
      // Default video URL if no file uploaded
      videoUrl = 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    }

    const videoData: Video = {
      id: videoRef.id,
      userId: dto.userId,
      title: dto.title,
      surah: dto.surah,
      description: dto.description,
      videoUrl,
      uploadedAt: new Date(),
      likeCount: 0,
      likedUserIds: [],
      viewsNumber: 0,
      shareNumber: 0,
      sharedUserIds: [],
    };

    await videoRef.set(videoData);
    console.log('Vidéo créée avec succès, ID:', videoRef.id);
    return videoRef.id;
  } catch (error) {
    console.error('Erreur dans createVideo:', error.message, error.stack);
    throw new BadRequestException(
      'Erreur lors de la création de la vidéo : ' + error.message,
    );
  }
}

  async getVideosByUserId(userId: string): Promise<Video[]> {
    const videosSnapshot = await this.db
      .collection('videos')
      .where('userId', '==', userId)
      .get();

    const videos = await Promise.all(
      videosSnapshot.docs.map(async (doc) => {
        const data = doc.data() as Video;
        const likesSnapshot = await this.db
          .collection('videos')
          .doc(doc.id)
          .collection('likes')
          .get();
        const likedUserIds = likesSnapshot.docs.map((likeDoc) => likeDoc.id);

        return {
          ...data,
          id: doc.id,
          likeCount: likedUserIds.length,
          likedUserIds,
          viewsNumber: data.viewsNumber || 0,
          shareNumber: data.shareNumber || 0,
          sharedUserIds: data.sharedUserIds || [],
        };
      }),
    );

    return videos;
  }

  async likeVideo(videoId: string, userId: string): Promise<string> {
    try {
      const videoRef = this.db.collection('videos').doc(videoId);
      const doc = await videoRef.get();
      if (!doc.exists) {
        throw new BadRequestException('Vidéo non trouvée.');
      }

      const likeRef = videoRef.collection('likes').doc(userId);
      const likeDoc = await likeRef.get();

      if (likeDoc.exists) {
        // Retirer le like
        await likeRef.delete();
        await videoRef.update({
          likeCount: this.firebaseAdmin.firestore.FieldValue.increment(-1),
          likedUserIds:
            this.firebaseAdmin.firestore.FieldValue.arrayRemove(userId),
        });
        return 'Like removed';
      } else {
        // Ajouter le like
        await likeRef.set({ likedAt: new Date() });
        await videoRef.update({
          likeCount: this.firebaseAdmin.firestore.FieldValue.increment(1),
          likedUserIds:
            this.firebaseAdmin.firestore.FieldValue.arrayUnion(userId),
        });
        return 'Video liked';
      }
    } catch (error) {
      throw new BadRequestException(
        'Erreur lors de la gestion du like : ' + error.message,
      );
    }
  }

  async getVideoLikes(videoId: string): Promise<string[]> {
    const snapshot = await this.db
      .collection('videos')
      .doc(videoId)
      .collection('likes')
      .get();
    return snapshot.docs.map((doc) => doc.id);
  }

  async getAllVideos(): Promise<Video[]> {
    const videoDocs = await this.db.collection('videos').get();

    const videosWithLikes = await Promise.all(
      videoDocs.docs.map(async (doc) => {
        const videoData = doc.data() as Video;
        // Fetch likes
        const likesSnapshot = await this.db
          .collection('videos')
          .doc(doc.id)
          .collection('likes')
          .get();
        const likedUserIds = likesSnapshot.docs.map((likeDoc) => likeDoc.id);

        // Fetch uploader basic profile (firstName, lastName)
        let firstName = '';
        let lastName = '';
        let avatar = '';
        try {
          if (videoData.userId) {
            const userDoc = await this.db.collection('users').doc(videoData.userId).get();
            if (userDoc.exists) {
              const ud = userDoc.data() as { firstName?: string; lastName?: string; avatar?: string };
              firstName = ud?.firstName || '';
              lastName = ud?.lastName || '';
              avatar = ud?.avatar || '';
            }
          }
        } catch (e) {
          // Silent fail: names remain empty if user fetch fails
        }

      //  console.log({
      //    ...videoData,
      //    id: doc.id,
      //    likeCount: likedUserIds.length,
      //    likedUserIds,
      //    viewsNumber: videoData.viewsNumber || 0,
      //    shareNumber: videoData.shareNumber || 0, // Inclure shareNumber
      //  sharedUserIds: videoData.sharedUserIds || [],
      //  // Enriched fields
      //  firstName,
      //  lastName,
      //  avatar,
      //  });
        return {
          ...videoData,
          id: doc.id,
          likeCount: likedUserIds.length,
          likedUserIds,
          viewsNumber: videoData.viewsNumber || 0,
          shareNumber: videoData.shareNumber || 0, // Inclure shareNumber
          sharedUserIds: videoData.sharedUserIds || [],
          // Enriched fields
          firstName,
          lastName,
          avatar,
        };
      }),
    );

    return videosWithLikes;
  }

  async updateVideo(
    videoId: string,
    dto: UpdateVideoDto,
    userId: string,
  ): Promise<void> {
    try {
      const videoRef = this.db.collection('videos').doc(videoId);
      const doc = await videoRef.get();
      if (!doc.exists) {
        throw new BadRequestException('Vidéo non trouvée.');
      }

      const data = doc.data() as Video;
      if (data.userId !== userId) {
        throw new BadRequestException(
          "Vous n'êtes pas autorisé à mettre à jour cette vidéo.",
        );
      }

      // Vérifier que dto est un objet valide
      if (!dto || typeof dto !== 'object') {
        throw new BadRequestException(
          'Les données de mise à jour sont invalides.',
        );
      }

      // Construire updatedData uniquement avec les champs définis
      const updatedData: Partial<Video> = {};
      if (dto.title !== undefined) updatedData.title = dto.title;
      if (dto.surah !== undefined) updatedData.surah = dto.surah;
      if (dto.description !== undefined)
        updatedData.description = dto.description;
      updatedData.updatedAt = new Date();

      // Vérifier qu'il y a au moins un champ à mettre à jour
      if (Object.keys(updatedData).length === 1) {
        // Seulement updatedAt
        throw new BadRequestException('Aucun champ à mettre à jour.');
      }

      await videoRef.update(updatedData);
    } catch (error) {
      throw new BadRequestException(
        'Erreur lors de la mise à jour de la vidéo : ' + error.message,
      );
    }
  }

  async getVideoById(videoId: string, userId: string): Promise<Video> {
    const videoRef = this.db.collection('videos').doc(videoId);
    const doc = await videoRef.get();

    if (!doc.exists) {
      throw new BadRequestException('Vidéo non trouvée.');
    }

    const data = doc.data() as Video;
    if (data.userId !== userId) {
      throw new BadRequestException(
        "Vous n'êtes pas autorisé à accéder à cette vidéo.",
      );
    }

    const likesSnapshot = await videoRef.collection('likes').get();
    const likedUserIds = likesSnapshot.docs.map((likeDoc) => likeDoc.id);

    return {
      ...data,
      id: doc.id,
      likeCount: likedUserIds.length,
      likedUserIds,
      viewsNumber: data.viewsNumber || 0,
      shareNumber: data.shareNumber || 0,
      sharedUserIds: data.sharedUserIds || [],
    };
  }
  async deleteVideo(videoId: string, userId: string): Promise<void> {
    try {
      const videoRef = this.db.collection('videos').doc(videoId);
      const doc = await videoRef.get();
      if (!doc.exists) {
        throw new BadRequestException('Vidéo non trouvée.');
      }

      const data = doc.data() as Video;
      if (data.userId !== userId) {
        throw new BadRequestException(
          "Vous n'êtes pas autorisé à supprimer cette vidéo.",
        );
      }

      const videoUrl = data.videoUrl;
      if (videoUrl && videoUrl.startsWith('https://storage.googleapis.com/')) {
        const filePath = videoUrl.replace(
          'https://storage.googleapis.com/' + process.env.STORAGE_BUCKET + '/',
          '',
        );
        const file = this.firebaseAdmin.storage().bucket().file(filePath);
        await file.delete().catch(() => {}); // Ignore l'erreur si le fichier n'existe pas
      }

      const likesSnapshot = await videoRef.collection('likes').get();
      const deleteLikesPromises = likesSnapshot.docs.map((doc) =>
        doc.ref.delete(),
      );
      await Promise.all(deleteLikesPromises);

      await videoRef.delete();
    } catch (error) {
      throw new BadRequestException(
        'Erreur lors de la suppression de la vidéo : ' + error.message,
      );
    }
  }

  async incrementView(videoId: string, userId: string): Promise<void> {
    try {
      const videoRef = this.db.collection('videos').doc(videoId);
      const doc = await videoRef.get();
      if (!doc.exists) {
        throw new BadRequestException('Vidéo non trouvée.');
      }

      // Vérifier si l'utilisateur a déjà vu la vidéo (optionnel, pour éviter les multiples incréments)
      const viewRef = videoRef.collection('views').doc(userId);
      const viewDoc = await viewRef.get();
      if (!viewDoc.exists) {
        await viewRef.set({ viewedAt: new Date() });
        await videoRef.update({
          viewsNumber: this.firebaseAdmin.firestore.FieldValue.increment(1),
        });
        console.log(
          `Vue incrémentée pour la vidéo ${videoId}, utilisateur ${userId}`,
        );
      }
    } catch (error) {
      console.error('Erreur dans incrementView:', error.message, error.stack);
      throw new BadRequestException(
        "Erreur lors de l'incrément de la vue : " + error.message,
      );
    }
  }

  async incrementShare(videoId: string, userId: string): Promise<void> {
    try {
      const videoRef = this.db.collection('videos').doc(videoId);
      const doc = await videoRef.get();
      if (!doc.exists) {
        throw new BadRequestException('Vidéo non trouvée.');
      }

      // Vérifier si l'utilisateur a déjà partagé la vidéo (éviter les doublons)
      const sharedUserIds = doc.data().sharedUserIds || [];
      if (!sharedUserIds.includes(userId)) {
        await videoRef.update({
          shareNumber: this.firebaseAdmin.firestore.FieldValue.increment(1),
          sharedUserIds:
            this.firebaseAdmin.firestore.FieldValue.arrayUnion(userId),
        });
        console.log(
          `Partage incrémenté pour la vidéo ${videoId}, utilisateur ${userId}`,
        );
      }
    } catch (error) {
      console.error('Erreur dans incrementShare:', error.message, error.stack);
      throw new BadRequestException(
        "Erreur lors de l'incrément du partage : " + error.message,
      );
    }
  }
}
