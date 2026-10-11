import {
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES,
  SUPPORTED_AUDIO_TYPES,
} from '../config/coupleConfig';
import { MediaType, DateSource } from '../types/models';

export interface FileValidationResult {
  valid: boolean;
  mediaType?: MediaType;
  error?: string;
}

/**
 * Validates file MIME type (not just file extension) and size limit.
 */
export function validateMediaFile(
  file: File,
  maxFileSizeMB: number
): FileValidationResult {
  const mime = (file.type || '').toLowerCase();
  const maxBytes = maxFileSizeMB * 1024 * 1024;

  if (file.size === 0) {
    return { valid: false, error: `"${file.name}" is empty (0 bytes).` };
  }

  if (file.size > maxBytes) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `"${file.name}" (${sizeMB} MB) exceeds the configured ${maxFileSizeMB} MB per-file limit.`,
    };
  }

  if (SUPPORTED_IMAGE_TYPES.includes(mime)) {
    return { valid: true, mediaType: 'photo' };
  }
  if (SUPPORTED_VIDEO_TYPES.includes(mime)) {
    return { valid: true, mediaType: 'video' };
  }
  if (SUPPORTED_AUDIO_TYPES.includes(mime)) {
    return { valid: true, mediaType: 'audio' };
  }

  return {
    valid: false,
    error: `"${file.name}" has unsupported MIME type "${mime || 'unknown'}". Supported formats: JPEG, PNG, WebP, MP4, WebM, MP3, M4A/AAC, WAV.`,
  };
}

/**
 * Extracts capture date from file metadata or lastModified without inventing a false EXIF date.
 */
export function detectFileCaptureDate(file: File): {
  isoDate: string;
  source: DateSource;
  notice: string;
} {
  if (file.lastModified && file.lastModified > 946684800000) {
    const d = new Date(file.lastModified);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return {
      isoDate: `${y}-${m}-${day}`,
      source: 'file-modified',
      notice:
        'Defaulted to file modification date (no embedded camera EXIF timestamp detected). You can edit this date anytime.',
    };
  }

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return {
    isoDate: `${y}-${m}-${day}`,
    source: 'fallback-today',
    notice:
      'Could not read a capture date from file metadata; defaulted to today.',
  };
}

/**
 * Generates a lightweight resized preview thumbnail data URL for images
 * so gallery grids load swiftly while preserving original files in Firebase Storage.
 */
export async function generateImagePreviewDataUrl(
  file: File,
  maxDimension = 900,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve('');
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          // Ensure preview stays well under Firestore field limits (max 300KB)
          if (dataUrl.length <= 320000) {
            resolve(dataUrl);
          } else {
            const smallerUrl = canvas.toDataURL('image/jpeg', 0.55);
            resolve(smallerUrl.length <= 320000 ? smallerUrl : '');
          }
        } catch {
          resolve('');
        }
      };
      img.onerror = () => resolve('');
      img.src = typeof reader.result === 'string' ? reader.result : '';
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Formats byte count into human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Validates external music streaming links for Our Soundtrack (Spotify, Apple Music, YouTube, SoundCloud).
 */
export function validateExternalMusicUrl(urlStr: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = urlStr.trim();
  if (!trimmed) return { valid: true };
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'External song links must use HTTPS.' };
    }
    const allowedDomains = [
      'spotify.com',
      'open.spotify.com',
      'music.apple.com',
      'youtube.com',
      'www.youtube.com',
      'youtu.be',
      'music.youtube.com',
      'soundcloud.com',
      'bandcamp.com',
      'tidal.com',
    ];
    const host = parsed.hostname.toLowerCase();
    const isAllowed = allowedDomains.some(
      (d) => host === d || host.endsWith(`.${d}`)
    );
    if (!isAllowed) {
      return {
        valid: false,
        error:
          'Please use a recognized music link (Spotify, Apple Music, YouTube Music, YouTube, SoundCloud, Bandcamp, or Tidal).',
      };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Please enter a valid URL starting with https://' };
  }
}
