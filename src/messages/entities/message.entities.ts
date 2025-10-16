export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  sentAt: Date;
  status: 'sent' | 'seen';
  editedAt?: Date;
}