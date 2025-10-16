/* eslint-disable prettier/prettier */
export interface Comment {
  id: string;
  engagementItemId: string; // Reference to EngagementItem
  videoId: string; // ID de la vidéo associée
  senderId: string; // ID de l'utilisateur qui envoie (listener)
  reciterId: string; // ID du récitateur (propriétaire de la vidéo)
  sendAt: Date; // Timestamp de l'envoi
}