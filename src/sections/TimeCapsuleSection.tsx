import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Mail,
  Plus,
  Edit3,
  Trash2,
  X,
  CheckCircle2,
  Clock,
  Cake,
} from 'lucide-react';
import { useCouple } from '../context/CoupleContext';
import { TimeCapsuleLetter, LetterRecipient } from '../types/models';
import {
  SectionHeader,
  EmptyStatePanel,
  ConfirmDialog,
} from '../components/SharedUI';
import {
  createTimeCapsuleLetter,
  readUnlockedLetterBody,
  markLetterAsRead,
  updateLockedLetter,
  deleteLockedLetter,
} from '../services/coupleDataService';
import { Timestamp } from 'firebase/firestore';
import { getUpcomingBirthdays } from '../utils/dateUtils';
import { PARTNER_PROFILES } from '../config/coupleConfig';

export const TimeCapsuleSection: React.FC = () => {
  const {
    user,
    coupleConfig,
    letters,
    addToast,
    upsertLocalLetter,
    removeLocalLetter,
  } = useCouple();

  const [composeOpen, setComposeOpen] = useState(false);
  const [editingLetter, setEditingLetter] =
    useState<TimeCapsuleLetter | null>(null);
  const [title, setTitle] = useState('');
  const [recipient, setRecipient] =
    useState<LetterRecipient>('Our Future Selves');
  const [occasionNote, setOccasionNote] = useState('');
  const [unlockDateIso, setUnlockDateIso] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  // Reading Unlocked Letter State
  const [openedLetter, setOpenedLetter] =
    useState<TimeCapsuleLetter | null>(null);
  const [openedBody, setOpenedBody] = useState<string>('');
  const [loadingBody, setLoadingBody] = useState<boolean>(false);

  // Delete Confirmation State
  const [letterToDelete, setLetterToDelete] =
    useState<TimeCapsuleLetter | null>(null);

  if (!user) return null;

  const now = new Date();

  const isLetterUnlocked = (letter: TimeCapsuleLetter): boolean => {
    if (
      letter.unlockAt &&
      typeof letter.unlockAt === 'object' &&
      'seconds' in letter.unlockAt
    ) {
      const unlockMs =
        (letter.unlockAt as { seconds: number }).seconds * 1000;
      return now.getTime() >= unlockMs;
    }
    const parsed = new Date(letter.unlockDateIso);
    return !isNaN(parsed.getTime()) && now.getTime() >= parsed.getTime();
  };

  const formatUnlockDateTime = (isoStr: string): string => {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleOpenCompose = (letter?: TimeCapsuleLetter) => {
    if (letter) {
      setEditingLetter(letter);
      setTitle(letter.title);
      setRecipient(letter.recipient);
      setOccasionNote(letter.occasionNote);
      setUnlockDateIso(letter.unlockDateIso);
      setBody('');
    } else {
      setEditingLetter(null);
      setTitle('');
      setRecipient('Our Future Selves');
      setOccasionNote('');
      // Default to 1 month in the future
      const nextMonth = new Date(now.getTime() + 30 * 86400000);
      setUnlockDateIso(nextMonth.toISOString().slice(0, 16));
      setBody('');
    }
    setComposeOpen(true);
  };

  const handleSaveLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !unlockDateIso) {
      addToast('Title and unlock date/time are required', 'error');
      return;
    }
    if (!editingLetter && !body.trim()) {
      addToast('Please write the body of your letter', 'error');
      return;
    }

    setSaving(true);
    try {
      const unlockDateObj = new Date(unlockDateIso);
      const unlockTs = !isNaN(unlockDateObj.getTime())
        ? Timestamp.fromDate(unlockDateObj)
        : Timestamp.now();

      if (editingLetter) {
        await updateLockedLetter(editingLetter.id, {
          title,
          recipient,
          occasionNote,
          unlockDateIso,
          body: body.trim() ? body : undefined,
        });
        upsertLocalLetter({
          ...editingLetter,
          title: title.trim(),
          recipient,
          occasionNote: occasionNote.trim(),
          unlockAt: unlockTs,
          unlockDateIso: unlockDateIso.trim(),
          updatedAt: Timestamp.now(),
        });
        addToast('Updated sealed Time Capsule letter', 'success');
      } else {
        const newId = await createTimeCapsuleLetter({
          title,
          recipient,
          occasionNote,
          unlockDateIso,
          body,
        });
        const partnerProfile =
          PARTNER_PROFILES[(user.email || '').toLowerCase()] || {
            name: user.displayName || 'Partner',
          };
        upsertLocalLetter({
          id: newId,
          title: title.trim(),
          recipient,
          occasionNote: occasionNote.trim(),
          unlockAt: unlockTs,
          unlockDateIso: unlockDateIso.trim(),
          readBy: [],
          createdBy: user.uid,
          creatorName: partnerProfile.name,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        addToast(
          'Sealed letter in Time Capsule',
          'success',
          `Locked in Firestore until ${formatUnlockDateTime(unlockDateIso)}.`
        );
      }
      setComposeOpen(false);
    } catch (err) {
      addToast(
        'Failed to save letter',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReadLetter = async (letter: TimeCapsuleLetter) => {
    setOpenedLetter(letter);
    setOpenedBody('');
    setLoadingBody(true);
    try {
      const secretBody = await readUnlockedLetterBody(letter.id);
      setOpenedBody(secretBody);
      if (!letter.readBy.includes(user.uid)) {
        upsertLocalLetter({
          ...letter,
          readBy: [...letter.readBy, user.uid].slice(0, 5),
        });
      }
      await markLetterAsRead(letter, user.uid);
    } catch (err) {
      setOpenedLetter(null);
      addToast(
        'Letter is still sealed by server clock',
        'error',
        err instanceof Error
          ? err.message
          : 'Firestore Security Rules denied pre-unlock access.'
      );
    } finally {
      setLoadingBody(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!letterToDelete) return;
    setSaving(true);
    try {
      await deleteLockedLetter(letterToDelete.id);
      removeLocalLetter(letterToDelete.id);
      setLetterToDelete(null);
      addToast('Deleted locked letter', 'info');
    } catch (err) {
      addToast(
        'Could not delete letter',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        kicker="Time Capsule · Server-Locked Letters to the Future"
        title="Letters Sealed Until Their Moment Arrives"
        subtitle="Write letters to Kathy, Austin, Both of Us, or Our Future Selves. Letter bodies are stored in a separate protected Firestore subcollection enforced by server-authoritative timestamps—never sent to the browser before unlock."
        actions={
          <button
            type="button"
            onClick={() => handleOpenCompose()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Write &amp; Seal a Letter
          </button>
        }
      />

      {letters.length === 0 ? (
        <EmptyStatePanel
          title="No Time Capsule Letters Sealed Yet"
          description="Write a letter for your first anniversary, a future birthday, or a rainy day. Once sealed, the letter body cannot be read by anyone until the scheduled unlock date and time."
          actionLabel="Write First Letter"
          onAction={() => handleOpenCompose()}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {letters.map((letter) => {
            const unlocked = isLetterUnlocked(letter);
            const isCreator = letter.createdBy === user.uid;
            const isReadByMe = letter.readBy.includes(user.uid);

            return (
              <article
                key={letter.id}
                className={`p-6 rounded-2xl border flex flex-col justify-between space-y-5 transition-colors ${
                  unlocked
                    ? 'bg-[var(--bg-surface)] border-[var(--accent-blue)]'
                    : 'bg-[var(--bg-powder-pink)]/35 border-[var(--border-hairline)]'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold">
                      {unlocked ? (
                        <span className="inline-flex items-center gap-1.5 text-[var(--accent-blue)]">
                          <Unlock className="w-4 h-4" />
                          <span>Unlocked &amp; Ready to Read</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[var(--accent-pink)]">
                          <Lock className="w-4 h-4" />
                          <span>Sealed Time Capsule</span>
                        </span>
                      )}
                    </div>

                    {!unlocked && isCreator && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenCompose(letter)}
                          aria-label={`Edit sealed letter ${letter.title}`}
                          className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setLetterToDelete(letter)}
                          aria-label={`Delete sealed letter ${letter.title}`}
                          className="p-1.5 rounded text-[var(--text-secondary)] hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-[var(--text-muted)]">
                      To: <strong>{letter.recipient}</strong> · Written by{' '}
                      {letter.creatorName || 'Partner'}
                    </p>
                    <h3 className="text-2xl font-serif-editorial font-semibold text-[var(--text-primary)] mt-1">
                      {letter.title}
                    </h3>
                  </div>

                  {letter.occasionNote && (
                    <p className="text-xs text-[var(--text-secondary)] italic">
                      &ldquo;{letter.occasionNote}&rdquo;
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-mono-tabular">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {unlocked ? 'Unlocked:' : 'Unlocks:'}{' '}
                      {formatUnlockDateTime(letter.unlockDateIso)}
                    </span>
                  </div>

                  {unlocked ? (
                    <button
                      type="button"
                      onClick={() => handleReadLetter(letter)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)] cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {isReadByMe ? 'Read Letter Again' : 'Open Letter'}
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">
                      Body hidden until unlock time
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Compose / Edit Letter Modal */}
      {composeOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs overflow-y-auto"
        >
          <form
            onSubmit={handleSaveLetter}
            className="w-full max-w-lg p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-4 my-8"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
              <h3 className="text-xl font-serif-editorial font-semibold">
                {editingLetter
                  ? 'Update Sealed Time Capsule Letter'
                  : 'Write a Time Capsule Letter'}
              </h3>
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                className="p-1 text-[var(--text-muted)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Envelope Title
              </label>
              <input
                type="text"
                required
                maxLength={140}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., For Our First Anniversary, Open When You Miss Me"
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Addressed To
                </label>
                <select
                  value={recipient}
                  onChange={(e) =>
                    setRecipient(e.target.value as LetterRecipient)
                  }
                  className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
                >
                  <option value="Kathy">Kathy (Moly · Ling)</option>
                  <option value="Austin">Austin (Love · Kong)</option>
                  <option value="Both of Us">Both of Us</option>
                  <option value="Our Future Selves">Our Future Selves</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Scheduled Unlock Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={unlockDateIso}
                  onChange={(e) => setUnlockDateIso(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)] font-mono-tabular"
                />
                {(() => {
                  const upcoming = getUpcomingBirthdays(coupleConfig);
                  const nextBday = upcoming[0];
                  return (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-[var(--text-muted)]">Quick presets:</span>
                      {nextBday && (
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date(nextBday.nextBirthdayDate);
                            d.setHours(9, 0, 0, 0);
                            const y = d.getFullYear();
                            const m = String(d.getMonth() + 1).padStart(2, '0');
                            const day = String(d.getDate()).padStart(2, '0');
                            setUnlockDateIso(`${y}-${m}-${day}T09:00`);
                            if (!occasionNote) {
                              setOccasionNote(`To open on ${nextBday.partnerName}'s Birthday 🎂`);
                            }
                          }}
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-[var(--border-hairline)] bg-[var(--paper-pink)] text-[var(--ink)] hover:border-[var(--accent)] cursor-pointer"
                        >
                          <Cake className="w-2.5 h-2.5 text-[var(--accent)]" />
                          <span>{nextBday.partnerName}'s Birthday ({nextBday.formattedBirthday})</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const future = new Date(Date.now() + 180 * 86400000);
                          future.setHours(9, 0, 0, 0);
                          setUnlockDateIso(future.toISOString().slice(0, 16));
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] cursor-pointer"
                      >
                        6 Months
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const future = new Date(Date.now() + 365 * 86400000);
                          future.setHours(9, 0, 0, 0);
                          setUnlockDateIso(future.toISOString().slice(0, 16));
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] cursor-pointer"
                      >
                        1 Year
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Outer Envelope Note (Visible while sealed)
              </label>
              <input
                type="text"
                maxLength={240}
                value={occasionNote}
                onChange={(e) => setOccasionNote(e.target.value)}
                placeholder="A short teaser on the outside of the envelope..."
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                {editingLetter
                  ? 'Replace Letter Body (Leave blank to keep existing sealed text)'
                  : 'Confidential Letter Body (Locked until unlock time)'}
              </label>
              <textarea
                rows={6}
                required={!editingLetter}
                maxLength={15000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Dear future us..."
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)] leading-relaxed"
              />
            </div>

            <p className="text-[11px] text-[var(--text-muted)]">
              Note: Once a letter reaches its unlock time, edits and deletion are
              permanently disabled by Firestore Security Rules so the memory is
              preserved forever.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                className="px-4 py-2 rounded-lg text-xs border border-[var(--border-hairline)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg text-xs font-medium bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)] cursor-pointer"
              >
                {saving ? 'Sealing...' : 'Seal Letter'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Read Unlocked Letter Modal */}
      {openedLetter && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
        >
          <div className="w-full max-w-2xl p-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-6 my-8">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-hairline)] pb-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[var(--accent-blue)]">
                  To: {openedLetter.recipient} · From{' '}
                  {openedLetter.creatorName || 'Partner'}
                </p>
                <h2 className="text-3xl font-serif-editorial font-semibold text-[var(--text-primary)]">
                  {openedLetter.title}
                </h2>
                <p className="text-xs text-[var(--text-muted)] font-mono-tabular">
                  Unlocked on {formatUnlockDateTime(openedLetter.unlockDateIso)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenedLetter(null)}
                className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingBody ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-8 h-8 mx-auto rounded-full border-2 border-[var(--accent-blue)] border-t-transparent animate-spin" />
                <p className="text-xs text-[var(--text-secondary)]">
                  Unsealing letter from Firestore...
                </p>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-[var(--bg-subtle)]/60 border border-[var(--border-hairline)]">
                <p className="text-sm md:text-base text-[var(--text-primary)] whitespace-pre-line leading-relaxed font-serif-editorial text-lg">
                  {openedBody}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-hairline)] text-xs text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Archived in Our Time Capsule</span>
              </span>
              <button
                type="button"
                onClick={() => setOpenedLetter(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-[var(--accent-blue)] text-white cursor-pointer"
              >
                Close Letter
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(letterToDelete)}
        title={`Delete sealed letter "${letterToDelete?.title}"?`}
        description="This will permanently delete your sealed Time Capsule letter before its unlock date."
        confirmLabel="Delete Letter"
        busy={saving}
        onConfirm={handleConfirmDelete}
        onCancel={() => setLetterToDelete(null)}
      />
    </div>
  );
};
