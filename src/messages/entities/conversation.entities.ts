export interface Conversation {
  id: string; // cid = "A_B"
  participants: [string, string]; // [uid1, uid2] triés
  lastMessage?: string;
  lastMessageAt?: Date;
  lastMessageSenderId?: string;
  unreadCount: Record<string, number>; // { [uid]: number }
  invitation?: { from: string; status: 'pending' | 'accepted' | 'rejected'; count: number }; // Nouveau pour invitations
  createdAt: Date;
  updatedAt: Date;
}