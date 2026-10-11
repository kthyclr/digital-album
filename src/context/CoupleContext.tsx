import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  doc,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  COUPLE_SPACE_ID,
  AUTHORIZED_EMAILS,
  CoupleConfig,
  DEFAULT_COUPLE_CONFIG,
} from '../config/coupleConfig';
import {
  MemoryItem,
  CustomAlbum,
  StoryMilestone,
  TimeCapsuleLetter,
  BucketListItem,
  UserPreferences,
  MemberRecord,
  ToastMessage,
} from '../types/models';
import {
  bootstrapAuthorizedCoupleMember,
  syncOrphanedSupabaseMemories,
} from '../services/coupleDataService';

interface CoupleContextValue {
  user: User | null;
  authLoading: boolean;
  isAuthorizedMember: boolean;
  permissionReady: boolean;
  coupleConfig: CoupleConfig;
  members: MemberRecord[];
  userPrefs: UserPreferences;
  memories: MemoryItem[];
  albums: CustomAlbum[];
  milestones: StoryMilestone[];
  letters: TimeCapsuleLetter[];
  bucketItems: BucketListItem[];
  dataLoading: boolean;
  dataError: string | null;
  toasts: ToastMessage[];
  addToast: (
    title: string,
    type?: ToastMessage['type'],
    description?: string
  ) => void;
  dismissToast: (id: string) => void;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  syncSupabaseStorage: () => Promise<void>;
  patchLocalMemory: (memoryId: string, updates: Partial<MemoryItem>) => void;
  upsertLocalMemory: (memory: MemoryItem) => void;
  removeLocalMemory: (memoryId: string) => void;
  patchLocalCoupleConfig: (updates: Partial<CoupleConfig>) => void;
  patchLocalUserPrefs: (updates: Partial<UserPreferences>) => void;
  upsertLocalAlbum: (album: CustomAlbum) => void;
  removeLocalAlbum: (albumId: string) => void;
  upsertLocalMilestone: (milestone: StoryMilestone) => void;
  removeLocalMilestone: (milestoneId: string) => void;
  upsertLocalLetter: (letter: TimeCapsuleLetter) => void;
  removeLocalLetter: (letterId: string) => void;
  upsertLocalBucketItem: (item: BucketListItem) => void;
  removeLocalBucketItem: (itemId: string) => void;
}

const CoupleContext = createContext<CoupleContextValue | undefined>(undefined);

const DEFAULT_PREFS: UserPreferences = {
  uid: '',
  theme: 'light',
  defaultViewMode: 'grid',
  reducedMotion: false,
  favoriteMemoryIds: [],
};

export const CoupleProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isAuthorizedMember, setIsAuthorizedMember] = useState<boolean>(false);
  const [permissionReady, setPermissionReady] = useState<boolean>(false);

  const [coupleConfig, setCoupleConfig] = useState<CoupleConfig>({
    ...DEFAULT_COUPLE_CONFIG,
    updatedBy: '',
  });
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [userPrefs, setUserPrefs] = useState<UserPreferences>(DEFAULT_PREFS);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [albums, setAlbums] = useState<CustomAlbum[]>([]);
  const [milestones, setMilestones] = useState<StoryMilestone[]>([]);
  const [letters, setLetters] = useState<TimeCapsuleLetter[]>([]);
  const [bucketItems, setBucketItems] = useState<BucketListItem[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (
      title: string,
      type: ToastMessage['type'] = 'info',
      description?: string
    ) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, title, description }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4800);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Apply Dark Mode & Reduced Motion classes to documentElement
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      if (userPrefs.theme === 'dark') {
        root.classList.add('dark');
      } else if (userPrefs.theme === 'light') {
        root.classList.remove('dark');
      } else {
        const prefersDark = window.matchMedia(
          '(prefers-color-scheme: dark)'
        ).matches;
        root.classList.toggle('dark', prefersDark);
      }
    };
    applyTheme();

    if (userPrefs.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  }, [userPrefs.theme, userPrefs.reducedMotion]);

  // Listen to Firebase Auth state and bootstrap authorized partner membership
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setIsAuthorizedMember(false);
        setPermissionReady(false);
        setMemories([]);
        setAlbums([]);
        setMilestones([]);
        setLetters([]);
        setBucketItems([]);
        setMembers([]);
        setAuthLoading(false);
        return;
      }

      const email = (currentUser.email || '').toLowerCase().trim();
      const isAllowedEmail =
        currentUser.emailVerified &&
        (AUTHORIZED_EMAILS as readonly string[]).includes(email);

      if (!isAllowedEmail) {
        setIsAuthorizedMember(false);
        setPermissionReady(false);
        setAuthLoading(false);
        return;
      }

      try {
        setDataLoading(true);
        setDataError(null);
        await bootstrapAuthorizedCoupleMember(
          currentUser.uid,
          email,
          currentUser.displayName
        );
        setIsAuthorizedMember(true);
        setPermissionReady(true);
      } catch (err) {
        console.error('Failed to bootstrap authorized couple member:', err);
        setDataError(
          err instanceof Error
            ? err.message
            : 'Unable to initialize private couple space.'
        );
        setIsAuthorizedMember(true);
        setPermissionReady(true);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Attach real-time Firestore listeners ONLY after auth and member bootstrap are confirmed
  useEffect(() => {
    if (!user || !isAuthorizedMember || !permissionReady) {
      return;
    }

    setDataLoading(true);

    // 1. Couple Space Configuration Listener
    const couplePath = `couples/${COUPLE_SPACE_ID}`;
    const unsubCouple = onSnapshot(
      doc(db, 'couples', COUPLE_SPACE_ID),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as CoupleConfig;
          setCoupleConfig({
            ...DEFAULT_COUPLE_CONFIG,
            ...data,
            logoUrl:
              data.logoUrl && !data.logoUrl.startsWith('/src/assets/')
                ? data.logoUrl
                : DEFAULT_COUPLE_CONFIG.logoUrl,
          });
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, couplePath);
      }
    );

    // 2. User Preferences Listener
    const prefPath = `users/${user.uid}/preferences/default`;
    const unsubPrefs = onSnapshot(
      doc(db, 'users', user.uid, 'preferences', 'default'),
      (snap) => {
        if (snap.exists()) {
          setUserPrefs(snap.data() as UserPreferences);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, prefPath);
      }
    );

    // 3. Members Subcollection Listener
    const membersPath = `couples/${COUPLE_SPACE_ID}/members`;
    const unsubMembers = onSnapshot(
      collection(db, 'couples', COUPLE_SPACE_ID, 'members'),
      (snap) => {
        const list: MemberRecord[] = snap.docs.map(
          (d) => d.data() as MemberRecord
        );
        setMembers(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, membersPath);
      }
    );

    // 4. Memories Subcollection Listener (bounded to 250 items for performance)
    let didInitialSupabaseSync = false;
    const memoriesPath = `couples/${COUPLE_SPACE_ID}/memories`;
    const memoriesQuery = query(
      collection(db, 'couples', COUPLE_SPACE_ID, 'memories'),
      orderBy('memoryDate', 'desc'),
      limit(250)
    );
    const unsubMemories = onSnapshot(
      memoriesQuery,
      (snap) => {
        const list: MemoryItem[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<MemoryItem, 'id'>),
        }));
        setMemories(list);
        setDataLoading(false);

        if (!didInitialSupabaseSync) {
          didInitialSupabaseSync = true;
          syncOrphanedSupabaseMemories(list, (recoveredItems) => {
            if (recoveredItems.length > 0) {
              setMemories((prev) => {
                const existingIds = new Set(prev.map((m) => m.id));
                const merged = [
                  ...prev,
                  ...recoveredItems.filter((r) => !existingIds.has(r.id)),
                ];
                return merged.sort((a, b) =>
                  b.memoryDate.localeCompare(a.memoryDate)
                );
              });
            }
          })
            .then((count) => {
              if (count > 0) {
                addToast(
                  `Synced ${count} ${count === 1 ? 'memory' : 'memories'} from Supabase Storage`,
                  'success'
                );
              }
            })
            .catch((err) => {
              console.warn('Auto Supabase sync skipped:', err);
            });
        }
      },
      (err) => {
        setDataLoading(false);
        // Even if Firestore query errors on external deploy, still load memories directly from Supabase Storage
        syncOrphanedSupabaseMemories([], (recoveredItems) => {
          if (recoveredItems.length > 0) {
            setMemories(recoveredItems);
          }
        }).catch(() => {});
        handleFirestoreError(err, OperationType.LIST, memoriesPath);
      }
    );

    // 5. Custom Albums Subcollection Listener
    const albumsPath = `couples/${COUPLE_SPACE_ID}/albums`;
    const albumsQuery = query(
      collection(db, 'couples', COUPLE_SPACE_ID, 'albums'),
      orderBy('sortOrder', 'asc'),
      limit(100)
    );
    const unsubAlbums = onSnapshot(
      albumsQuery,
      (snap) => {
        const list: CustomAlbum[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CustomAlbum, 'id'>),
        }));
        setAlbums(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, albumsPath);
      }
    );

    // 6. Milestones Subcollection Listener
    const milestonesPath = `couples/${COUPLE_SPACE_ID}/milestones`;
    const milestonesQuery = query(
      collection(db, 'couples', COUPLE_SPACE_ID, 'milestones'),
      orderBy('eventDate', 'asc'),
      limit(150)
    );
    const unsubMilestones = onSnapshot(
      milestonesQuery,
      (snap) => {
        const list: StoryMilestone[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<StoryMilestone, 'id'>),
        }));
        setMilestones(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, milestonesPath);
      }
    );

    // 7. Time Capsule Letters (Envelope Metadata Only — Secret Body is never subscribed to!)
    const lettersPath = `couples/${COUPLE_SPACE_ID}/letters`;
    const lettersQuery = query(
      collection(db, 'couples', COUPLE_SPACE_ID, 'letters'),
      orderBy('unlockDateIso', 'asc'),
      limit(100)
    );
    const unsubLetters = onSnapshot(
      lettersQuery,
      (snap) => {
        const list: TimeCapsuleLetter[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<TimeCapsuleLetter, 'id'>),
        }));
        setLetters(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, lettersPath);
      }
    );

    // 8. Bucket List Items Listener
    const bucketPath = `couples/${COUPLE_SPACE_ID}/bucketItems`;
    const bucketQuery = query(
      collection(db, 'couples', COUPLE_SPACE_ID, 'bucketItems'),
      limit(150)
    );
    const unsubBucket = onSnapshot(
      bucketQuery,
      (snap) => {
        const list: BucketListItem[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<BucketListItem, 'id'>),
        }));
        setBucketItems(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, bucketPath);
      }
    );

    return () => {
      unsubCouple();
      unsubPrefs();
      unsubMembers();
      unsubMemories();
      unsubAlbums();
      unsubMilestones();
      unsubLetters();
      unsubBucket();
    };
  }, [user, isAuthorizedMember, permissionReady, addToast]);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Sign-in could not be completed.';
      addToast('Sign-in failed', 'error', msg);
    }
  };

  const signOutUser = async () => {
    try {
      await firebaseSignOut(auth);
      addToast('Signed out safely', 'info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-out error';
      addToast('Sign-out failed', 'error', msg);
    }
  };

  const syncSupabaseStorage = useCallback(async () => {
    try {
      const count = await syncOrphanedSupabaseMemories(
        memories,
        (recoveredItems) => {
          if (recoveredItems.length > 0) {
            setMemories((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const merged = [
                ...prev,
                ...recoveredItems.filter((r) => !existingIds.has(r.id)),
              ];
              return merged.sort((a, b) =>
                b.memoryDate.localeCompare(a.memoryDate)
              );
            });
          }
        }
      );
      if (count > 0) {
        addToast(
          `Synced ${count} ${count === 1 ? 'memory' : 'memories'} from Supabase Storage`,
          'success'
        );
      } else {
        addToast(
          'All Supabase Storage files are already synced and up to date',
          'info'
        );
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Could not sync Supabase files.';
      addToast('Supabase sync error', 'error', msg);
    }
  }, [memories, addToast]);

  const patchLocalMemory = useCallback(
    (memoryId: string, updates: Partial<MemoryItem>) => {
      setMemories((prev) =>
        prev.map((m) => (m.id === memoryId ? { ...m, ...updates } : m))
      );
    },
    []
  );

  const upsertLocalMemory = useCallback((memory: MemoryItem) => {
    setMemories((prev) => {
      const exists = prev.some((m) => m.id === memory.id);
      const next = exists
        ? prev.map((m) => (m.id === memory.id ? memory : m))
        : [memory, ...prev];
      return next.sort((a, b) => b.memoryDate.localeCompare(a.memoryDate));
    });
  }, []);

  const removeLocalMemory = useCallback((memoryId: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== memoryId));
  }, []);

  const patchLocalCoupleConfig = useCallback(
    (updates: Partial<CoupleConfig>) => {
      setCoupleConfig((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const patchLocalUserPrefs = useCallback(
    (updates: Partial<UserPreferences>) => {
      setUserPrefs((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const upsertLocalAlbum = useCallback((album: CustomAlbum) => {
    setAlbums((prev) => {
      const exists = prev.some((a) => a.id === album.id);
      if (exists) {
        return prev.map((a) => (a.id === album.id ? album : a));
      }
      return [...prev, album].sort((a, b) => a.sortOrder - b.sortOrder);
    });
  }, []);

  const removeLocalAlbum = useCallback((albumId: string) => {
    setAlbums((prev) => prev.filter((a) => a.id !== albumId));
  }, []);

  const upsertLocalMilestone = useCallback((milestone: StoryMilestone) => {
    setMilestones((prev) => {
      const exists = prev.some((m) => m.id === milestone.id);
      const next = exists
        ? prev.map((m) => (m.id === milestone.id ? milestone : m))
        : [...prev, milestone];
      return next.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
    });
  }, []);

  const removeLocalMilestone = useCallback((milestoneId: string) => {
    setMilestones((prev) => prev.filter((m) => m.id !== milestoneId));
  }, []);

  const upsertLocalLetter = useCallback((letter: TimeCapsuleLetter) => {
    setLetters((prev) => {
      const exists = prev.some((l) => l.id === letter.id);
      const next = exists
        ? prev.map((l) => (l.id === letter.id ? letter : l))
        : [...prev, letter];
      return next.sort((a, b) =>
        a.unlockDateIso.localeCompare(b.unlockDateIso)
      );
    });
  }, []);

  const removeLocalLetter = useCallback((letterId: string) => {
    setLetters((prev) => prev.filter((l) => l.id !== letterId));
  }, []);

  const upsertLocalBucketItem = useCallback((item: BucketListItem) => {
    setBucketItems((prev) => {
      const exists = prev.some((b) => b.id === item.id);
      return exists
        ? prev.map((b) => (b.id === item.id ? item : b))
        : [item, ...prev];
    });
  }, []);

  const removeLocalBucketItem = useCallback((itemId: string) => {
    setBucketItems((prev) => prev.filter((b) => b.id !== itemId));
  }, []);

  return (
    <CoupleContext.Provider
      value={{
        user,
        authLoading,
        isAuthorizedMember,
        permissionReady,
        coupleConfig,
        members,
        userPrefs,
        memories,
        albums,
        milestones,
        letters,
        bucketItems,
        dataLoading,
        dataError,
        toasts,
        addToast,
        dismissToast,
        signInWithGoogle,
        signOutUser,
        syncSupabaseStorage,
        patchLocalMemory,
        upsertLocalMemory,
        removeLocalMemory,
        patchLocalCoupleConfig,
        patchLocalUserPrefs,
        upsertLocalAlbum,
        removeLocalAlbum,
        upsertLocalMilestone,
        removeLocalMilestone,
        upsertLocalLetter,
        removeLocalLetter,
        upsertLocalBucketItem,
        removeLocalBucketItem,
      }}
    >
      {children}
    </CoupleContext.Provider>
  );
};

export function useCouple(): CoupleContextValue {
  const ctx = useContext(CoupleContext);
  if (!ctx) {
    throw new Error('useCouple must be used within a CoupleProvider');
  }
  return ctx;
}
