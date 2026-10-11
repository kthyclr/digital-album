# Security Specification (`security_spec.md`)
**Moly & Love: Kathy & Austin's Digital Memory Album**

## 1. Data Invariants & Master Source of Truth

1. **Couple Allowlist Invariant (Master Gate)**:
   - Access to ANY document under `/couples/{coupleId}` or its subcollections requires:
     - `request.auth != null`
     - `request.auth.token.email_verified == true`
     - `request.auth.token.email in ['lauretokathyclaire@gmail.com', 'austinfeguro@gmail.com']`
     - `coupleId == 'kathy-austin-space'`
   - Furthermore, all subcollection reads and writes verify `isValidId(coupleId)` and couple authorization.
2. **Identity & Creator Invariant**:
   - On creation of any `Memory`, `Album`, `Milestone`, `Letter`, `LetterSecret`, or `BucketItem`, `createdBy == request.auth.uid`.
   - During updates, `createdBy` and `createdAt` (or `uploadedAt`) are strictly immutable.
3. **Time Capsule Server-Authoritative Lock Invariant**:
   - Letter envelope metadata resides at `/couples/{coupleId}/letters/{letterId}`.
   - Confidential letter body resides at `/couples/{coupleId}/letters/{letterId}/secrets/{secretId}` (`secretId == 'body'`).
   - Reading (`get`) `/secrets/{secretId}` is strictly denied if `request.time < resource.data.unlockAt`.
   - Updating or deleting a `Letter` or `LetterSecret` is only allowed by the creator (`resource.data.createdBy == request.auth.uid`) AND only BEFORE `request.time < resource.data.unlockAt`. Once unlocked, the letter is permanently archived.
4. **PII & Per-User Preferences Isolation**:
   - `/users/{userId}/preferences/{prefId}` can ONLY be read or written when `request.auth.uid == userId` and `isAuthorizedCoupleUser()`.

## 2. The "Dirty Dozen" Payloads (Designed to Break Identity, Integrity, and State)

1. **Unauthenticated Read Scrape**: `auth = null` attempting `get('/couples/kathy-austin-space/memories/mem_1')` -> `PERMISSION_DENIED`.
2. **Unauthorized Email Intrusion**: Authenticated user with `email: 'stranger@gmail.com', email_verified: true` attempting to read `/couples/kathy-austin-space` -> `PERMISSION_DENIED`.
3. **Unverified Email Spoof Attack**: User with `email: 'lauretokathyclaire@gmail.com', email_verified: false` attempting to read or write `/couples/kathy-austin-space` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection on Memory Create**: Authorized user creating a memory with an extra undeclared field `{"isAdmin": true}` -> Rejected by `.keys().hasOnly(...)` -> `PERMISSION_DENIED`.
5. **Identity Spoofing on Memory Create**: Authorized user Kathy setting `createdBy: 'austin-uid-123'` instead of her own `request.auth.uid` -> `PERMISSION_DENIED`.
6. **Pre-Unlock Time Capsule Body Read**: Authorized partner attempting `get('/couples/kathy-austin-space/letters/let_1/secrets/body')` when `request.time < resource.data.unlockAt` -> `PERMISSION_DENIED`.
7. **Post-Unlock Letter Tampering**: Creator attempting `update` on `/couples/kathy-austin-space/letters/let_1/secrets/body` after `request.time >= resource.data.unlockAt` -> `PERMISSION_DENIED`.
8. **Cross-Partner Preference Hijack**: Partner A (`uid_kathy`) attempting to read or update `/users/uid_austin/preferences/default` -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: Authorized user sending a past or future `createdAt` or `updatedAt` instead of `request.time` -> `PERMISSION_DENIED`.
10. **Immortal Field Mutation**: Authorized user attempting to change `createdBy` or `uploadedAt` during a memory metadata update -> `PERMISSION_DENIED`.
11. **Denial-of-Wallet Oversized String**: Authorized user attempting to write a 50,000-character `caption` (exceeding max 2000 chars) -> `PERMISSION_DENIED`.
12. **Arbitrary Couple Namespace Creation**: Authorized user attempting to create `/couples/rogue-space-999` -> `PERMISSION_DENIED`.
