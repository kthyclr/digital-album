import React, { useEffect, useState } from 'react';
import {
  Camera,
  Film,
  Mic,
  Heart,
  Star,
  Trash2,
  RotateCcw,
  Sparkles,
  Music,
  X,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { MemoryItem, ToastMessage } from '../types/models';
import { formatReadableDate } from '../utils/dateUtils';
import { formatBytes, detectActualMediaType } from '../utils/mediaUtils';

/**
 * Toast Notification Region — Variation 14 Scrapbook Style
 */
export const ToastRegion: React.FC<{
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-3 p-4 rounded-3xl bg-[var(--bg-surface)] border-2 border-[var(--ink)] shadow-[6px_6px_0_var(--ink-faint)] transition-all duration-150"
        >
          {t.type === 'success' && (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          )}
          {t.type === 'error' && (
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          )}
          {(t.type === 'info' || t.type === 'warning') && (
            <Info className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[var(--ink)]">{t.title}</p>
            {t.description && (
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 break-words">
                {t.description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss notification"
            className="text-[var(--text-muted)] hover:text-[var(--ink)] p-1 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

/**
 * Accessible Confirmation Dialog — Variation 14 Scrapbook Style
 */
export const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
  busy = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
    >
      <div className="w-full max-w-md p-8 scrapbook-card space-y-5">
        <div className="space-y-2">
          <h2
            id="confirm-dialog-title"
            className="text-3xl font-gaegu font-bold text-[var(--ink)] leading-tight"
          >
            {title}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {description}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="px-5 py-2.5 rounded-2xl text-xs font-semibold border-2 border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--paper-blue)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-2xl text-xs font-semibold border-2 border-[var(--ink)] text-white transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-[var(--ink)] hover:bg-[var(--accent)]'
            }`}
          >
            {busy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Reusable Page Header — Variation 14 Scrapbook Style
 */
export const SectionHeader: React.FC<{
  kicker?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}> = ({ kicker, title, subtitle, actions }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3.5 sm:gap-4 pb-4 sm:pb-5 border-b-2 border-dashed border-[var(--ink-faint)]">
      <div className="space-y-1.5 sm:space-y-2">
        {kicker && (
          <div className="scrapbook-pill">
            <span>★</span>
            <span className="truncate">{kicker}</span>
          </div>
        )}
        <h1
          className="text-3xl sm:text-4xl md:text-5xl font-gaegu font-bold leading-none text-[var(--ink)]"
          style={{ textWrap: 'balance' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};

/**
 * Reusable Empty State Panel — Variation 14 Scrapbook Style
 */
export const EmptyStatePanel: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
}> = ({
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
}) => {
  return (
    <div className="p-6 sm:p-10 scrapbook-card text-center max-w-2xl mx-auto my-4 sm:my-6 space-y-4 relative">
      <div className="w-11 h-11 mx-auto rounded-2xl bg-[var(--paper-blue)] border-2 border-[var(--ink)] text-[var(--ink)] flex items-center justify-center">
        <Sparkles className="w-5 h-5 text-[var(--accent)]" />
      </div>
      <h3 className="text-3xl sm:text-4xl font-gaegu font-bold text-[var(--ink)] leading-none">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto">
        {description}
      </p>
      {(actionLabel || secondaryLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="scrapbook-btn-primary px-5 sm:px-6 py-2.5 sm:py-3 text-xs cursor-pointer whitespace-nowrap shrink-0"
            >
              {actionLabel}
            </button>
          )}
          {secondaryLabel && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl text-xs font-semibold border-2 border-[var(--ink)] bg-[var(--paper-pink)] text-[var(--ink)] hover:bg-[var(--accent)] hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Media Card Component — Variation 14 Tactile Scrapbook Frame
 * Frames naturally hug the actual length & width of each picture/video with clean padding.
 */
export const MemoryCard: React.FC<{
  memory: MemoryItem;
  currentUserId: string;
  featuredMemoryId?: string;
  viewMode?: 'grid' | 'list';
  onOpen: (memory: MemoryItem) => void;
  onToggleFavorite: (memory: MemoryItem) => void;
  onToggleFeatured?: (memory: MemoryItem) => void;
  onTrashOrRestore?: (memory: MemoryItem) => void;
  onPermanentDelete?: (memory: MemoryItem) => void;
}> = ({
  memory,
  currentUserId,
  featuredMemoryId,
  viewMode = 'grid',
  onOpen,
  onToggleFavorite,
  onToggleFeatured,
  onTrashOrRestore,
  onPermanentDelete,
}) => {
  const isFav = memory.favoritedBy.includes(currentUserId);
  const isFeatured = Boolean(
    featuredMemoryId && featuredMemoryId === memory.id
  );
  const isTrashed = memory.status === 'trashed';
  const displayUrl = memory.thumbnailUrl || memory.mediaUrl;
  const actualMediaType = detectActualMediaType(memory);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [displayUrl]);

  const mediaIcon =
    actualMediaType === 'photo' ? (
      <Camera className="w-3.5 h-3.5 text-[var(--ink)] shrink-0" />
    ) : actualMediaType === 'video' ? (
      <Film className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
    ) : (
      <Mic className="w-3.5 h-3.5 text-[var(--ink)] shrink-0" />
    );

  const mediaLabel =
    actualMediaType === 'photo'
      ? 'Photo'
      : actualMediaType === 'video'
        ? 'Video'
        : memory.externalSongUrl
          ? 'Song Link'
          : 'Audio Note';

  if (viewMode === 'list') {
    return (
      <div className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-[var(--bg-surface)] border-2 border-[var(--ink)] shadow-[5px_5px_0_var(--ink-faint)] transition-transform duration-150 hover:-translate-y-0.5">
        <button
          type="button"
          onClick={() => onOpen(memory)}
          className="flex items-center gap-3.5 flex-1 min-w-0 text-left cursor-pointer"
        >
          <div className="p-1.5 rounded-xl bg-[var(--paper-blue)] shrink-0 flex items-center justify-center border-2 border-[var(--ink)]">
            {actualMediaType === 'photo' && displayUrl && !imgError ? (
              <img
                src={displayUrl}
                alt={memory.altText || memory.title || 'Memory photo'}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="block w-auto h-auto max-w-[64px] max-h-[64px] rounded-lg object-contain"
              />
            ) : actualMediaType === 'video' ? (
              <div className="w-12 h-12 flex items-center justify-center">
                <Film className="w-6 h-6 text-[var(--accent)]" />
              </div>
            ) : actualMediaType === 'audio' ? (
              <div className="w-12 h-12 flex items-center justify-center">
                <Music className="w-6 h-6 text-[var(--ink)]" />
              </div>
            ) : (
              <div className="w-12 h-12 flex items-center justify-center">
                <Camera className="w-6 h-6 text-[var(--text-muted)]" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xl font-gaegu font-bold text-[var(--ink)] truncate leading-none">
              {memory.title || memory.originalFileName || 'Untitled Memory'}
            </p>
            {memory.caption && (
              <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                {memory.caption}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-space-mono text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1">
                {mediaIcon}
                <span>{mediaLabel}</span>
              </span>
              <span aria-hidden="true">·</span>
              <span>{formatReadableDate(memory.memoryDate)}</span>
              {memory.creatorName && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>By {memory.creatorName}</span>
                </>
              )}
              {memory.sizeBytes > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{formatBytes(memory.sizeBytes)}</span>
                </>
              )}
            </div>
          </div>
        </button>

        <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-dashed border-[var(--ink-faint)]">
          {!isTrashed && onToggleFeatured && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFeatured(memory);
              }}
              aria-label={
                isFeatured
                  ? 'Clear Featured Memory on Home'
                  : 'Set as Featured Memory on Home'
              }
              title={
                isFeatured
                  ? 'Clear Featured Memory on Home'
                  : 'Set as Featured Memory on Home'
              }
              className={`p-2 rounded-xl border-2 border-[var(--ink)] transition-transform duration-150 active:scale-95 cursor-pointer ${
                isFeatured
                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-500'
                  : 'bg-[var(--bg-surface)] text-[var(--ink)] hover:bg-amber-50 hover:text-amber-500'
              }`}
            >
              <Star
                className={`w-4 h-4 ${
                  isFeatured ? 'fill-amber-400 text-amber-500' : ''
                }`}
              />
            </button>
          )}

          {!isTrashed && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(memory);
              }}
              aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
              title={isFav ? 'Remove from favorites' : 'Add to favorites'}
              className={`p-2 rounded-xl border-2 border-[var(--ink)] transition-transform duration-150 active:scale-95 cursor-pointer ${
                isFav
                  ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-600'
                  : 'bg-[var(--paper-pink)] text-[var(--ink)] hover:bg-rose-100 hover:text-rose-600'
              }`}
            >
              <Heart
                className={`w-4 h-4 ${
                  isFav ? 'fill-rose-600 text-rose-600' : ''
                }`}
              />
            </button>
          )}

          {onTrashOrRestore && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTrashOrRestore(memory);
              }}
              aria-label={isTrashed ? 'Restore from Trash' : 'Move to Trash'}
              title={isTrashed ? 'Restore from Trash' : 'Move to Trash'}
              className="p-2 rounded-xl border-2 border-[var(--ink)] bg-[var(--bg-surface)] text-[var(--ink)] hover:bg-rose-50 hover:text-rose-600 transition-transform duration-150 active:scale-95 cursor-pointer"
            >
              {isTrashed ? (
                <RotateCcw className="w-4 h-4" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          )}

          {isTrashed && onPermanentDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPermanentDelete(memory);
              }}
              aria-label="Delete Permanently"
              title="Delete Permanently"
              className="p-2 rounded-xl border-2 border-rose-600 bg-rose-600 text-white hover:bg-rose-700 transition-transform duration-150 active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Grid Card View — Scrapbook Polaroid Frame proportional to the picture/video
  return (
    <article className="group flex flex-col scrapbook-card-sm p-3 sm:p-3.5 transition-transform duration-150 hover:-translate-y-0.5 h-fit">
      {/* Media Frame: wraps tightly around the natural dimensions of the photo/video with appropriate padding */}
      <div className="w-full flex justify-center">
        <div className="relative inline-flex items-center justify-center p-2 sm:p-2.5 rounded-2xl bg-[var(--paper-blue)] border-2 border-[var(--ink)] max-w-full">
          <button
            type="button"
            onClick={() => onOpen(memory)}
            className="flex items-center justify-center cursor-pointer text-left focus:outline-none max-w-full"
            aria-label={`Open memory: ${memory.title || 'Untitled'}`}
          >
            {actualMediaType === 'photo' && displayUrl && !imgError ? (
              <img
                src={displayUrl}
                alt={memory.altText || memory.title || 'Memory photo'}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="block w-auto h-auto max-w-full max-h-[320px] sm:max-h-[340px] rounded-xl object-contain transition-transform duration-200 group-hover:scale-[1.01]"
              />
            ) : actualMediaType === 'video' ? (
              displayUrl ? (
                <div className="relative inline-flex items-center justify-center max-w-full">
                  <video
                    src={displayUrl}
                    preload="metadata"
                    muted
                    playsInline
                    className="block w-auto h-auto max-w-full max-h-[320px] sm:max-h-[340px] rounded-xl object-contain bg-black/90"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="px-3 py-1.5 rounded-full bg-black/70 text-white font-space-mono text-[10px] uppercase tracking-wider inline-flex items-center gap-1.5 border border-white/30">
                      <Film className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span>Play Video</span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-56 py-10 px-6 flex flex-col items-center justify-center gap-2 rounded-xl bg-[var(--paper-pink)] text-center">
                  <Film className="w-8 h-8 text-[var(--accent)]" />
                  <span className="text-xs font-space-mono uppercase tracking-wider text-[var(--ink)]">
                    Video Memory · Play
                  </span>
                </div>
              )
            ) : actualMediaType === 'audio' ? (
              <div className="w-56 py-8 px-6 flex flex-col items-center justify-center gap-2 rounded-xl bg-[var(--bg-surface)] border border-dashed border-[var(--ink)] text-center">
                <Mic className="w-7 h-7 text-[var(--ink)]" />
                <span className="text-xs font-space-mono uppercase tracking-wider text-[var(--ink)]">
                  {memory.externalSongUrl
                    ? 'Soundtrack Song · Open'
                    : 'Audio Note · Listen'}
                </span>
              </div>
            ) : (
              <div className="w-44 h-36 flex flex-col items-center justify-center p-3 text-center text-xs text-[var(--text-muted)] space-y-1">
                <Camera className="w-8 h-8 opacity-40" />
                <span className="font-space-mono text-[10px]">Preview unavailable</span>
              </div>
            )}
          </button>

          {/* Top-right action badges */}
          <div className="absolute top-3.5 right-3.5 flex items-center gap-1 z-10">
            {!isTrashed && onToggleFeatured && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFeatured(memory);
                }}
                aria-label={
                  isFeatured
                    ? 'Clear Featured Memory on Home'
                    : 'Set as Featured Memory on Home'
                }
                title={
                  isFeatured
                    ? 'Clear Featured Memory on Home'
                    : 'Set as Featured Memory on Home'
                }
                className={`p-1.5 sm:p-2 rounded-xl border-2 border-[var(--ink)] shadow-xs transition-transform duration-150 active:scale-95 cursor-pointer ${
                  isFeatured
                    ? 'bg-amber-100 dark:bg-amber-950/90 text-amber-500'
                    : 'bg-[var(--bg-surface)]/95 text-[var(--ink)] hover:bg-amber-50 hover:text-amber-500'
                }`}
              >
                <Star
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                    isFeatured ? 'fill-amber-400 text-amber-500' : ''
                  }`}
                />
              </button>
            )}

            {!isTrashed && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(memory);
                }}
                aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                className={`p-1.5 sm:p-2 rounded-xl border-2 border-[var(--ink)] shadow-xs transition-transform duration-150 active:scale-95 cursor-pointer ${
                  isFav
                    ? 'bg-rose-100 dark:bg-rose-950/90 text-rose-600'
                    : 'bg-[var(--bg-surface)]/95 text-[var(--ink)] hover:bg-[var(--paper-pink)] hover:text-rose-600'
                }`}
              >
                <Heart
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                    isFav ? 'fill-rose-600 text-rose-600' : ''
                  }`}
                />
              </button>
            )}

            {onTrashOrRestore && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTrashOrRestore(memory);
                }}
                aria-label={isTrashed ? 'Restore from Trash' : 'Move to Trash'}
                title={isTrashed ? 'Restore from Trash' : 'Move to Trash'}
                className="p-1.5 sm:p-2 rounded-xl border-2 border-[var(--ink)] shadow-xs bg-[var(--bg-surface)]/95 text-[var(--ink)] hover:bg-rose-50 hover:text-rose-600 transition-transform duration-150 active:scale-95 cursor-pointer"
              >
                {isTrashed ? (
                  <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </button>
            )}

            {isTrashed && onPermanentDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPermanentDelete(memory);
                }}
                aria-label="Delete Permanently"
                title="Delete Permanently"
                className="p-1.5 sm:p-2 rounded-xl border-2 border-rose-600 shadow-xs bg-rose-600 text-white hover:bg-rose-700 transition-transform duration-150 active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Caption & Metadata Area */}
      <div className="pt-3 px-1 flex flex-col justify-between space-y-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px] font-space-mono uppercase tracking-wider text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1">
              {mediaIcon}
              <span>{mediaLabel}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>{formatReadableDate(memory.memoryDate)}</span>
            {memory.isLingKong && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[var(--accent)] font-bold">
                  Ling &amp; Kong
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => onOpen(memory)}
            className="block text-left w-full cursor-pointer"
          >
            <h3 className="text-xl sm:text-2xl font-gaegu font-bold text-[var(--ink)] line-clamp-1 leading-tight group-hover:text-[var(--accent)] transition-colors">
              {memory.title || memory.originalFileName || 'Untitled Memory'}
            </h3>
          </button>

          {memory.caption && (
            <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
              {memory.caption}
            </p>
          )}
        </div>

        {memory.tags.length > 0 && (
          <p className="text-[10px] sm:text-[11px] font-space-mono text-[var(--text-muted)] truncate pt-1.5 border-t border-dashed border-[var(--ink-faint)]">
            {memory.tags.join(' · ')}
          </p>
        )}
      </div>
    </article>
  );
};
