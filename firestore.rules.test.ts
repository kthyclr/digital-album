/**
 * Firestore Security Rules Verification Test Suite
 * Verifies the "Dirty Dozen" adversarial payloads and authorized couple workflows
 * for Moly & Love: Kathy & Austin's Digital Memory Album.
 *
 * Run with Firebase Emulator Suite:
 * npx firebase emulators:exec --only firestore "npx tsx firestore.rules.test.ts"
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  authContext: {
    uid: string | null;
    email?: string;
    email_verified?: boolean;
  };
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED' | 'ALLOWED';
  rationale: string;
}

export const DIRTY_DOZEN_SECURITY_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Read Scrape',
    collectionPath: '/couples/kathy-austin-space/memories/mem_1',
    operation: 'get',
    authContext: { uid: null },
    expectedResult: 'PERMISSION_DENIED',
    rationale: 'Global safety net and isSignedIn() block all unauthenticated reads.'
  },
  {
    id: 2,
    name: 'Unauthorized Email Intrusion',
    collectionPath: '/couples/kathy-austin-space',
    operation: 'get',
    authContext: { uid: 'stranger_1', email: 'stranger@gmail.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
    rationale: 'isAuthorizedCoupleUser() strictly allowlists lauretokathyclaire@gmail.com and austinfeguro@gmail.com.'
  },
  {
    id: 3,
    name: 'Unverified Email Spoof Attack',
    collectionPath: '/couples/kathy-austin-space',
    operation: 'get',
    authContext: { uid: 'spoof_kathy', email: 'lauretokathyclaire@gmail.com', email_verified: false },
    expectedResult: 'PERMISSION_DENIED',
    rationale: 'isSignedIn() requires request.auth.token.email_verified == true.'
  },
  {
    id: 4,
    name: 'Shadow Field Injection on Memory Create',
    collectionPath: '/couples/kathy-austin-space/memories/mem_shadow',
    operation: 'create',
    authContext: { uid: 'uid_kathy', email: 'lauretokathyclaire@gmail.com', email_verified: true },
    payload: { title: 'Test', isAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
    rationale: 'isValidMemory() enforces .keys().hasOnly(...) and rejects undeclared fields.'
  },
  {
    id: 5,
    name: 'Identity Spoofing on Memory Create',
    collectionPath: '/couples/kathy-austin-space/memories/mem_spoof',
    operation: 'create',
    authContext: { uid: 'uid_kathy', email: 'lauretokathyclaire@gmail.com', email_verified: true },
    payload: { createdBy: 'uid_austin' },
    expectedResult: 'PERMISSION_DENIED',
    rationale: 'Memory create rule mandates incoming().createdBy == request.auth.uid.'
  },
  {
    id: 6,
    name: 'Pre-Unlock Time Capsule Body Read',
    collectionPath: '/couples/kathy-austin-space/letters/let_future/secrets/body',
    operation: 'get',
    authContext: { uid: 'uid_austin', email: 'austinfeguro@gmail.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
    rationale: 'LetterSecret get rule enforces server-authoritative request.time >= existing().unlockAt.'
  },
  {
    id: 7,
    name: 'Post-Unlock Letter Tampering',
    collectionPath: '/couples/kathy-austin-space/letters/let_unlocked/secrets/body',
    operation: 'update',
    authContext: { uid: 'uid_kathy', email: 'lauretokathyclaire@gmail.com', email_verified: true },
    payload: { body: 'Modified after unlock' },
    expectedResult: 'PERMISSION_DENIED',
    rationale: 'LetterSecret update rule enforces request.time < existing().unlockAt.'
  },
  {
    id: 8,
    name: 'Cross-Partner Preference Hijack',
    collectionPath: '/users/uid_austin/preferences/default',
    operation: 'get',
    authContext: { uid: 'uid_kathy', email: 'lauretokathyclaire@gmail.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
    rationale: 'UserPreferences rule enforces request.auth.uid == userId.'
  },
  {
    id: 9,
    name: 'Client Timestamp Forgery',
    collectionPath: '/couples/kathy-austin-space/albums/alb_1',
    operation: 'create',
    authContext: { uid: 'uid_kathy', email: 'lauretokathyclaire@gmail.com', email_verified: true },
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
    rationale: 'Temporal integrity rule mandates incoming().createdAt == request.time.'
  },
  {
    id: 10,
    name: 'Immortal Field Mutation on Memory Update',
    collectionPath: '/couples/kathy-austin-space/memories/mem_1',
    operation: 'update',
    authContext: { uid: 'uid_austin', email: 'austinfeguro@gmail.com', email_verified: true },
    payload: { createdBy: 'uid_austin', storagePath: 'hacked/path.jpg' },
    expectedResult: 'PERMISSION_DENIED',
    rationale: 'Immortal fields createdBy, uploadedAt, storagePath, and mediaType cannot be changed.'
  },
  {
    id: 11,
    name: 'Denial-of-Wallet Oversized String',
    collectionPath: '/couples/kathy-austin-space/memories/mem_huge',
    operation: 'create',
    authContext: { uid: 'uid_kathy', email: 'lauretokathyclaire@gmail.com', email_verified: true },
    payload: { caption: 'A'.repeat(2500) },
    expectedResult: 'PERMISSION_DENIED',
    rationale: 'isValidMemory() enforces data.caption.size() <= 2000.'
  },
  {
    id: 12,
    name: 'Arbitrary Couple Namespace Creation',
    collectionPath: '/couples/rogue-space-999',
    operation: 'create',
    authContext: { uid: 'uid_kathy', email: 'lauretokathyclaire@gmail.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
    rationale: 'isCoupleSpace(coupleId) locks the namespace to coupleId == "kathy-austin-space".'
  }
];
