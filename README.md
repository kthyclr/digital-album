# Moly & Love: Kathy & Austin's Digital Memory Album

A private, shared digital memory album and relationship sanctuary built for **Kathy & Austin** (*Moly & Love · Ling & Kong*). Designed with a warm editorial **Powdered Blue & Powdered Pink** aesthetic, full dark mode support, responsive mobile-first layouts, and a zero-trust Firebase backend.

---

## 1. Overview & Features

- **Authorized Couple Space Only**: Strictly locked to Kathy (`lauretokathyclaire@gmail.com`) and Austin (`austinfeguro@gmail.com`) via Google Sign-In and enforced at the database level in `firestore.rules` and `storage.rules`.
- **Dynamic Relationship Counter & Countdown**: Automatically calculates elapsed time or pre-start countdown relative to **September 15, 2026** (or any date configured in Settings) without ever displaying negative elapsed time.
- **Full Media Library (`Our Memories`)**:
  - Supports Photos (`JPEG`, `PNG`, `WebP`, `GIF`), Videos (`MP4`, `WebM`), and Audio (`MP3`, `M4A/AAC`, `WAV`, `WebM`).
  - Multi-file drag-and-drop upload queue with per-file progress, cancellation, retry, and automatic capture date detection.
  - Automatic grouping by **Month & Year** derived from the memory date (not upload date), plus custom albums, tags, search, sorting, grid/list views, and soft-delete Trash recovery.
- **Media Viewer & Slideshow**:
  - Accessible lightbox with keyboard navigation (`←`, `→`, `Esc`), photo zoom, native video/audio players, and inline metadata editing without re-uploading files.
  - Configurable slideshow respecting `prefers-reduced-motion`.
- **Our Story Timeline & Calendar**:
  - Chronological relationship timeline combining memories (by memory date) and manual relationship milestones, plus an interactive monthly calendar view.
- **Our Soundtrack**:
  - Dedicated space for private voice notes, audio recordings, and validated external streaming links (Spotify, Apple Music, YouTube Music) with personal notes.
- **Ling & Kong Playful Corner**:
  - Playful collection for inside jokes, silly photos/videos/voice notes, and custom labels (*"Ling being Ling"*, *"Kong being Kong"*, *"Our nonsense"*, *"Things only we understand"*).
- **Time Capsule (Server-Locked Letters to the Future)**:
  - Letters addressed to Kathy, Austin, Both of Us, or Our Future Selves.
  - **True Server-Side Lock**: Envelope metadata is stored in `/couples/{coupleId}/letters/{letterId}`, while the confidential letter body is isolated in `/couples/{coupleId}/letters/{letterId}/secrets/body`. Firestore Security Rules strictly enforce `request.time >= resource.data.unlockAt` before allowing `get` on the secret body.
- **Shared Bucket List**:
  - Track plans across categories (*Places to Go*, *Food to Try*, *Movies to Watch*, *Things to Learn*, *Experiences to Share*) and link completed dreams to memories.
- **Settings, Dark Mode & Backup Export**:
  - Editable relationship copy, endearments, start date, file-size limits, per-user Light/Dark/System theme preferences, and one-click JSON/CSV metadata backup exports.

---

## 2. Tech Stack & Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Vite.
- **Backend**: Firebase Authentication (Google Sign-In), Cloud Firestore (Enterprise edition), Cloud Storage for Firebase.
- **Security**: Attribute-Based Access Control (ABAC) in `firestore.rules` (verified with `@firebase/eslint-plugin-security-rules`) and `storage.rules`.

### Repository Structure
- `/src/lib/firebase.ts` — Centralized Firebase SDK initialization, connection check, and structured error handler.
- `/src/config/coupleConfig.ts` — Centralized relationship constants, allowlisted emails, and supported MIME types.
- `/src/types/models.ts` — Strict TypeScript interfaces matching `firebase-blueprint.json`.
- `/src/services/coupleDataService.ts` — Firestore & Storage CRUD operations, upload lifecycle, and orphan cleanup.
- `/src/context/CoupleContext.tsx` — Authentication gate, member bootstrapping, real-time listeners, and theme management.
- `/src/components/` — Reusable UI (`AuthScreens`, `SharedUI`, `UploadMemoryModal`, `MediaViewerModal`, `SlideshowModal`).
- `/src/sections/` — Primary application views (`HomeSection`, `MemoriesSection`, `StorySection`, `SoundtrackSection`, `LingKongSection`, `TimeCapsuleSection`, `BucketListSection`, `SettingsSection`).
- `/firestore.rules` & `/storage.rules` — Production security rules.
- `/firestore.indexes.json` & `/firebase.json` — Firebase CLI deployment config.
- `/security_spec.md` & `/firestore.rules.test.ts` — Security specification and Dirty Dozen test cases.

---

## 3. Data Model & Relationships

All couple data lives under `/couples/kathy-austin-space`:
- `/couples/{coupleId}` — Shared display name, relationship start date (`2026-09-15`), endearments (`Moly` & `Love`, `Ling` & `Kong`), featured memory ID, and upload limits.
- `/couples/{coupleId}/members/{uid}` — Authorized member records for Kathy and Austin.
- `/couples/{coupleId}/memories/{memoryId}` — Memory metadata referencing `storagePath` in Firebase Storage, `albumIds[]`, `tags[]`, `favoritedBy[]`, `isLingKong`, and `isSoundtrack`.
- `/couples/{coupleId}/albums/{albumId}` — Custom albums. Deleting an album removes only the album record and preserves all memories in the general library.
- `/couples/{coupleId}/milestones/{milestoneId}` — Manual timeline milestones optionally linking `memoryIds[]`.
- `/couples/{coupleId}/letters/{letterId}` — Time Capsule outer envelope metadata (`title`, `recipient`, `occasionNote`, `unlockAt`).
- `/couples/{coupleId}/letters/{letterId}/secrets/body` — Protected Time Capsule letter body unreadable until `request.time >= unlockAt`.
- `/couples/{coupleId}/bucketItems/{itemId}` — Shared bucket list goals optionally linking `linkedMemoryIds[]`.
- `/users/{uid}/preferences/default` — Per-user isolated preferences (`theme`, `defaultViewMode`, `reducedMotion`, `favoriteMemoryIds`) so one partner's theme never overwrites the other's.

---

## 4. Local Setup, Build & Test Commands

### Prerequisites
- Node.js 20+ and npm

### Commands
```bash
# 1. Install dependencies
npm install

# 2. Start local development server (port 3000)
npm run dev

# 3. Run Firestore security rules linter
npx eslint firestore.rules

# 4. Run TypeScript typecheck and production build
npm run build
```

---

## 5. Firebase Setup & Deployment Checklist

1. **Firebase Project & Web Config**:
   - The app is connected via `firebase-applet-config.json` (provisioned for project `gen-lang-client-0002065245` and database `ai-studio-e00db752-70a1-4511-bbf6-d20e1e81be55`).
   - Public Firebase Web config values (`apiKey`, `projectId`, `appId`) only identify the Firebase project to the browser; actual security is enforced by `firestore.rules` and `storage.rules`. Never expose service-account private keys or Admin SDK credentials in client files.
2. **Authentication**:
   - Ensure Google Sign-In is enabled in **Firebase Console → Authentication → Sign-in method**.
   - Add your deployment domain to **Authentication → Settings → Authorized domains**.
3. **Cloud Firestore & Indexes**:
   - Firestore rules in `firestore.rules` have been linted and deployed.
   - To deploy composite indexes via Firebase CLI:
     ```bash
     npx firebase deploy --only firestore:indexes,firestore:rules,storage
     ```
4. **Cloud Storage**:
   - In **Firebase Console → Storage**, ensure Cloud Storage is initialized for your project bucket and deploy `storage.rules`.
   - Note on Quotas & Billing: Firebase Storage and Firestore free-tier quotas depend on your Firebase plan (Spark vs. Blaze). Per-file size limits are configurable in **Settings** (default 50 MB).

---

## 6. Backup Limitations & Recommended Practice

- A cloud website is not a substitute for an offline archive.
- Use **Settings → Export Full Backup (JSON)** and **Export Memories (CSV)** periodically to save local copies of all captions, dates, letters metadata, and milestones, and keep copies of your most important original photos and videos on personal storage.

---

## 7. GitHub Readiness Commands

To push this project to your own private GitHub repository (never embed credentials in URLs):

```bash
git init
git add .
git commit -m "Initial implementation of Moly & Love digital memory album"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-private-repo>.git
git push -u origin main
```
