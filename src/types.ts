export type StickerType = 'crown' | 'sparkles' | 'cake' | 'heart' | 'rocket' | 'trophy';

export interface BirthdayWish {
  id: string;
  senderName: string;
  senderRole: string;
  message: string;
  sticker: StickerType;
  likes: number;
  createdAt: string;
}

export interface CandleItem {
  id: number;
  label: string;
  subtitle: string;
  isLit: boolean;
}

export enum WishSortMode {
  ALL = 'all',
  POPULAR = 'popular',
  RECENT = 'recent',
}
