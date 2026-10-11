export type MediaType = 'photo' | 'video' | 'audio';

export type DateSource = 'exif' | 'file-modified' | 'manual' | 'fallback-today';

export interface MemberRecord {
  uid: string;
  role: 'owner' | 'partner';
  displayName: string;
  email: string;
  endearment: string;
  status: 'active';
  joinedAt: unknown;
  updatedAt: unknown;
}

export interface MemoryItem {
  id: string;
  title: string;
  caption: string;
  memoryDate: string; // YYYY-MM-DD
  memoryYear: number;
  memoryMonth: number; // 1-12
  dateSource: DateSource;
  mediaType: MediaType;
  storagePath: string;
  mediaUrl: string;
  thumbnailUrl: string;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  locationText: string;
  altText: string;
  tags: string[];
  albumIds: string[];
  favoritedBy: string[];
  isLingKong: boolean;
  lingKongLabel: string;
  isSoundtrack: boolean;
  externalSongUrl: string;
  soundtrackNotes: string;
  status: 'active' | 'trashed';
  trashedAt: string;
  createdBy: string;
  creatorName: string;
  uploadedAt: unknown;
  updatedAt: unknown;
}

export interface CustomAlbum {
  id: string;
  title: string;
  description: string;
  coverMemoryId: string;
  sortOrder: number;
  createdBy: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface StoryMilestone {
  id: string;
  title: string;
  description: string;
  eventDate: string; // YYYY-MM-DD
  category: string;
  memoryIds: string[];
  createdBy: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export type LetterRecipient = 'Kathy' | 'Austin' | 'Both of Us' | 'Our Future Selves';

export interface TimeCapsuleLetter {
  id: string;
  title: string;
  recipient: LetterRecipient;
  occasionNote: string;
  unlockAt: { seconds: number; nanoseconds: number } | Date | unknown;
  unlockDateIso: string;
  readBy: string[];
  createdBy: string;
  creatorName: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface TimeCapsuleSecret {
  body: string;
  unlockAt: unknown;
  createdBy: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export type BucketStatus = 'planned' | 'in-progress' | 'completed';
export type BucketPriority = 'someday' | 'soon' | 'dream';

export interface BucketListItem {
  id: string;
  title: string;
  description: string;
  category: string;
  status: BucketStatus;
  priority: BucketPriority;
  targetDate: string;
  linkedMemoryIds: string[];
  completedAt: string;
  createdBy: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface UserPreferences {
  uid: string;
  theme: 'light' | 'dark' | 'system';
  defaultViewMode: 'grid' | 'list';
  reducedMotion: boolean;
  favoriteMemoryIds: string[];
  updatedAt?: unknown;
}

export type PrimarySection =
  | 'home'
  | 'memories'
  | 'story'
  | 'soundtrack'
  | 'ling-kong'
  | 'time-capsule'
  | 'bucket-list'
  | 'settings';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}
