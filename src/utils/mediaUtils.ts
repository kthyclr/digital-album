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

  const isHeic =
    mime === 'image/heic' ||
    mime === 'image/heif' ||
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif');

  // Video check first if mime or extension is video
  if (
    SUPPORTED_VIDEO_TYPES.includes(mime) ||
    /\.(mp4|webm|mov)$/i.test(file.name)
  ) {
    return { valid: true, mediaType: 'video' };
  }

  // Audio check next
  if (
    SUPPORTED_AUDIO_TYPES.includes(mime) ||
    /\.(mp3|wav|m4a|aac|ogg)$/i.test(file.name)
  ) {
    return { valid: true, mediaType: 'audio' };
  }

  // Image check
  if (
    SUPPORTED_IMAGE_TYPES.includes(mime) ||
    isHeic ||
    /\.(jpe?g|png|webp|gif)$/i.test(file.name)
  ) {
    return { valid: true, mediaType: 'photo' };
  }

  return {
    valid: false,
    error: `"${file.name}" has unsupported MIME type "${mime || 'unknown'}". Supported formats: JPEG, PNG, WebP, MP4, WebM, MP3, M4A/AAC, WAV.`,
  };
}

/**
 * Resolves the real media type (photo, video, audio) based on content type, URL, and filename.
 * Prevents video/audio files from mistakenly being rendered in <img> tags.
 */
export function detectActualMediaType(item: {
  mediaType?: MediaType;
  mediaUrl?: string;
  storagePath?: string;
  originalFileName?: string;
  contentType?: string;
}): MediaType {
  const url = (item.mediaUrl || '').toLowerCase();
  const path = (item.storagePath || '').toLowerCase();
  const name = (item.originalFileName || '').toLowerCase();
  const mime = (item.contentType || '').toLowerCase();

  // Video checks: MIME or file extension in url, path, or filename
  if (
    mime.startsWith('video/') ||
    /\.(mp4|webm|mov|m4v|mkv|avi)(\?|$)/i.test(url) ||
    /\.(mp4|webm|mov|m4v|mkv|avi)$/i.test(path) ||
    /\.(mp4|webm|mov|m4v|mkv|avi)$/i.test(name)
  ) {
    return 'video';
  }

  // Audio checks: MIME or file extension in url, path, or filename
  if (
    mime.startsWith('audio/') ||
    /\.(mp3|wav|m4a|aac|ogg|flac)(\?|$)/i.test(url) ||
    /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(path) ||
    /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(name)
  ) {
    return 'audio';
  }

  // If already tagged as video and URL doesn't look like an image
  if (item.mediaType === 'video' && !/\.(jpe?g|png|webp|gif|svg)(\?|$)/i.test(url)) {
    return 'video';
  }

  // If already tagged as audio and URL doesn't look like an image
  if (item.mediaType === 'audio' && !/\.(jpe?g|png|webp|gif|svg)(\?|$)/i.test(url)) {
    return 'audio';
  }

  return 'photo';
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
  maxDimension = 960,
  quality = 0.75
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
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          if (dataUrl.length > 340000) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.55);
          }
          if (dataUrl.length > 340000) {
            const smallCanvas = document.createElement('canvas');
            const scale = 640 / Math.max(width, height);
            smallCanvas.width = Math.round(width * scale);
            smallCanvas.height = Math.round(height * scale);
            const sCtx = smallCanvas.getContext('2d');
            if (sCtx) {
              sCtx.drawImage(img, 0, 0, smallCanvas.width, smallCanvas.height);
              dataUrl = smallCanvas.toDataURL('image/jpeg', 0.6);
            }
          }
          resolve(dataUrl.length <= 345000 ? dataUrl : '');
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

/**
 * Checks if a file or blob contains HEIC/HEIF image data.
 */
export async function isHeicImage(file: File | Blob): Promise<boolean> {
  const mime = (file.type || '').toLowerCase();
  if (mime === 'image/heic' || mime === 'image/heif') return true;
  if ('name' in file && typeof (file as File).name === 'string') {
    const ext = (file as File).name.toLowerCase();
    if (ext.endsWith('.heic') || ext.endsWith('.heif')) return true;
  }
  try {
    const slice = file.slice(0, 32);
    const buf = await slice.arrayBuffer();
    const str = String.fromCharCode(...new Uint8Array(buf));
    return (
      str.includes('ftypheic') ||
      str.includes('ftypmif1') ||
      str.includes('ftypheix') ||
      str.includes('ftypmsf1')
    );
  } catch {
    return false;
  }
}

/**
 * Ensures an image file is converted to a web-compatible JPEG if it is an HEIC/HEIF image.
 */
export async function ensureWebCompatibleImage(file: File): Promise<File> {
  const isHeic = await isHeicImage(file);
  if (!isHeic) return file;

  try {
    if (typeof window !== 'undefined') {
      const heic2anyModule = await import('heic2any');
      const heic2any = heic2anyModule.default || heic2anyModule;
      const converted = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.92,
      });
      const finalBlob = Array.isArray(converted) ? converted[0] : converted;
      const cleanName =
        file.name.replace(/\.(heic|heif|webp|png|jpg|jpeg)$/i, '') + '.jpg';
      return new File([finalBlob], cleanName, {
        type: 'image/jpeg',
        lastModified: file.lastModified || Date.now(),
      });
    }
  } catch (err) {
    console.warn('Could not convert HEIC on client:', err);
  }
  return file;
}
