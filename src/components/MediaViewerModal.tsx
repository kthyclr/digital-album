import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Edit3,
  Trash2,
  ZoomIn,
  ZoomOut,
  Star,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { MemoryItem } from '../types/models';
import { useCouple } from '../context/CoupleContext';
import {
  updateMemoryMetadata,
  toggleMemoryFavorite,
  setMemoryTrashState,
  permanentlyDeleteMemory,
  updateCoupleConfiguration,
} from '../services/coupleDataService';
import { formatReadableDate } from '../utils/dateUtils';
import { formatBytes } from '../utils/mediaUtils';
import {
  DEFAULT_SUGGESTED_TAGS,
  DEFAULT_LING_KONG_LABELS,
} from '../config/coupleConfig';
import { ConfirmDialog } from './SharedUI';

export const MediaViewerModal: React.FC<{
  memory: MemoryItem | null;
  memoriesList: MemoryItem[];
  onClose: () => void;
  onSelectMemory: (mem: MemoryItem) => void;
}> = ({ memory, memoriesList, onClose, onSelectMemory }) => {
  const {
    user,
    coupleConfig,
    albums,
    addToast,
    patchLocalMemory,
    removeLocalMemory,
    patchLocalCoupleConfig,
  } = useCouple();

  const [isEditing, setIsEditing] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmPermanentDelete, setConfirmPermanentDelete] = useState(false);

  // Edit form states
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [memoryDate, setMemoryDate] = useState('');
  const [locationText, setLocationText] = useState('');
  const [altText, setAltText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [albumIds, setAlbumIds] = useState<string[]>([]);
  const [isLingKong, setIsLingKong] = useState(false);
  const [lingKongLabel, setLingKongLabel] = useState('');
  const [isSoundtrack, setIsSoundtrack] = useState(false);
  const [externalSongUrl, setExternalSongUrl] = useState('');
  const [soundtrackNotes, setSoundtrackNotes] = useState('');

  useEffect(() => {
    if (!memory) return;
    setIsEditing(false);
    setZoomed(false);
    setTitle(memory.title);
    setCaption(memory.caption);
    setMemoryDate(memory.memoryDate);
    setLocationText(memory.locationText);
    setAltText(memory.altText);
    setTags(memory.tags || []);
    setAlbumIds(memory.albumIds || []);
    setIsLingKong(memory.isLingKong);
    setLingKongLabel(memory.lingKongLabel || DEFAULT_LING_KONG_LABELS[0]);
    setIsSoundtrack(memory.isSoundtrack);
    setExternalSongUrl(memory.externalSongUrl || '');
    setSoundtrackNotes(memory.soundtrackNotes || '');
  }, [memory?.id]);

  const currentIndex = memory
    ? memoriesList.findIndex((m) => m.id === memory.id)
    : -1;
  const hasPrev = currentIndex > 0;
  const hasNext =
    currentIndex >= 0 && currentIndex < memoriesList.length - 1;

  useEffect(() => {
    if (!memory) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditing) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) {
        onSelectMemory(memoriesList[currentIndex - 1]);
      }
      if (e.key === 'ArrowRight' && hasNext) {
        onSelectMemory(memoriesList[currentIndex + 1]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [memory, isEditing, hasPrev, hasNext, currentIndex, memoriesList, onClose, onSelectMemory]);

  if (!memory || !user) return null;

  const isFav = memory.favoritedBy.includes(user.uid);
  const isFeatured = coupleConfig.featuredMemoryId === memory.id;
  const displayMediaUrl = memory.mediaUrl || memory.thumbnailUrl;

  const handleToggleFav = async () => {
    const nextFavs = isFav
      ? memory.favoritedBy.filter((id) => id !== user.uid)
      : [...memory.favoritedBy, user.uid].slice(0, 5);

    // Instant UI update
    patchLocalMemory(memory.id, { favoritedBy: nextFavs });

    try {
      const nextState = await toggleMemoryFavorite(memory, user.uid);
      addToast(
        nextState ? 'Added to Favorites ❤️' : 'Removed from Favorites',
        'success'
      );
    } catch (err) {
      // Revert on failure
      patchLocalMemory(memory.id, { favoritedBy: memory.favoritedBy });
      addToast(
        'Could not update favorite',
        'error',
        err instanceof Error ? err.message : undefined
      );
    }
  };

  const handleSetFeatured = async () => {
    const nextFeaturedId = isFeatured ? '' : memory.id;
    const prevFeaturedId = coupleConfig.featuredMemoryId;

    // Instant UI update
    patchLocalCoupleConfig({ featuredMemoryId: nextFeaturedId });

    try {
      await updateCoupleConfiguration(coupleConfig, {
        featuredMemoryId: nextFeaturedId,
      });
      addToast(
        isFeatured
          ? 'Cleared Featured Memory'
          : 'Set as Featured Memory on Home ⭐',
        'success'
      );
    } catch (err) {
      patchLocalCoupleConfig({ featuredMemoryId: prevFeaturedId });
      addToast(
        'Failed to update featured memory',
        'error',
        err instanceof Error ? err.message : undefined
      );
    }
  };

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoryDate) {
      addToast('Memory date is required', 'error');
      return;
    }
    setSaving(true);
    const parts = memoryDate.split('-').map((p) => parseInt(p, 10));
    const nextUpdates = {
      title,
      caption,
      memoryDate,
      memoryYear: parts[0] || memory.memoryYear,
      memoryMonth: parts[1] || memory.memoryMonth,
      dateSource: (
        memoryDate !== memory.memoryDate ? 'manual' : memory.dateSource
      ) as MemoryItem['dateSource'],
      locationText,
      altText,
      tags,
      albumIds,
      isLingKong,
      lingKongLabel: isLingKong ? lingKongLabel : '',
      isSoundtrack,
      externalSongUrl,
      soundtrackNotes,
    };

    patchLocalMemory(memory.id, nextUpdates);

    try {
      await updateMemoryMetadata(memory, nextUpdates);
      setIsEditing(false);
      addToast('Memory details updated', 'success');
    } catch (err) {
      addToast(
        'Failed to save changes',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setSaving(false);
    }
  };

  const handleMoveToTrashOrRestore = async () => {
    const moveToTrash = memory.status === 'active';
    const nextStatus = moveToTrash ? 'trashed' : 'active';
    const nextTrashedAt = moveToTrash
      ? new Date().toISOString().slice(0, 40)
      : '';

    // Instant UI update so item immediately leaves active gallery or trash view
    patchLocalMemory(memory.id, {
      status: nextStatus,
      trashedAt: nextTrashedAt,
    });
    onClose();

    try {
      await setMemoryTrashState(memory, moveToTrash);
      addToast(
        moveToTrash ? 'Moved memory to Trash' : 'Restored memory from Trash',
        'info'
      );
    } catch (err) {
      patchLocalMemory(memory.id, {
        status: memory.status,
        trashedAt: memory.trashedAt,
      });
      addToast(
        'Action failed',
        'error',
        err instanceof Error ? err.message : undefined
      );
    }
  };

  const handleConfirmPermanentDelete = async () => {
    setSaving(true);
    try {
      const res = await permanentlyDeleteMemory(memory);
      // Immediately remove from UI state without requiring page refresh
      removeLocalMemory(memory.id);
      setConfirmPermanentDelete(false);
      if (res.warning) {
        addToast('Deleted with Storage warning', 'warning', res.warning);
      } else {
        addToast('Memory permanently deleted', 'info');
      }
      onClose();
    } catch (err) {
      addToast(
        'Failed to delete memory',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleAlbumSelection = (albId: string) => {
    setAlbumIds((prev) =>
      prev.includes(albId)
        ? prev.filter((id) => id !== albId)
        : [...prev, albId].slice(0, 10)
    );
  };

  const toggleTagSelection = (t: string) => {
    setTags((prev) =>
      prev.includes(t) ? prev.filter((item) => item !== t) : [...prev, t].slice(0, 15)
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Memory viewer: ${memory.title || 'Untitled'}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-6 overflow-y-auto"
    >
      <div className="w-full max-w-6xl rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 max-h-[92vh]">
        {/* Left/Top Media Stage */}
        <div className="lg:col-span-7 bg-black/95 relative flex flex-col items-center justify-center min-h-[320px] lg:min-h-[540px] p-4 overflow-hidden">
          {/* Top Viewer Controls */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
            <span className="text-xs text-white/80 font-mono-tabular px-2.5 py-1 rounded bg-black/50">
              {currentIndex >= 0
                ? `${currentIndex + 1} / ${memoriesList.length}`
                : memory.mediaType.toUpperCase()}
            </span>
            <div className="flex items-center gap-2">
              {memory.mediaType === 'photo' && displayMediaUrl && (
                <button
                  type="button"
                  onClick={() => setZoomed((z) => !z)}
                  aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
                  className="p-2 rounded-lg bg-black/60 text-white hover:bg-black/80 cursor-pointer"
                >
                  {zoomed ? (
                    <ZoomOut className="w-4 h-4" />
                  ) : (
                    <ZoomIn className="w-4 h-4" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close media viewer"
                className="p-2 rounded-lg bg-black/60 text-white hover:bg-black/80 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Media Rendering */}
          {memory.mediaType === 'photo' ? (
            displayMediaUrl ? (
              <div className="w-full h-full flex items-center justify-center overflow-auto">
                <img
                  src={displayMediaUrl}
                  alt={memory.altText || memory.title || 'Memory photograph'}
                  referrerPolicy="no-referrer"
                  className={`transition-transform duration-200 ${
                    zoomed
                      ? 'scale-150 cursor-zoom-out'
                      : 'max-h-[75vh] w-auto object-contain cursor-zoom-in'
                  }`}
                  onClick={() => setZoomed((z) => !z)}
                />
              </div>
            ) : (
              <p className="text-xs text-white/70">
                Image preview unavailable.
              </p>
            )
          ) : memory.mediaType === 'video' ? (
            displayMediaUrl ? (
              <video
                src={displayMediaUrl}
                controls
                playsInline
                className="max-h-[75vh] w-full object-contain rounded-lg"
              >
                Your browser does not support playback of this video format.
              </video>
            ) : (
              <p className="text-xs text-white/70">
                Video file unavailable or unsupported.
              </p>
            )
          ) : (
            <div className="w-full max-w-md p-8 rounded-2xl bg-[var(--bg-surface)] text-[var(--text-primary)] space-y-5 text-center">
              <h3 className="text-xl font-serif-editorial font-semibold">
                {memory.title || 'Audio Memory'}
              </h3>
              {displayMediaUrl && (
                <audio
                  src={displayMediaUrl}
                  controls
                  className="w-full"
                >
                  Your browser does not support audio playback.
                </audio>
              )}
              {memory.externalSongUrl && (
                <div className="pt-2">
                  <a
                    href={memory.externalSongUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Listen on Streaming Service
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Previous / Next Navigation */}
          {hasPrev && (
            <button
              type="button"
              onClick={() => onSelectMemory(memoriesList[currentIndex - 1])}
              aria-label="Previous memory"
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/80 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {hasNext && (
            <button
              type="button"
              onClick={() => onSelectMemory(memoriesList[currentIndex + 1])}
              aria-label="Next memory"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/80 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Right/Bottom Metadata & Edit Drawer */}
        <div className="lg:col-span-5 flex flex-col justify-between p-6 overflow-y-auto max-h-[85vh]">
          {!isEditing ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4 border-b border-[var(--border-hairline)] pb-4">
                <div className="space-y-1">
                  <p className="text-xs text-[var(--text-muted)] font-mono-tabular">
                    {formatReadableDate(memory.memoryDate)}
                    {memory.locationText ? ` · ${memory.locationText}` : ''}
                  </p>
                  <h2 className="text-2xl font-serif-editorial font-semibold text-[var(--text-primary)]">
                    {memory.title || memory.originalFileName || 'Untitled Memory'}
                  </h2>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleToggleFav}
                    aria-label={isFav ? 'Unfavorite' : 'Favorite'}
                    title={isFav ? 'Remove from Favorites' : 'Add to Favorites'}
                    className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                      isFav
                        ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-600'
                        : 'border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-rose-600 hover:border-rose-400'
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 transition-transform active:scale-125 ${
                        isFav
                          ? 'fill-rose-600 text-rose-600'
                          : ''
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={handleSetFeatured}
                    title={
                      isFeatured
                        ? 'Clear Featured Memory on Home'
                        : 'Set as Featured Memory on Home'
                    }
                    className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                      isFeatured
                        ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-500'
                        : 'border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-amber-500 hover:border-amber-400'
                    }`}
                  >
                    <Star
                      className={`w-4 h-4 transition-transform active:scale-125 ${
                        isFeatured ? 'fill-amber-400 text-amber-500' : ''
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    aria-label="Edit memory details"
                    title="Edit memory details"
                    className="p-2 rounded-lg border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {memory.caption ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[var(--text-muted)]">
                    Story &amp; Caption
                  </p>
                  <p className="text-sm text-[var(--text-primary)] whitespace-pre-line leading-relaxed">
                    {memory.caption}
                  </p>
                </div>
              ) : (
                <p className="text-xs italic text-[var(--text-muted)]">
                  No caption added yet. Click the edit icon to write the story
                  behind this moment.
                </p>
              )}

              {memory.soundtrackNotes && (
                <div className="p-4 rounded-xl bg-[var(--bg-powder-blue)]/50 border border-[var(--border-hairline)] space-y-1">
                  <p className="text-xs font-semibold text-[var(--accent-blue)]">
                    Our Soundtrack Note
                  </p>
                  <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                    {memory.soundtrackNotes}
                  </p>
                </div>
              )}

              {memory.isLingKong && (
                <div className="p-4 rounded-xl bg-[var(--bg-powder-pink)]/50 border border-[var(--border-hairline)] space-y-1">
                  <p className="text-xs font-semibold text-[var(--accent-pink)]">
                    Ling &amp; Kong Collection
                  </p>
                  <p className="text-xs text-[var(--text-primary)]">
                    {memory.lingKongLabel || 'Inside joke & playful moment'}
                  </p>
                </div>
              )}

              {/* Tags & Albums Metadata */}
              <div className="space-y-3 pt-2 border-t border-[var(--border-hairline)] text-xs">
                <div>
                  <span className="text-[var(--text-muted)]">Tags: </span>
                  <span className="text-[var(--text-primary)]">
                    {memory.tags.length > 0
                      ? memory.tags.join(' · ')
                      : 'None assigned'}
                  </span>
                </div>

                <div>
                  <span className="text-[var(--text-muted)]">Albums: </span>
                  <span className="text-[var(--text-primary)]">
                    {memory.albumIds.length > 0
                      ? memory.albumIds
                          .map(
                            (id) =>
                              albums.find((a) => a.id === id)?.title || 'Album'
                          )
                          .join(' · ')
                      : 'General Library'}
                  </span>
                </div>

                <div className="text-[var(--text-muted)] space-y-1 pt-2 border-t border-[var(--border-hairline)] font-mono-tabular text-[11px]">
                  <p>Added by: {memory.creatorName || 'Partner'}</p>
                  <p>
                    Original File: {memory.originalFileName} (
                    {formatBytes(memory.sizeBytes)})
                  </p>
                  <p>MIME Type: {memory.contentType}</p>
                  <p>Date Source: {memory.dateSource}</p>
                </div>
              </div>
            </div>
          ) : (
            /* Edit Metadata Form */
            <form onSubmit={handleSaveMetadata} className="space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
                <h3 className="text-lg font-serif-editorial font-semibold">
                  Edit Memory Metadata
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-[var(--text-secondary)] hover:underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Title
                </label>
                <input
                  type="text"
                  maxLength={160}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    Location
                  </label>
                  <input
                    type="text"
                    maxLength={160}
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Caption / Story
                </label>
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Accessible Alt Description
                </label>
                <input
                  type="text"
                  maxLength={300}
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
                />
              </div>

              {/* Assign Albums */}
              {albums.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Custom Albums
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {albums.map((alb) => {
                      const active = albumIds.includes(alb.id);
                      return (
                        <button
                          key={alb.id}
                          type="button"
                          onClick={() => toggleAlbumSelection(alb.id)}
                          className={`px-2.5 py-1 rounded text-xs cursor-pointer ${
                            active
                              ? 'bg-[var(--accent-blue)] text-white'
                              : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-hairline)]'
                          }`}
                        >
                          {alb.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tags */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Tags
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {Array.from(new Set([...DEFAULT_SUGGESTED_TAGS, ...tags])).map(
                    (t) => {
                      const active = tags.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleTagSelection(t)}
                          className={`px-2 py-1 rounded text-xs cursor-pointer ${
                            active
                              ? 'bg-[var(--accent-blue)] text-white'
                              : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-hairline)]'
                          }`}
                        >
                          {t}
                        </button>
                      );
                    }
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={50}
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    placeholder="New tag..."
                    className="flex-1 px-2.5 py-1 rounded text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const c = customTag.trim().toLowerCase();
                      if (c && !tags.includes(c)) {
                        setTags([...tags, c].slice(0, 15));
                      }
                      setCustomTag('');
                    }}
                    className="px-3 py-1 rounded text-xs border border-[var(--border-hairline)] cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Ling & Kong and Soundtrack checkboxes */}
              <div className="flex flex-wrap gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLingKong}
                    onChange={(e) => setIsLingKong(e.target.checked)}
                  />
                  <span>Ling &amp; Kong Collection</span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSoundtrack}
                    onChange={(e) => setIsSoundtrack(e.target.checked)}
                  />
                  <span>Our Soundtrack</span>
                </label>
              </div>

              {isLingKong && (
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">
                    Ling &amp; Kong Label
                  </label>
                  <input
                    type="text"
                    maxLength={80}
                    value={lingKongLabel}
                    onChange={(e) => setLingKongLabel(e.target.value)}
                    className="w-full px-3 py-1.5 rounded text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
                  />
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg text-xs font-medium bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)] cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* Bottom Trash / Delete Controls */}
          <div className="pt-4 mt-6 border-t border-[var(--border-hairline)] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleMoveToTrashOrRestore}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              {memory.status === 'active' ? (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  Move to Trash
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restore from Trash
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setConfirmPermanentDelete(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-500/10 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Permanently
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmPermanentDelete}
        title={`Permanently delete "${memory.title || memory.originalFileName}"?`}
        description="This will permanently remove both the Firestore metadata and the media file from Supabase Storage. This action cannot be undone."
        confirmLabel="Delete Permanently"
        busy={saving}
        onConfirm={handleConfirmPermanentDelete}
        onCancel={() => setConfirmPermanentDelete(false)}
      />
    </div>
  );
};
