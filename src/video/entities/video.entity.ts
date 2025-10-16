export interface Video {
  id: string;
  userId: string;
  title: string;
  surah?: string;
  videoUrl?: string;
  description?: string;
  uploadedAt?: Date;
  updatedAt?: Date;
  likeCount?: number;
  likedUserIds?: string[];
  viewsNumber?: number;
  shareNumber?: number; 
  sharedUserIds?: string[];
}