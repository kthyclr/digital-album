import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTask,
} from 'firebase/storage';
import {
  db,
  storage,
  auth,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  COUPLE_SPACE_ID,
  CoupleConfig,
  DEFAULT_COUPLE_CONFIG,
  PARTNER_PROFILES,
} from '../config/coupleConfig';
import {
  MemoryItem,
  CustomAlbum,
  StoryMilestone,
  TimeCapsuleLetter,
  BucketListItem,
  UserPreferences,
  DateSource,
  MediaType,
  LetterRecipient,
  BucketStatus,
  BucketPriority,
} from '../types/models';
import { generateImagePreviewDataUrl } from '../utils/mediaUtils';

/**
 * Ensures the couple space document, current member profile, and personal preferences exist.
 */
export async function bootstrapAuthorizedCoupleMember(
  uid: string,
  email: string,
  displayName: string | null
): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const partnerInfo = PARTNER_PROFILES[normalizedEmail];
  if (!partnerInfo) {
    throw new Error('Unauthorized email address for this private couple space.');
  }

  const couplePath = `couples/${COUPLE_SPACE_ID}`;
  const coupleDocRef = doc(db, 'couples', COUPLE_SPACE_ID);

  try {
    const coupleSnap = await getDoc(coupleDocRef);
    if (!coupleSnap.exists()) {
      await setDoc(coupleDocRef, {
        ...DEFAULT_COUPLE_CONFIG,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, couplePath);
  }

  const memberPath = `couples/${COUPLE_SPACE_ID}/members/${uid}`;
  const memberDocRef = doc(db, 'couples', COUPLE_SPACE_ID, 'members', uid);
  try {
    const memberSnap = await getDoc(memberDocRef);
    if (!memberSnap.exists()) {
      await setDoc(memberDocRef, {
        uid,
        role: partnerInfo.role,
        displayName: (displayName || partnerInfo.name).slice(0, 80),
        email: normalizedEmail,
        endearment: partnerInfo.endearmentBadge,
        status: 'active',
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, memberPath);
  }

  const prefPath = `users/${uid}/preferences/default`;
  const prefDocRef = doc(db, 'users', uid, 'preferences', 'default');
  try {
    const prefSnap = await getDoc(prefDocRef);
    if (!prefSnap.exists()) {
      await setDoc(prefDocRef, {
        uid,
        theme: 'light',
        defaultViewMode: 'grid',
        reducedMotion: false,
        favoriteMemoryIds: [],
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, prefPath);
  }
}

/**
 * Updates shared couple space configuration.
 */
export async function updateCoupleConfiguration(
  currentConfig: CoupleConfig,
  updates: Partial<CoupleConfig>
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  const couplePath = `couples/${COUPLE_SPACE_ID}`;
  const coupleDocRef = doc(db, 'couples', COUPLE_SPACE_ID);

  const merged = {
    displayName: (updates.displayName ?? currentConfig.displayName).trim().slice(0, 120),
    subtitle: (updates.subtitle ?? currentConfig.subtitle).trim().slice(0, 200),
    partnerOneName: (updates.partnerOneName ?? currentConfig.partnerOneName).trim().slice(0, 60),
    partnerTwoName: (updates.partnerTwoName ?? currentConfig.partnerTwoName).trim().slice(0, 60),
    affectionateLabelOne: (updates.affectionateLabelOne ?? currentConfig.affectionateLabelOne).trim().slice(0, 40),
    affectionateLabelTwo: (updates.affectionateLabelTwo ?? currentConfig.affectionateLabelTwo).trim().slice(0, 40),
    funnyLabelOne: (updates.funnyLabelOne ?? currentConfig.funnyLabelOne).trim().slice(0, 40),
    funnyLabelTwo: (updates.funnyLabelTwo ?? currentConfig.funnyLabelTwo).trim().slice(0, 40),
    relationshipStartDate: (updates.relationshipStartDate ?? currentConfig.relationshipStartDate).trim().slice(0, 40),
    timezone: (updates.timezone ?? currentConfig.timezone).trim().slice(0, 80),
    featuredMemoryId: (updates.featuredMemoryId ?? currentConfig.featuredMemoryId ?? '').trim().slice(0, 128),
    maxFileSizeMB: Math.min(500, Math.max(1, Number(updates.maxFileSizeMB ?? currentConfig.maxFileSizeMB))),
    trashRetentionDays: Math.min(365, Math.max(1, Number(updates.trashRetentionDays ?? currentConfig.trashRetentionDays))),
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  };

  try {
    await updateDoc(coupleDocRef, merged);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, couplePath);
  }
}

/**
 * Updates per-user preferences (theme, view mode, reduced motion, personal favorites).
 */
export async function updateUserPreferences(
  currentPrefs: UserPreferences,
  updates: Partial<UserPreferences>
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  const prefPath = `users/${uid}/preferences/default`;
  const prefDocRef = doc(db, 'users', uid, 'preferences', 'default');

  const payload = {
    theme: updates.theme ?? currentPrefs.theme,
    defaultViewMode: updates.defaultViewMode ?? currentPrefs.defaultViewMode,
    reducedMotion: updates.reducedMotion ?? currentPrefs.reducedMotion,
    favoriteMemoryIds: (updates.favoriteMemoryIds ?? currentPrefs.favoriteMemoryIds).slice(0, 100),
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(prefDocRef, payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, prefPath);
  }
}

export interface UploadMemoryParams {
  file: File;
  mediaType: MediaType;
  title: string;
  caption: string;
  memoryDate: string; // YYYY-MM-DD
  dateSource: DateSource;
  locationText: string;
  altText: string;
  tags: string[];
  albumIds: string[];
  isLingKong: boolean;
  lingKongLabel: string;
  isSoundtrack: boolean;
  externalSongUrl: string;
  soundtrackNotes: string;
  isFavorite: boolean;
  onProgress?: (percent: number) => void;
  onTaskCreated?: (task: UploadTask) => void;
}

// Track whether Firebase Cloud Storage bucket is reachable in this session
// so we don't wait on network retries if Storage is not yet enabled on the project.
let storageBucketAvailable = true;

/**
 * Uploads a media file to Firebase Storage (with resumable progress and preview fallback)
 * and writes validated metadata to Firestore only after upload succeeds.
 * Cleans up orphaned Storage objects if Firestore write fails.
 */
export async function uploadAndCreateMemory(
  params: UploadMemoryParams
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in to upload memories.');

  const memoryColRef = collection(db, 'couples', COUPLE_SPACE_ID, 'memories');
  const newMemoryDocRef = doc(memoryColRef);
  const memoryId = newMemoryDocRef.id;

  const safeFileName = params.file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 180);
  const objectStoragePath = `couples/${COUPLE_SPACE_ID}/memories/${memoryId}/${Date.now()}_${safeFileName}`;

  if (params.onProgress) params.onProgress(15);

  // Generate high-clarity preview for photos right away
  const thumbnailUrl = await generateImagePreviewDataUrl(params.file, 1200, 0.82);
  if (params.onProgress) params.onProgress(40);

  let uploadedStoragePath = '';
  let resolvedMediaUrl = '';

  const fallbackToFastFirestoreMedia = async (originalError?: unknown) => {
    if (params.mediaType === 'photo' && thumbnailUrl) {
      uploadedStoragePath = '';
      resolvedMediaUrl = thumbnailUrl;
      if (params.onProgress) params.onProgress(100);
      return;
    }
    if (params.file.size <= 520 * 1024) {
      const inlineDataUrl = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () =>
          res(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => rej(originalError || new Error('File read error'));
        reader.readAsDataURL(params.file);
      });
      if (inlineDataUrl && inlineDataUrl.length <= 740000) {
        uploadedStoragePath = '';
        resolvedMediaUrl = inlineDataUrl;
        if (params.onProgress) params.onProgress(100);
        return;
      }
    }
    throw (
      originalError ||
      new Error(
        'For large video or audio files over 500 KB, please enable Cloud Storage in your Firebase Console.'
      )
    );
  };

  if (!storageBucketAvailable) {
    await fallbackToFastFirestoreMedia();
  } else {
    try {
      const fileRef = storageRef(storage, objectStoragePath);
      const uploadTask = uploadBytesResumable(fileRef, params.file, {
        contentType: params.file.type,
        customMetadata: {
          createdBy: user.uid,
          memoryId,
        },
      });

      if (params.onTaskCreated) {
        params.onTaskCreated(uploadTask);
      }

      await new Promise<void>((resolve, reject) => {
        let madeProgress = false;
        // If Storage makes zero progress within 3.5 seconds (e.g., bucket not initialized or CORS blocked),
        // abort the hung request and use the fast preview pipeline immediately.
        const stallTimer = setTimeout(() => {
          if (!madeProgress) {
            storageBucketAvailable = false;
            uploadTask.cancel();
            reject(new Error('storage/stall-timeout'));
          }
        }, 3500);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (snapshot.bytesTransferred > 0) {
              madeProgress = true;
              clearTimeout(stallTimer);
            }
            if (snapshot.totalBytes > 0 && params.onProgress) {
              const pct = Math.max(
                40,
                Math.round(
                  (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                )
              );
              params.onProgress(pct);
            }
          },
          (error) => {
            clearTimeout(stallTimer);
            reject(error);
          },
          () => {
            clearTimeout(stallTimer);
            resolve();
          }
        );
      });

      uploadedStoragePath = objectStoragePath;
      resolvedMediaUrl = await getDownloadURL(fileRef);
    } catch (storageErr: unknown) {
      const errCode =
        storageErr && typeof storageErr === 'object' && 'code' in storageErr
          ? (storageErr as { code: string }).code
          : '';
      const errMsg =
        storageErr instanceof Error ? storageErr.message : String(storageErr);

      // Only treat as user cancellation if it wasn't our stall-timeout detector
      if (
        errCode === 'storage/canceled' &&
        !errMsg.includes('storage/stall-timeout') &&
        storageBucketAvailable
      ) {
        throw new Error('Upload was cancelled.');
      }

      storageBucketAvailable = false;
      await fallbackToFastFirestoreMedia(storageErr);
    }
  }

  // Parse memoryYear and memoryMonth from memoryDate
  const dateParts = params.memoryDate.split('-').map((p) => parseInt(p, 10));
  const memoryYear =
    dateParts.length === 3 && !isNaN(dateParts[0])
      ? dateParts[0]
      : new Date().getFullYear();
  const memoryMonth =
    dateParts.length === 3 &&
    !isNaN(dateParts[1]) &&
    dateParts[1] >= 1 &&
    dateParts[1] <= 12
      ? dateParts[1]
      : new Date().getMonth() + 1;

  const partnerProfile =
    PARTNER_PROFILES[(user.email || '').toLowerCase()] || {
      name: user.displayName || 'Partner',
    };

  const cleanTags = Array.from(
    new Set(
      params.tags
        .map((t) => t.trim().slice(0, 50))
        .filter((t) => t.length > 0)
    )
  ).slice(0, 15);

  const cleanAlbumIds = Array.from(
    new Set(
      params.albumIds
        .map((a) => a.trim().slice(0, 128))
        .filter((a) => a.length > 0)
    )
  ).slice(0, 10);

  const memoryRecord = {
    title: params.title.trim().slice(0, 160),
    caption: params.caption.trim().slice(0, 2000),
    memoryDate: params.memoryDate.trim().slice(0, 40),
    memoryYear,
    memoryMonth,
    dateSource: params.dateSource,
    mediaType: params.mediaType,
    storagePath: uploadedStoragePath.slice(0, 500),
    mediaUrl: resolvedMediaUrl.slice(0, 750000),
    thumbnailUrl: (thumbnailUrl || '').slice(0, 350000),
    originalFileName: params.file.name.slice(0, 255),
    contentType: (params.file.type || 'application/octet-stream').slice(0, 100),
    sizeBytes: params.file.size,
    locationText: params.locationText.trim().slice(0, 160),
    altText: (params.altText.trim() || params.title.trim() || params.file.name).slice(0, 300),
    tags: cleanTags,
    albumIds: cleanAlbumIds,
    favoritedBy: params.isFavorite ? [user.uid] : [],
    isLingKong: Boolean(params.isLingKong),
    lingKongLabel: params.lingKongLabel.trim().slice(0, 80),
    isSoundtrack: Boolean(params.isSoundtrack),
    externalSongUrl: params.externalSongUrl.trim().slice(0, 500),
    soundtrackNotes: params.soundtrackNotes.trim().slice(0, 1000),
    status: 'active' as const,
    trashedAt: '',
    createdBy: user.uid,
    creatorName: partnerProfile.name.slice(0, 80),
    uploadedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docPath = `couples/${COUPLE_SPACE_ID}/memories/${memoryId}`;
  try {
    await setDoc(newMemoryDocRef, memoryRecord);
    return memoryId;
  } catch (firestoreErr) {
    // Cleanup orphaned Storage file if Firestore metadata write failed
    if (uploadedStoragePath) {
      try {
        await deleteObject(storageRef(storage, uploadedStoragePath));
      } catch (cleanupErr) {
        console.error('Failed to clean up orphaned Storage object:', cleanupErr);
      }
    }
    handleFirestoreError(firestoreErr, OperationType.CREATE, docPath);
  }
}

/**
 * Creates a standalone external song entry in Our Soundtrack without requiring a binary upload.
 */
export async function createExternalSoundtrackMemory(params: {
  title: string;
  caption: string;
  memoryDate: string;
  externalSongUrl: string;
  soundtrackNotes: string;
  tags: string[];
}): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');

  const memoryColRef = collection(db, 'couples', COUPLE_SPACE_ID, 'memories');
  const newMemoryDocRef = doc(memoryColRef);
  const dateParts = params.memoryDate.split('-').map((p) => parseInt(p, 10));
  const memoryYear = dateParts[0] || new Date().getFullYear();
  const memoryMonth = dateParts[1] || new Date().getMonth() + 1;

  const partnerProfile =
    PARTNER_PROFILES[(user.email || '').toLowerCase()] || {
      name: user.displayName || 'Partner',
    };

  const docPath = `couples/${COUPLE_SPACE_ID}/memories/${newMemoryDocRef.id}`;
  try {
    await setDoc(newMemoryDocRef, {
      title: params.title.trim().slice(0, 160),
      caption: params.caption.trim().slice(0, 2000),
      memoryDate: params.memoryDate.trim().slice(0, 40),
      memoryYear,
      memoryMonth,
      dateSource: 'manual',
      mediaType: 'audio',
      storagePath: '',
      mediaUrl: '',
      thumbnailUrl: '',
      originalFileName: 'external-song-link',
      contentType: 'audio/mpeg',
      sizeBytes: 0,
      locationText: '',
      altText: params.title.trim().slice(0, 300),
      tags: params.tags.map((t) => t.trim().slice(0, 50)).filter(Boolean).slice(0, 15),
      albumIds: [],
      favoritedBy: [],
      isLingKong: false,
      lingKongLabel: '',
      isSoundtrack: true,
      externalSongUrl: params.externalSongUrl.trim().slice(0, 500),
      soundtrackNotes: params.soundtrackNotes.trim().slice(0, 1000),
      status: 'active',
      trashedAt: '',
      createdBy: user.uid,
      creatorName: partnerProfile.name.slice(0, 80),
      uploadedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return newMemoryDocRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, docPath);
  }
}

/**
 * Updates metadata on an existing memory without re-uploading the original file.
 */
export async function updateMemoryMetadata(
  memory: MemoryItem,
  updates: Partial<{
    title: string;
    caption: string;
    memoryDate: string;
    dateSource: DateSource;
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
  }>
): Promise<void> {
  const docPath = `couples/${COUPLE_SPACE_ID}/memories/${memory.id}`;
  const docRef = doc(db, 'couples', COUPLE_SPACE_ID, 'memories', memory.id);

  const nextDate = (updates.memoryDate ?? memory.memoryDate).trim().slice(0, 40);
  const parts = nextDate.split('-').map((p) => parseInt(p, 10));
  const memoryYear = parts[0] || memory.memoryYear;
  const memoryMonth = parts[1] || memory.memoryMonth;

  const cleanTags = (updates.tags ?? memory.tags)
    .map((t) => t.trim().slice(0, 50))
    .filter(Boolean)
    .slice(0, 15);

  const cleanAlbums = (updates.albumIds ?? memory.albumIds)
    .map((a) => a.trim().slice(0, 128))
    .filter(Boolean)
    .slice(0, 10);

  const payload = {
    title: (updates.title ?? memory.title).trim().slice(0, 160),
    caption: (updates.caption ?? memory.caption).trim().slice(0, 2000),
    memoryDate: nextDate,
    memoryYear,
    memoryMonth,
    dateSource: updates.dateSource ?? memory.dateSource,
    locationText: (updates.locationText ?? memory.locationText).trim().slice(0, 160),
    altText: (updates.altText ?? memory.altText).trim().slice(0, 300),
    tags: cleanTags,
    albumIds: cleanAlbums,
    favoritedBy: (updates.favoritedBy ?? memory.favoritedBy).slice(0, 5),
    isLingKong: updates.isLingKong ?? memory.isLingKong,
    lingKongLabel: (updates.lingKongLabel ?? memory.lingKongLabel).trim().slice(0, 80),
    isSoundtrack: updates.isSoundtrack ?? memory.isSoundtrack,
    externalSongUrl: (updates.externalSongUrl ?? memory.externalSongUrl).trim().slice(0, 500),
    soundtrackNotes: (updates.soundtrackNotes ?? memory.soundtrackNotes).trim().slice(0, 1000),
    status: updates.status ?? memory.status,
    trashedAt: updates.trashedAt ?? memory.trashedAt,
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(docRef, payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, docPath);
  }
}

/**
 * Toggles favorite status for the current user on a memory.
 */
export async function toggleMemoryFavorite(
  memory: MemoryItem,
  userUid: string
): Promise<boolean> {
  const isFav = memory.favoritedBy.includes(userUid);
  const nextFavs = isFav
    ? memory.favoritedBy.filter((id) => id !== userUid)
    : [...memory.favoritedBy, userUid].slice(0, 5);

  await updateMemoryMetadata(memory, { favoritedBy: nextFavs });
  return !isFav;
}

/**
 * Soft-deletes a memory to Trash or restores it to active gallery.
 */
export async function setMemoryTrashState(
  memory: MemoryItem,
  moveToTrash: boolean
): Promise<void> {
  await updateMemoryMetadata(memory, {
    status: moveToTrash ? 'trashed' : 'active',
    trashedAt: moveToTrash ? new Date().toISOString().slice(0, 40) : '',
  });
}

/**
 * Permanently deletes a memory and its Storage object.
 * Reports partial failures truthfully rather than silently leaving orphaned media.
 */
export async function permanentlyDeleteMemory(
  memory: MemoryItem
): Promise<{ storageDeleted: boolean; warning?: string }> {
  let storageDeleted = true;
  let warning: string | undefined;

  if (memory.storagePath) {
    try {
      await deleteObject(storageRef(storage, memory.storagePath));
    } catch (storageErr: unknown) {
      // If object is already gone (storage/object-not-found), proceed with metadata deletion
      const code =
        storageErr && typeof storageErr === 'object' && 'code' in storageErr
          ? (storageErr as { code: string }).code
          : '';
      if (code !== 'storage/object-not-found') {
        storageDeleted = false;
        warning =
          'The Firestore metadata record was removed, but the original Storage file could not be deleted automatically.';
      }
    }
  }

  const docPath = `couples/${COUPLE_SPACE_ID}/memories/${memory.id}`;
  try {
    await deleteDoc(doc(db, 'couples', COUPLE_SPACE_ID, 'memories', memory.id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, docPath);
  }

  return { storageDeleted, warning };
}

/**
 * Custom Albums CRUD
 */
export async function createCustomAlbum(
  title: string,
  description: string,
  coverMemoryId = ''
): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  const colRef = collection(db, 'couples', COUPLE_SPACE_ID, 'albums');
  const newDocRef = doc(colRef);
  const path = `couples/${COUPLE_SPACE_ID}/albums/${newDocRef.id}`;

  try {
    await setDoc(newDocRef, {
      title: title.trim().slice(0, 100),
      description: description.trim().slice(0, 500),
      coverMemoryId: coverMemoryId.trim().slice(0, 128),
      sortOrder: Date.now() % 9000,
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return newDocRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateCustomAlbum(
  album: CustomAlbum,
  updates: Partial<{
    title: string;
    description: string;
    coverMemoryId: string;
    sortOrder: number;
  }>
): Promise<void> {
  const path = `couples/${COUPLE_SPACE_ID}/albums/${album.id}`;
  const docRef = doc(db, 'couples', COUPLE_SPACE_ID, 'albums', album.id);
  try {
    await updateDoc(docRef, {
      title: (updates.title ?? album.title).trim().slice(0, 100),
      description: (updates.description ?? album.description).trim().slice(0, 500),
      coverMemoryId: (updates.coverMemoryId ?? album.coverMemoryId).trim().slice(0, 128),
      sortOrder: updates.sortOrder ?? album.sortOrder,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteCustomAlbum(albumId: string): Promise<void> {
  const path = `couples/${COUPLE_SPACE_ID}/albums/${albumId}`;
  try {
    await deleteDoc(doc(db, 'couples', COUPLE_SPACE_ID, 'albums', albumId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Our Story Timeline Milestones CRUD
 */
export async function createStoryMilestone(params: {
  title: string;
  description: string;
  eventDate: string;
  category: string;
  memoryIds: string[];
}): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  const colRef = collection(db, 'couples', COUPLE_SPACE_ID, 'milestones');
  const newDocRef = doc(colRef);
  const path = `couples/${COUPLE_SPACE_ID}/milestones/${newDocRef.id}`;

  try {
    await setDoc(newDocRef, {
      title: params.title.trim().slice(0, 140),
      description: params.description.trim().slice(0, 1500),
      eventDate: params.eventDate.trim().slice(0, 40),
      category: params.category.trim().slice(0, 60),
      memoryIds: params.memoryIds.slice(0, 10),
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return newDocRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateStoryMilestone(
  milestone: StoryMilestone,
  updates: Partial<{
    title: string;
    description: string;
    eventDate: string;
    category: string;
    memoryIds: string[];
  }>
): Promise<void> {
  const path = `couples/${COUPLE_SPACE_ID}/milestones/${milestone.id}`;
  const docRef = doc(db, 'couples', COUPLE_SPACE_ID, 'milestones', milestone.id);
  try {
    await updateDoc(docRef, {
      title: (updates.title ?? milestone.title).trim().slice(0, 140),
      description: (updates.description ?? milestone.description).trim().slice(0, 1500),
      eventDate: (updates.eventDate ?? milestone.eventDate).trim().slice(0, 40),
      category: (updates.category ?? milestone.category).trim().slice(0, 60),
      memoryIds: (updates.memoryIds ?? milestone.memoryIds).slice(0, 10),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteStoryMilestone(milestoneId: string): Promise<void> {
  const path = `couples/${COUPLE_SPACE_ID}/milestones/${milestoneId}`;
  try {
    await deleteDoc(doc(db, 'couples', COUPLE_SPACE_ID, 'milestones', milestoneId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Time Capsule Letters CRUD (Server-Authoritative Lock Architecture)
 * - Outer envelope stored at `/couples/{coupleId}/letters/{letterId}`
 * - Confidential body stored at `/couples/{coupleId}/letters/{letterId}/secrets/body`
 *   which Firestore Security Rules block reading until `request.time >= unlockAt`.
 */
export async function createTimeCapsuleLetter(params: {
  title: string;
  recipient: LetterRecipient;
  occasionNote: string;
  unlockDateIso: string; // YYYY-MM-DDTHH:mm or YYYY-MM-DD
  body: string;
}): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');

  const unlockDateObj = new Date(params.unlockDateIso);
  if (isNaN(unlockDateObj.getTime())) {
    throw new Error('Please choose a valid unlock date and time.');
  }
  const unlockTimestamp = Timestamp.fromDate(unlockDateObj);

  const partnerProfile =
    PARTNER_PROFILES[(user.email || '').toLowerCase()] || {
      name: user.displayName || 'Partner',
    };

  const lettersCol = collection(db, 'couples', COUPLE_SPACE_ID, 'letters');
  const letterDocRef = doc(lettersCol);
  const secretDocRef = doc(
    db,
    'couples',
    COUPLE_SPACE_ID,
    'letters',
    letterDocRef.id,
    'secrets',
    'body'
  );

  const batch = writeBatch(db);
  batch.set(letterDocRef, {
    title: params.title.trim().slice(0, 140),
    recipient: params.recipient,
    occasionNote: params.occasionNote.trim().slice(0, 240),
    unlockAt: unlockTimestamp,
    unlockDateIso: params.unlockDateIso.trim().slice(0, 40),
    readBy: [],
    createdBy: user.uid,
    creatorName: partnerProfile.name.slice(0, 80),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(secretDocRef, {
    body: params.body.trim().slice(0, 15000),
    unlockAt: unlockTimestamp,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const path = `couples/${COUPLE_SPACE_ID}/letters/${letterDocRef.id}`;
  try {
    await batch.commit();
    return letterDocRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

/**
 * Fetches the protected body of an unlocked Time Capsule letter.
 * If called before unlockAt, Firestore Security Rules reject the read with PERMISSION_DENIED.
 */
export async function readUnlockedLetterBody(letterId: string): Promise<string> {
  const secretPath = `couples/${COUPLE_SPACE_ID}/letters/${letterId}/secrets/body`;
  const secretDocRef = doc(
    db,
    'couples',
    COUPLE_SPACE_ID,
    'letters',
    letterId,
    'secrets',
    'body'
  );
  try {
    const snap = await getDoc(secretDocRef);
    if (!snap.exists()) {
      throw new Error('Letter contents were not found.');
    }
    return (snap.data().body as string) || '';
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, secretPath);
  }
}

/**
 * Marks an unlocked Time Capsule letter as read by the current partner.
 */
export async function markLetterAsRead(
  letter: TimeCapsuleLetter,
  uid: string
): Promise<void> {
  if (letter.readBy.includes(uid)) return;
  const path = `couples/${COUPLE_SPACE_ID}/letters/${letter.id}`;
  const docRef = doc(db, 'couples', COUPLE_SPACE_ID, 'letters', letter.id);
  try {
    await updateDoc(docRef, {
      readBy: [...letter.readBy, uid].slice(0, 5),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/**
 * Updates a locked Time Capsule letter (allowed by creator before unlock time).
 */
export async function updateLockedLetter(
  letterId: string,
  params: {
    title: string;
    recipient: LetterRecipient;
    occasionNote: string;
    unlockDateIso: string;
    body?: string;
  }
): Promise<void> {
  const unlockDateObj = new Date(params.unlockDateIso);
  if (isNaN(unlockDateObj.getTime())) {
    throw new Error('Invalid unlock date.');
  }
  const unlockTimestamp = Timestamp.fromDate(unlockDateObj);
  const letterRef = doc(db, 'couples', COUPLE_SPACE_ID, 'letters', letterId);
  const path = `couples/${COUPLE_SPACE_ID}/letters/${letterId}`;

  try {
    const batch = writeBatch(db);
    batch.update(letterRef, {
      title: params.title.trim().slice(0, 140),
      recipient: params.recipient,
      occasionNote: params.occasionNote.trim().slice(0, 240),
      unlockAt: unlockTimestamp,
      unlockDateIso: params.unlockDateIso.trim().slice(0, 40),
      updatedAt: serverTimestamp(),
    });

    if (params.body && params.body.trim().length > 0) {
      const secretRef = doc(
        db,
        'couples',
        COUPLE_SPACE_ID,
        'letters',
        letterId,
        'secrets',
        'body'
      );
      batch.update(secretRef, {
        body: params.body.trim().slice(0, 15000),
        unlockAt: unlockTimestamp,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/**
 * Deletes a locked Time Capsule letter (allowed by creator before unlock time).
 */
export async function deleteLockedLetter(letterId: string): Promise<void> {
  const letterRef = doc(db, 'couples', COUPLE_SPACE_ID, 'letters', letterId);
  const secretRef = doc(
    db,
    'couples',
    COUPLE_SPACE_ID,
    'letters',
    letterId,
    'secrets',
    'body'
  );
  const path = `couples/${COUPLE_SPACE_ID}/letters/${letterId}`;
  try {
    const batch = writeBatch(db);
    batch.delete(secretRef);
    batch.delete(letterRef);
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Shared Bucket List CRUD
 */
export async function createBucketListItem(params: {
  title: string;
  description: string;
  category: string;
  priority: BucketPriority;
  targetDate: string;
  linkedMemoryIds: string[];
}): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  const colRef = collection(db, 'couples', COUPLE_SPACE_ID, 'bucketItems');
  const newDocRef = doc(colRef);
  const path = `couples/${COUPLE_SPACE_ID}/bucketItems/${newDocRef.id}`;

  try {
    await setDoc(newDocRef, {
      title: params.title.trim().slice(0, 140),
      description: params.description.trim().slice(0, 1000),
      category: params.category.trim().slice(0, 60),
      status: 'planned',
      priority: params.priority,
      targetDate: params.targetDate.trim().slice(0, 40),
      linkedMemoryIds: params.linkedMemoryIds.slice(0, 10),
      completedAt: '',
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return newDocRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateBucketListItem(
  item: BucketListItem,
  updates: Partial<{
    title: string;
    description: string;
    category: string;
    status: BucketStatus;
    priority: BucketPriority;
    targetDate: string;
    linkedMemoryIds: string[];
    completedAt: string;
  }>
): Promise<void> {
  const path = `couples/${COUPLE_SPACE_ID}/bucketItems/${item.id}`;
  const docRef = doc(db, 'couples', COUPLE_SPACE_ID, 'bucketItems', item.id);
  const nextStatus = updates.status ?? item.status;
  const nextCompletedAt =
    nextStatus === 'completed'
      ? updates.completedAt || item.completedAt || new Date().toISOString().slice(0, 10)
      : '';

  try {
    await updateDoc(docRef, {
      title: (updates.title ?? item.title).trim().slice(0, 140),
      description: (updates.description ?? item.description).trim().slice(0, 1000),
      category: (updates.category ?? item.category).trim().slice(0, 60),
      status: nextStatus,
      priority: updates.priority ?? item.priority,
      targetDate: (updates.targetDate ?? item.targetDate).trim().slice(0, 40),
      linkedMemoryIds: (updates.linkedMemoryIds ?? item.linkedMemoryIds).slice(0, 10),
      completedAt: nextCompletedAt.slice(0, 40),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteBucketListItem(itemId: string): Promise<void> {
  const path = `couples/${COUPLE_SPACE_ID}/bucketItems/${itemId}`;
  try {
    await deleteDoc(doc(db, 'couples', COUPLE_SPACE_ID, 'bucketItems', itemId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
