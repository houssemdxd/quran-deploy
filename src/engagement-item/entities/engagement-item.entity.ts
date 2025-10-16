/* eslint-disable prettier/prettier */
// engagement-item.entity.ts
export class EngagementItem {
  id?: string;          // Firestore doc id
  content: string;      // Predefined comment
  price: number;        // Price in chosen currency
  currency?: string;    // Optional (default: USD/EUR)
  createdAt?: Date;
  updatedAt?: Date;
}
