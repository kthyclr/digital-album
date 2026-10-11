import React, { useState, useRef } from 'react';
import {
  Upload,
  X,
  FileImage,
  FileVideo,
  FileAudio,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { UploadTask } from 'firebase/storage';
import { useCouple } from '../context/CoupleContext';
import {
  DEFAULT_SUGGESTED_TAGS,
  DEFAULT_LING_KONG_LABELS,
} from '../config/coupleConfig';
import {
  validateMediaFile,
  detectFileCaptureDate,
  formatBytes,
} from '../utils/mediaUtils';
import { uploadAndCreateMemory } from '../services/coupleDataService';
import { DateSource, MediaType } from '../types/models';
import { getTodayIsoString } from '../utils/dateUtils';

interface QueuedUploadItem {
  id: string;
  file: File;
  previewUrl: string;
  mediaType: MediaType;
  title: string;
  caption: string;
  memoryDate: string;
  dateSource: DateSource;
  dateNotice: string;
  status: 'queued' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  error?: string;
  uploadTask?: UploadTask;
}

export const UploadMemoryModal: React.FC<{
  open: boolean;
  onClose: () => void;
  defaultAlbumId?: string;
  defaultIsLingKong?: boolean;
  defaultIsSoundtrack?: boolean;
}> = ({
  open,
  onClose,
  defaultAlbumId = '',
  defaultIsLingKong = false,
  defaultIsSoundtrack = false,
}) => {
  const { coupleConfig, albums, addToast } = useCouple();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [queue, setQueue] = useState<QueuedUploadItem[]>([]);
  const [sharedCaption, setSharedCaption] = useState('');
  const [sharedLocation, setSharedLocation] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [selectedAlbumId, setSelectedAlbumId] = useState(defaultAlbumId);
  const [isLingKong, setIsLingKong] = useState(defaultIsLingKong);
  const [lingKongLabel, setLingKongLabel] = useState(DEFAULT_LING_KONG_LABELS[0]);
  const [isSoundtrack, setIsSoundtrack] = useState(defaultIsSoundtrack);
  const [soundtrackNotes, setSoundtrackNotes] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isUploadingBatch, setIsUploadingBatch] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  if (!open) return null;

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const incomingFiles = Array.from(fileList);

    const newItems: QueuedUploadItem[] = [];

    for (const file of incomingFiles) {
      const validation = validateMediaFile(file, coupleConfig.maxFileSizeMB);
      const detected = detectFileCaptureDate(file);
      const cleanDefaultTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
      const previewUrl = file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : '';

      if (!validation.valid || !validation.mediaType) {
        newItems.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          previewUrl,
          mediaType: 'photo',
          title: cleanDefaultTitle,
          caption: '',
          memoryDate: detected.isoDate,
          dateSource: detected.source,
          dateNotice: detected.notice,
          status: 'failed',
          progress: 0,
          error: validation.error || 'Unsupported file.',
        });
      } else {
        newItems.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          previewUrl,
          mediaType: validation.mediaType,
          title: cleanDefaultTitle,
          caption: '',
          memoryDate: detected.isoDate,
          dateSource: detected.source,
          dateNotice: detected.notice,
          status: 'queued',
          progress: 0,
        });
      }
    }

    setQueue((prev) => [...prev, ...newItems]);
  };

  const updateQueueItem = (
    id: string,
    updates: Partial<QueuedUploadItem>
  ) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const removeQueueItem = (id: string) => {
    setQueue((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      if (target?.status === 'uploading' && target.uploadTask) {
        target.uploadTask.cancel();
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag].slice(0, 15)
    );
  };

  const handleAddCustomTag = () => {
    const clean = customTagInput.trim().toLowerCase();
    if (!clean) return;
    if (!selectedTags.includes(clean)) {
      setSelectedTags((prev) => [...prev, clean].slice(0, 15));
    }
    setCustomTagInput('');
  };

  const runUploadForSingleItem = async (item: QueuedUploadItem) => {
    updateQueueItem(item.id, {
      status: 'uploading',
      progress: 5,
      error: undefined,
    });

    try {
      await uploadAndCreateMemory({
        file: item.file,
        mediaType: item.mediaType,
        title: item.title || item.file.name,
        caption: item.caption || sharedCaption,
        memoryDate: item.memoryDate || getTodayIsoString(),
        dateSource: item.dateSource,
        locationText: sharedLocation,
        altText: item.title || item.file.name,
        tags: selectedTags,
        albumIds: selectedAlbumId ? [selectedAlbumId] : [],
        isLingKong,
        lingKongLabel: isLingKong ? lingKongLabel : '',
        isSoundtrack: isSoundtrack || item.mediaType === 'audio',
        externalSongUrl: '',
        soundtrackNotes: soundtrackNotes,
        isFavorite,
        onProgress: (pct) => {
          updateQueueItem(item.id, { progress: pct });
        },
        onTaskCreated: (task) => {
          updateQueueItem(item.id, { uploadTask: task });
        },
      });

      updateQueueItem(item.id, {
        status: 'completed',
        progress: 100,
        uploadTask: undefined,
      });
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Upload failed unexpectedly.';
      updateQueueItem(item.id, {
        status: message.includes('cancelled') ? 'cancelled' : 'failed',
        error: message,
        uploadTask: undefined,
      });
      return false;
    }
  };

  const handleUploadAllQueued = async () => {
    const eligible = queue.filter((i) => i.status === 'queued');
    if (eligible.length === 0) return;

    setIsUploadingBatch(true);
    let successCount = 0;
    let failCount = 0;

    for (const item of eligible) {
      const ok = await runUploadForSingleItem(item);
      if (ok) successCount++;
      else failCount++;
    }

    setIsUploadingBatch(false);

    if (successCount > 0 && failCount === 0) {
      addToast(
        `Saved ${successCount} ${successCount === 1 ? 'memory' : 'memories'}`,
        'success',
        'Uploaded and verified in your shared gallery.'
      );
    } else if (successCount > 0 && failCount > 0) {
      addToast(
        `Uploaded ${successCount}, ${failCount} failed`,
        'warning',
        'You can retry failed items individually without re-uploading completed ones.'
      );
    } else if (failCount > 0) {
      addToast(
        'Upload failed',
        'error',
        'Please check the error details in the queue and retry.'
      );
    }
  };

  const handleCloseModal = () => {
    const activeUploads = queue.filter((i) => i.status === 'uploading');
    if (activeUploads.length > 0) {
      // Cancel active uploads on close
      activeUploads.forEach((item) => item.uploadTask?.cancel());
      addToast(
        'In-progress uploads cancelled',
        'info',
        'Closed upload dialog and stopped active transfers.'
      );
    }
    queue.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setQueue([]);
    onClose();
  };

  const queuedCount = queue.filter((i) => i.status === 'queued').length;
  const completedCount = queue.filter((i) => i.status === 'completed').length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs overflow-y-auto"
    >
      <div className="w-full max-w-3xl my-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-hairline)] flex items-center justify-between">
          <div>
            <h2
              id="upload-modal-title"
              className="text-2xl font-serif-editorial font-semibold text-[var(--text-primary)]"
            >
              Add to Our Memories
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Supported: JPEG, PNG, WebP, MP4, WebM, MP3, M4A/AAC, WAV · Max{' '}
              {coupleConfig.maxFileSizeMB} MB per file
            </p>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            aria-label="Close upload modal"
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFilesSelected(e.dataTransfer.files);
            }}
            className={`p-8 rounded-xl border-2 border-dashed transition-colors text-center space-y-3 ${
              isDragging
                ? 'border-[var(--accent-blue)] bg-[var(--bg-powder-blue)]/40'
                : 'border-[var(--border-strong)] bg-[var(--bg-subtle)]/60'
            }`}
          >
            <div className="w-10 h-10 mx-auto rounded-xl bg-[var(--bg-powder-blue)] text-[var(--accent-blue)] flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Drag and drop photos, videos, or voice notes here
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Original files are preserved without silent compression.
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,audio/mpeg,audio/mp3,audio/mp4,audio/aac,audio/wav,audio/webm"
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Choose Files from Device
              </button>
            </div>
          </div>

          {/* Shared Batch Metadata Controls */}
          {queue.length > 0 && (
            <div className="p-5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)] space-y-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Shared Details for This Batch
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Custom Album (Optional)
                  </label>
                  <select
                    value={selectedAlbumId}
                    onChange={(e) => setSelectedAlbumId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
                  >
                    <option value="">General Library (No specific album)</option>
                    {albums.map((alb) => (
                      <option key={alb.id} value={alb.id}>
                        {alb.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Location / Place (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={160}
                    value={sharedLocation}
                    onChange={(e) => setSharedLocation(e.target.value)}
                    placeholder="e.g., Sunset café, Manila, Our living room"
                    className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Shared Caption / Story Note (Optional, can also customize per file below)
                </label>
                <textarea
                  rows={2}
                  maxLength={2000}
                  value={sharedCaption}
                  onChange={(e) => setSharedCaption(e.target.value)}
                  placeholder="Write the story behind these moments..."
                  className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Tags
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_SUGGESTED_TAGS.map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-[var(--accent-blue)] text-white'
                            : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-hairline)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    maxLength={50}
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTag();
                      }
                    }}
                    placeholder="Add custom tag..."
                    className="px-3 py-1.5 rounded-lg text-xs bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTag}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-powder-blue)] cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Add Tag
                  </button>
                </div>
              </div>

              {/* Special Collections Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[var(--border-hairline)]">
                <label className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFavorite}
                    onChange={(e) => setIsFavorite(e.target.checked)}
                    className="rounded border-[var(--border-strong)]"
                  />
                  <span>Mark as Favorite</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLingKong}
                    onChange={(e) => setIsLingKong(e.target.checked)}
                    className="rounded border-[var(--border-strong)]"
                  />
                  <span>Include in Ling &amp; Kong</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSoundtrack}
                    onChange={(e) => setIsSoundtrack(e.target.checked)}
                    className="rounded border-[var(--border-strong)]"
                  />
                  <span>Feature in Our Soundtrack</span>
                </label>
              </div>

              {isLingKong && (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Ling &amp; Kong Funny Label
                  </label>
                  <select
                    value={lingKongLabel}
                    onChange={(e) => setLingKongLabel(e.target.value)}
                    className="w-full sm:w-64 px-3 py-1.5 rounded-lg text-xs bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
                  >
                    {DEFAULT_LING_KONG_LABELS.map((lbl) => (
                      <option key={lbl} value={lbl}>
                        {lbl}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {isSoundtrack && (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Why this recording/audio matters (Soundtrack Notes)
                  </label>
                  <input
                    type="text"
                    maxLength={1000}
                    value={soundtrackNotes}
                    onChange={(e) => setSoundtrackNotes(e.target.value)}
                    placeholder="e.g., Voice note recorded after our late-night call..."
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
                  />
                </div>
              )}
            </div>
          )}

          {/* File Queue List */}
          {queue.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Selected Files ({queue.length})
                </h3>
                <span className="text-xs text-[var(--text-muted)]">
                  {completedCount} completed · {queuedCount} ready
                </span>
              </div>

              <div className="space-y-3">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)] overflow-hidden shrink-0 flex items-center justify-center">
                          {item.previewUrl ? (
                            <img
                              src={item.previewUrl}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : item.mediaType === 'video' ? (
                            <FileVideo className="w-5 h-5 text-[var(--accent-pink)]" />
                          ) : item.mediaType === 'audio' ? (
                            <FileAudio className="w-5 h-5 text-[var(--accent-blue)]" />
                          ) : (
                            <FileImage className="w-5 h-5 text-[var(--accent-blue)]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                            {item.file.name}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] font-mono-tabular">
                            {item.mediaType.toUpperCase()} ·{' '}
                            {formatBytes(item.file.size)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                            Saved
                          </span>
                        )}
                        {item.status === 'failed' && (
                          <button
                            type="button"
                            onClick={() => runUploadForSingleItem(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-[var(--bg-powder-pink)] text-[var(--accent-pink)] hover:opacity-90 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Retry
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeQueueItem(item.id)}
                          aria-label={`Remove ${item.file.name}`}
                          className="p-1.5 rounded text-[var(--text-muted)] hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Per-file editable metadata */}
                    {item.status !== 'completed' && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[var(--border-hairline)]">
                        <div>
                          <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                            Title
                          </label>
                          <input
                            type="text"
                            maxLength={160}
                            value={item.title}
                            onChange={(e) =>
                              updateQueueItem(item.id, { title: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                            Memory Date (When it happened)
                          </label>
                          <input
                            type="date"
                            value={item.memoryDate}
                            onChange={(e) =>
                              updateQueueItem(item.id, {
                                memoryDate: e.target.value,
                                dateSource: 'manual',
                                dateNotice: 'Manually set by you.',
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                            Individual Caption Override
                          </label>
                          <input
                            type="text"
                            maxLength={2000}
                            value={item.caption}
                            onChange={(e) =>
                              updateQueueItem(item.id, {
                                caption: e.target.value,
                              })
                            }
                            placeholder="Uses shared caption if blank"
                            className="w-full px-2.5 py-1.5 rounded text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
                          />
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-[var(--text-muted)]">
                      {item.dateNotice}
                    </p>

                    {/* Progress bar */}
                    {(item.status === 'uploading' ||
                      item.status === 'completed') && (
                      <div className="w-full h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                        <div
                          className="h-full bg-[var(--accent-blue)] transition-all duration-150"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}

                    {/* Error feedback */}
                    {item.error && (
                      <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 px-3 py-2 rounded-lg">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{item.error}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)]/50 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-muted)]">
            Closing this dialog cancels any in-progress uploads; completed items remain saved.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 rounded-lg text-xs font-medium border border-[var(--border-hairline)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)] cursor-pointer whitespace-nowrap shrink-0"
            >
              {completedCount > 0 && queuedCount === 0 ? 'Done' : 'Close'}
            </button>
            {queuedCount > 0 && (
              <button
                type="button"
                disabled={isUploadingBatch}
                onClick={handleUploadAllQueued}
                className="px-5 py-2 rounded-lg text-xs font-medium bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)] disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {isUploadingBatch
                  ? 'Uploading to Private Space...'
                  : `Upload ${queuedCount} ${queuedCount === 1 ? 'File' : 'Files'}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
