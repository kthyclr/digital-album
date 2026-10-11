import React, { useState, useMemo } from 'react';
import {
  Mic,
  ExternalLink,
  Plus,
  Upload,
  Heart,
  X,
} from 'lucide-react';
import { useCouple } from '../context/CoupleContext';
import { MemoryItem } from '../types/models';
import { SectionHeader, EmptyStatePanel } from '../components/SharedUI';
import { formatReadableDate, getTodayIsoString } from '../utils/dateUtils';
import { validateExternalMusicUrl } from '../utils/mediaUtils';
import {
  createExternalSoundtrackMemory,
  toggleMemoryFavorite,
} from '../services/coupleDataService';

export const SoundtrackSection: React.FC<{
  onOpenUploadAudio: () => void;
  onOpenMemory: (mem: MemoryItem) => void;
}> = ({ onOpenUploadAudio, onOpenMemory }) => {
  const { user, memories, addToast } = useCouple();

  const [songModalOpen, setSongModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [memoryDate, setMemoryDate] = useState(getTodayIsoString());
  const [externalUrl, setExternalUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [caption, setCaption] = useState('');
  const [urlError, setUrlError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const soundtrackItems = useMemo(
    () =>
      memories.filter(
        (m) =>
          m.status === 'active' &&
          (m.isSoundtrack || m.mediaType === 'audio')
      ),
    [memories]
  );

  const handleSaveExternalSong = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError('');
    if (!title.trim()) {
      addToast('Song or entry title is required', 'error');
      return;
    }
    const validation = validateExternalMusicUrl(externalUrl);
    if (!validation.valid) {
      setUrlError(validation.error || 'Invalid music link');
      return;
    }

    setSaving(true);
    try {
      await createExternalSoundtrackMemory({
        title,
        caption,
        memoryDate,
        externalSongUrl: externalUrl,
        soundtrackNotes: notes,
        tags: ['soundtrack'],
      });
      setSongModalOpen(false);
      setTitle('');
      setExternalUrl('');
      setNotes('');
      setCaption('');
      addToast('Added to Our Soundtrack', 'success');
    } catch (err) {
      addToast(
        'Failed to save song link',
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
        kicker="Our Soundtrack · Voice Notes & Songs"
        title="Songs & Voice Recordings That Mean Something to Us"
        subtitle="Preserve private voice notes, meaningful recordings, and validated links to songs on legitimate streaming services."
        actions={
          <>
            <button
              type="button"
              onClick={() => setSongModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-powder-pink)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Streaming Song Link
            </button>

            <button
              type="button"
              onClick={onOpenUploadAudio}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Voice Note / Audio
            </button>
          </>
        }
      />

      {soundtrackItems.length === 0 ? (
        <EmptyStatePanel
          title="Our Soundtrack is Waiting for Its First Track"
          description="Upload a voice recording or add a link to a song from Spotify, Apple Music, or YouTube Music with a note about why it reminds us of each other."
          actionLabel="Upload Audio Recording"
          onAction={onOpenUploadAudio}
          secondaryLabel="Add Song Link"
          onSecondaryAction={() => setSongModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {soundtrackItems.map((item) => {
            const isFav = item.favoritedBy.includes(user.uid);
            return (
              <article
                key={item.id}
                className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bg-powder-blue)] text-[var(--accent-blue)] flex items-center justify-center shrink-0">
                        <Mic className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-[var(--text-muted)] font-mono-tabular">
                          {formatReadableDate(item.memoryDate)} · Added by{' '}
                          {item.creatorName || 'Partner'}
                        </p>
                        <button
                          type="button"
                          onClick={() => onOpenMemory(item)}
                          className="text-left cursor-pointer"
                        >
                          <h3 className="text-xl font-serif-editorial font-semibold text-[var(--text-primary)] hover:text-[var(--accent-blue)] truncate">
                            {item.title || item.originalFileName}
                          </h3>
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleMemoryFavorite(item, user.uid)}
                      aria-label={isFav ? 'Unfavorite' : 'Favorite'}
                      className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-pink)] cursor-pointer shrink-0"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isFav
                            ? 'fill-[var(--accent-pink)] text-[var(--accent-pink)]'
                            : ''
                        }`}
                      />
                    </button>
                  </div>

                  {item.soundtrackNotes && (
                    <div className="p-3.5 rounded-xl bg-[var(--bg-powder-pink)]/35 border border-[var(--border-hairline)] text-xs text-[var(--text-primary)] leading-relaxed">
                      <span className="font-semibold text-[var(--accent-pink)]">
                        Why this matters:{' '}
                      </span>
                      {item.soundtrackNotes}
                    </div>
                  )}

                  {item.caption && (
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {item.caption}
                    </p>
                  )}
                </div>

                {/* Native Accessible Audio Player or External Streaming Link */}
                <div className="pt-3 border-t border-[var(--border-hairline)] space-y-3">
                  {item.mediaUrl && (
                    <audio
                      src={item.mediaUrl}
                      controls
                      preload="metadata"
                      className="w-full h-9"
                    >
                      Your browser does not support audio playback.
                    </audio>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {item.externalSongUrl ? (
                      <a
                        href={item.externalSongUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent-blue)] hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open in Music Streaming App
                      </a>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">
                        Private Audio Recording
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => onOpenMemory(item)}
                      className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline cursor-pointer"
                    >
                      Edit Details
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add External Song Link Modal */}
      {songModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <form
            onSubmit={handleSaveExternalSong}
            className="w-full max-w-md p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
              <h3 className="text-xl font-serif-editorial font-semibold">
                Add Song to Our Soundtrack
              </h3>
              <button
                type="button"
                onClick={() => setSongModalOpen(false)}
                className="p-1 text-[var(--text-muted)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Song Title &amp; Artist
              </label>
              <input
                type="text"
                required
                maxLength={160}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Best Part — Daniel Caesar & H.E.R."
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Memory Date
              </label>
              <input
                type="date"
                required
                value={memoryDate}
                onChange={(e) => setMemoryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)] font-mono-tabular"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Streaming Link (Spotify, Apple Music, YouTube Music)
              </label>
              <input
                type="url"
                required
                maxLength={500}
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://open.spotify.com/track/..."
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
              />
              {urlError && (
                <p className="text-xs text-rose-600 mt-1">{urlError}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Why This Song Matters to Us
              </label>
              <textarea
                rows={3}
                maxLength={1000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="The song playing during our late-night drive..."
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSongModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs border border-[var(--border-hairline)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg text-xs font-medium bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)] cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save Song'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
