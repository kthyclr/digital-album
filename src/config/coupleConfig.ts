export const COUPLE_SPACE_ID = 'kathy-austin-space';

export const AUTHORIZED_EMAILS = [
  'lauretokathyclaire@gmail.com',
  'austinfeguro@gmail.com',
] as const;

export const PARTNER_PROFILES: Record<
  string,
  {
    name: string;
    role: 'owner' | 'partner';
    affectionate: string;
    funny: string;
    endearmentBadge: string;
  }
> = {
  'lauretokathyclaire@gmail.com': {
    name: 'Kathy',
    role: 'owner',
    affectionate: 'Moly',
    funny: 'Ling',
    endearmentBadge: 'Moly · Ling',
  },
  'austinfeguro@gmail.com': {
    name: 'Austin',
    role: 'partner',
    affectionate: 'Love',
    funny: 'Kong',
    endearmentBadge: 'Love · Kong',
  },
};

export interface CoupleConfig {
  displayName: string;
  subtitle: string;
  partnerOneName: string;
  partnerTwoName: string;
  affectionateLabelOne: string;
  affectionateLabelTwo: string;
  funnyLabelOne: string;
  funnyLabelTwo: string;
  relationshipStartDate: string; // YYYY-MM-DD
  timezone: string;
  featuredMemoryId: string;
  maxFileSizeMB: number;
  trashRetentionDays: number;
  createdAt?: unknown;
  updatedAt?: unknown;
  updatedBy: string;
}

export const DEFAULT_COUPLE_CONFIG: Omit<CoupleConfig, 'createdAt' | 'updatedAt' | 'updatedBy'> = {
  displayName: 'Moly & Love: Our Little Universe',
  subtitle: 'Kathy & Austin · Tiny moments, big meaning',
  partnerOneName: 'Kathy',
  partnerTwoName: 'Austin',
  affectionateLabelOne: 'Moly',
  affectionateLabelTwo: 'Love',
  funnyLabelOne: 'Ling',
  funnyLabelTwo: 'Kong',
  relationshipStartDate: '2026-09-15',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Manila',
  featuredMemoryId: '',
  maxFileSizeMB: 50,
  trashRetentionDays: 30,
};

export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
];

export const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

export const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/aac',
  'audio/x-m4a',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
];

export const ALL_SUPPORTED_MIME_TYPES = [
  ...SUPPORTED_IMAGE_TYPES,
  ...SUPPORTED_VIDEO_TYPES,
  ...SUPPORTED_AUDIO_TYPES,
];

export const DEFAULT_SUGGESTED_TAGS = [
  'date night',
  'travel',
  'food',
  'milestones',
  'random moments',
  'gifts',
  'celebrations',
  'cozy',
  'sweet',
];

export const DEFAULT_LING_KONG_LABELS = [
  'Ling being Ling',
  'Kong being Kong',
  'Our nonsense',
  'Things only we understand',
  'Unfiltered chaos',
];

export const DEFAULT_BUCKET_CATEGORIES = [
  'Places to Go',
  'Food to Try',
  'Movies to Watch',
  'Things to Learn',
  'Experiences to Share',
];
