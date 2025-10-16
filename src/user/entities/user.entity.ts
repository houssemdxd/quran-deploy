export enum UserRole {
  Listener = 'Listener',
  Reciter = 'Reciter',
  Institution = 'Institution',
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  latitude: number;
  longitude: number;
  birthdate?: Date; 
  createdAt?: Date;
  updatedAt?: Date;
  videoCount?: number;    // Nombre de vidéos publiées
  participationCount?: number; // Nombre de participations à des événements
  followerCount?: number; // Nombre d'abonnés
  balance: number; // Ajout du champ balance
  followersList?: string[]; // Liste des UIDs des abonnés
  fcmToken?: string; // Token FCM pour les notifications push
}