
export enum ReclamationCategory {
  TECHNICAL = 'Technical',
  CONTENT = 'Inappropriate Content',
  OTHER = 'Other',
}

export enum ReclamationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface Reclamation {
  id: string;
  userId: string;
  title: string;
  category: ReclamationCategory;
  description?: string;
  fileUrl?: string;
  status: ReclamationStatus;
  createdAt: Date;
  updatedAt: Date;
}