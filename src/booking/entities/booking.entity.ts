export enum BookingStatus {
  Interested = 'interested', // Pour public, indique un intérêt
  Participating = 'participating', // Pour public, confirme participation
  Invited = 'invited', // Pour VIP, invité par le récitateur
  Confirmed = 'confirmed', // Pour VIP, accepté par l'utilisateur
  Cancelled = 'cancelled',
}

export interface Booking {
  id: string;
  userId: string; // Référence à l'utilisateur (listener)
  eventId: string; // Référence à l'événement
  status: BookingStatus;
  createdAt: Date;
  updatedAt?: Date;
}