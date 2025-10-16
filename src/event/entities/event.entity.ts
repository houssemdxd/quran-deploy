/* eslint-disable prettier/prettier */
export enum EventType {
  Public = 'public',
  VIP = 'vip',
}

export interface Event {
  id: string;
  reciterId: string; // Référence à l'utilisateur (récitateur)
  reciterName?: string;
  reciterPhoto?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  type: EventType;
  streamUrl?: string; // URL générée par LiveKit/ZEGOCLOUD
  participants?: string[]; // Pour VIP, liste d'IDs d'utilisateurs invités
  participantsCount?: number; // Nombre d'utilisateurs présents
  isLive?: boolean; // Statut du live stream
  createdAt: Date;
  updatedAt?: Date;
}