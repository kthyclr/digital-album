import React, { useState, useMemo } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  Plus,
  Play,
  FolderPlus,
  Trash2,
  X,
  Edit3,
} from 'lucide-react';
import { useCouple } from '../context/CoupleContext';
import { MemoryItem, MediaType, CustomAlbum } from '../types/models';
import {
  SectionHeader,
  MemoryCard,
  EmptyStatePanel,
  ConfirmDialog,
} from '../components/SharedUI';
import { getMonthYearLabel } from '../utils/dateUtils';
import {
  toggleMemoryFavorite,
  createCustomAlbum,
  updateCustomAlbum,
  deleteCustomAlbum,
  updateUserPreferences,
} from '../services/coupleDataService';

type SortOption =
  | 'date-desc'
  | 'date-asc'
  | 'uploaded-desc'
  | 'title-asc'
  | 'type-asc';

export const MemoriesSection: React.FC<{
  onOpenUpload: (defaultAlbumId?: string) => void;
  onOpenMemory: (mem: MemoryItem) => void;
  onOpenSlideshow: (mems: MemoryItem[]) => void;
}> = ({ onOpenUpload, onOpenMemory, onOpenSlideshow }) => {
  const { user, memories, albums, userPrefs, coupleConfig, addToast } =
    useCouple();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>(
    userPrefs.defaultViewMode || 'grid'
  );
  const [showTrash, setShowTrash] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMediaType, setSelectedMediaType] = useState<'all' | MediaType>(
    'all'
  );
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [visibleCount, setVisibleCount] = useState(18);

  // Album Creation / Editing Modal State
  const [albumModalOpen, setAlbumModalOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<CustomAlbum | null>(null);
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumDesc, setAlbumDesc] = useState('');
  const [albumCoverId, setAlbumCoverId] = useState('');
  const [albumToDelete, setAlbumToDelete] = useState<CustomAlbum | null>(null);
  const [savingAlbum, setSavingAlbum] = useState(false);

  if (!user) return null;

  const baseMemories = useMemo(
    () =>
      memories.filter((m) =>
        showTrash ? m.status === 'trashed' : m.status === 'active'
      ),
    [memories, showTrash]
  );

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    baseMemories.forEach((m) => {
      if (m.memoryYear) years.add(m.memoryYear);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [baseMemories]);

  const availableTags = useMemo(() => {
    const tSet = new Set<string>();
    baseMemories.forEach((m) => m.tags?.forEach((t) => tSet.add(t)));
    return Array.from(tSet).sort();
  }, [baseMemories]);

  const filteredAndSortedMemories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = baseMemories.filter((m) => {
      if (selectedMediaType !== 'all' && m.mediaType !== selectedMediaType)
        return false;
      if (
        selectedYear !== 'all' &&
        String(m.memoryYear) !== selectedYear
      )
        return false;
      if (
        selectedMonth !== 'all' &&
        String(m.memoryMonth) !== selectedMonth
      )
        return false;
      if (
        selectedAlbumId !== 'all' &&
        !m.albumIds.includes(selectedAlbumId)
      )
        return false;
      if (selectedTag !== 'all' && !m.tags.includes(selectedTag)) return false;
      if (onlyFavorites && !m.favoritedBy.includes(user.uid)) return false;

      if (q) {
        const hay = `${m.title} ${m.caption} ${m.locationText} ${m.originalFileName} ${m.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return b.memoryDate.localeCompare(a.memoryDate);
      }
      if (sortBy === 'date-asc') {
        return a.memoryDate.localeCompare(b.memoryDate);
      }
      if (sortBy === 'title-asc') {
        return (a.title || a.originalFileName).localeCompare(
          b.title || b.originalFileName
        );
      }
      if (sortBy === 'type-asc') {
        return a.mediaType.localeCompare(b.mediaType);
      }
      // uploaded-desc
      const tA =
        a.uploadedAt &&
        typeof a.uploadedAt === 'object' &&
        'seconds' in a.uploadedAt
          ? (a.uploadedAt as { seconds: number }).seconds
          : 0;
      const tB =
        b.uploadedAt &&
        typeof b.uploadedAt === 'object' &&
        'seconds' in b.uploadedAt
          ? (b.uploadedAt as { seconds: number }).seconds
          : 0;
      return tB - tA;
    });
  }, [
    baseMemories,
    searchQuery,
    selectedMediaType,
    selectedYear,
    selectedMonth,
    selectedAlbumId,
    selectedTag,
    onlyFavorites,
    sortBy,
    user.uid,
  ]);

  const paginatedMemories = filteredAndSortedMemories.slice(0, visibleCount);

  // Group by Month/Year when sorted chronologically
  const groupedByMonthYear = useMemo(() => {
    const groups: { key: string; label: string; items: MemoryItem[] }[] = [];
    for (const mem of paginatedMemories) {
      const key = `${mem.memoryYear}-${String(mem.memoryMonth).padStart(2, '0')}`;
      let existing = groups.find((g) => g.key === key);
      if (!existing) {
        existing = {
          key,
          label: getMonthYearLabel(mem.memoryYear, mem.memoryMonth),
          items: [],
        };
        groups.push(existing);
      }
      existing.items.push(mem);
    }
    return groups;
  }, [paginatedMemories]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedMediaType !== 'all' ||
    selectedYear !== 'all' ||
    selectedMonth !== 'all' ||
    selectedAlbumId !== 'all' ||
    selectedTag !== 'all' ||
    onlyFavorites;

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedMediaType('all');
    setSelectedYear('all');
    setSelectedMonth('all');
    setSelectedAlbumId('all');
    setSelectedTag('all');
    setOnlyFavorites(false);
  };

  const handleChangeViewMode = async (mode: 'grid' | 'list') => {
    setViewMode(mode);
    try {
      await updateUserPreferences(userPrefs, { defaultViewMode: mode });
    } catch {
      // ignore non-critical preference sync error
    }
  };

  const handleOpenAlbumModal = (album?: CustomAlbum) => {
    if (album) {
      setEditingAlbum(album);
      setAlbumTitle(album.title);
      setAlbumDesc(album.description);
      setAlbumCoverId(album.coverMemoryId);
    } else {
      setEditingAlbum(null);
      setAlbumTitle('');
      setAlbumDesc('');
      setAlbumCoverId('');
    }
    setAlbumModalOpen(true);
  };

  const handleSaveAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumTitle.trim()) {
      addToast('Album title is required', 'error');
      return;
    }
    setSavingAlbum(true);
    try {
      if (editingAlbum) {
        await updateCustomAlbum(editingAlbum, {
          title: albumTitle,
          description: albumDesc,
          coverMemoryId: albumCoverId,
        });
        addToast('Updated album', 'success');
      } else {
        const newId = await createCustomAlbum(
          albumTitle,
          albumDesc,
          albumCoverId
        );
        setSelectedAlbumId(newId);
        addToast('Created custom album', 'success');
      }
      setAlbumModalOpen(false);
    } catch (err) {
      addToast(
        'Could not save album',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setSavingAlbum(false);
    }
  };

  const handleConfirmDeleteAlbum = async () => {
    if (!albumToDelete) return;
    setSavingAlbum(true);
    try {
      await deleteCustomAlbum(albumToDelete.id);
      if (selectedAlbumId === albumToDelete.id) {
        setSelectedAlbumId('all');
      }
      setAlbumToDelete(null);
      addToast(
        'Deleted album container',
        'info',
        'All memories inside remain safely preserved in your general library.'
      );
    } catch (err) {
      addToast(
        'Failed to delete album',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setSavingAlbum(false);
    }
  };

  const trashedCount = memories.filter((m) => m.status === 'trashed').length;

  return (
    <div className="space-y-8">
      <SectionHeader
        kicker="Our Memories · Full Media Library"
        title={showTrash ? 'Recently Deleted (Trash)' : 'Our Shared Gallery'}
        subtitle={
          showTrash
            ? `Soft-deleted items are kept here for ${coupleConfig.trashRetentionDays} days before permanent removal.`
            : 'Automatically organized by memory date, year, month, and media type, with custom albums and tags.'
        }
        actions={
          <>
            <button
              type="button"
              onClick={() => handleOpenAlbumModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-powder-blue)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              New Album
            </button>

            {filteredAndSortedMemories.some((m) => m.mediaType === 'photo') && (
              <button
                type="button"
                onClick={() => onOpenSlideshow(filteredAndSortedMemories)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-[var(--bg-powder-pink)] text-[var(--accent-pink)] hover:opacity-90 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                Slideshow
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowTrash((t) => !t)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                showTrash
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {showTrash ? 'Back to Active Library' : `Trash (${trashedCount})`}
            </button>

            <button
              type="button"
              onClick={() =>
                onOpenUpload(
                  selectedAlbumId !== 'all' ? selectedAlbumId : undefined
                )
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Upload Memory
            </button>
          </>
        }
      />

      {/* Custom Albums Strip */}
      {!showTrash && albums.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[var(--text-secondary)]">
              Custom Albums
            </h2>
          </div>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2">
            <button
              type="button"
              onClick={() => setSelectedAlbumId('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                selectedAlbumId === 'all'
                  ? 'bg-[var(--accent-blue)] text-white border-[var(--accent-blue)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              All Memories ({baseMemories.length})
            </button>
            {albums.map((alb) => {
              const count = baseMemories.filter((m) =>
                m.albumIds.includes(alb.id)
              ).length;
              const isSelected = selectedAlbumId === alb.id;
              return (
                <div
                  key={alb.id}
                  className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs transition-colors shrink-0 ${
                    isSelected
                      ? 'bg-[var(--bg-powder-blue)] border-[var(--accent-blue)] text-[var(--text-primary)] font-semibold'
                      : 'bg-[var(--bg-surface)] border-[var(--border-hairline)] text-[var(--text-secondary)]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedAlbumId(isSelected ? 'all' : alb.id)
                    }
                    className="cursor-pointer whitespace-nowrap"
                  >
                    {alb.title} ({count})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenAlbumModal(alb)}
                    aria-label={`Edit album ${alb.title}`}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlbumToDelete(alb)}
                    aria-label={`Delete album ${alb.title}`}
                    className="p-1 text-[var(--text-muted)] hover:text-rose-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search, Filters & Sort Toolbar */}
      <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search titles, captions, places, tags..."
              className="w-full pl-9 pr-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            />
          </div>

          {/* Media Type Segmented Filter */}
          <div className="md:col-span-4 flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
            {(['all', 'photo', 'video', 'audio'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedMediaType(type)}
                className={`flex-1 py-1.5 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedMediaType === type
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {type === 'all'
                  ? 'All Types'
                  : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
              </button>
            ))}
          </div>

          {/* Sort & View Mode */}
          <div className="md:col-span-4 flex items-center justify-end gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort memories by"
              className="flex-1 px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            >
              <option value="date-desc">Newest Memory Date</option>
              <option value="date-asc">Oldest Memory Date</option>
              <option value="uploaded-desc">Recently Uploaded</option>
              <option value="title-asc">Title (A–Z)</option>
              <option value="type-asc">Media Type</option>
            </select>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)] shrink-0">
              <button
                type="button"
                onClick={() => handleChangeViewMode('grid')}
                aria-label="Grid view"
                className={`p-1.5 rounded cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[var(--bg-surface)] text-[var(--accent-blue)] shadow-xs'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleChangeViewMode('list')}
                aria-label="Compact list view"
                className={`p-1.5 rounded cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-[var(--bg-surface)] text-[var(--accent-blue)] shadow-xs'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Filter Row: Year, Month, Tag, Favorites, Clear All */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-hairline)]">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              aria-label="Filter by year"
              className="px-2.5 py-1.5 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            >
              <option value="all">All Years</option>
              {availableYears.map((yr) => (
                <option key={yr} value={String(yr)}>
                  {yr}
                </option>
              ))}
            </select>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="Filter by month"
              className="px-2.5 py-1.5 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            >
              <option value="all">All Months</option>
              {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => (
                <option key={m} value={String(m)}>
                  {new Date(2026, m - 1, 1).toLocaleDateString('en-US', {
                    month: 'long',
                  })}
                </option>
              ))}
            </select>

            {availableTags.length > 0 && (
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                aria-label="Filter by tag"
                className="px-2.5 py-1.5 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              >
                <option value="all">All Tags</option>
                {availableTags.map((t) => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => setOnlyFavorites((f) => !f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                onlyFavorites
                  ? 'bg-[var(--bg-powder-pink)] text-[var(--accent-pink)] border-[var(--accent-pink)]'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-hairline)]'
              }`}
            >
              Favorites Only
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-[var(--text-muted)] font-mono-tabular">
              Showing {paginatedMemories.length} of{' '}
              {filteredAndSortedMemories.length}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-[var(--accent-pink)] font-medium hover:underline cursor-pointer whitespace-nowrap shrink-0"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Gallery Content */}
      {filteredAndSortedMemories.length === 0 ? (
        <EmptyStatePanel
          title={
            hasActiveFilters
              ? 'No Memories Match Your Active Filters'
              : showTrash
                ? 'Trash is Empty'
                : 'No Memories Saved Yet'
          }
          description={
            hasActiveFilters
              ? 'Try clearing one or more filters or broadening your search query.'
              : showTrash
                ? 'Deleted memories will appear here so you can safely restore them if needed.'
                : 'Upload photos, videos, or voice notes to start building your organized collection.'
          }
          actionLabel={
            hasActiveFilters
              ? 'Clear All Filters'
              : showTrash
                ? undefined
                : 'Upload Memory'
          }
          onAction={
            hasActiveFilters
              ? clearAllFilters
              : showTrash
                ? undefined
                : () => onOpenUpload()
          }
        />
      ) : sortBy === 'date-desc' || sortBy === 'date-asc' ? (
        /* Month/Year Chronological Sections */
        <div className="space-y-10">
          {groupedByMonthYear.map((group) => (
            <section key={group.key} className="space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-2">
                <h2 className="text-xl font-serif-editorial font-semibold text-[var(--text-primary)]">
                  {group.label}
                </h2>
                <span className="text-xs text-[var(--text-muted)] font-mono-tabular">
                  {group.items.length}{' '}
                  {group.items.length === 1 ? 'memory' : 'memories'}
                </span>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {group.items.map((mem) => (
                    <MemoryCard
                      key={mem.id}
                      memory={mem}
                      currentUserId={user.uid}
                      viewMode="grid"
                      onOpen={onOpenMemory}
                      onToggleFavorite={(m) =>
                        toggleMemoryFavorite(m, user.uid)
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {group.items.map((mem) => (
                    <MemoryCard
                      key={mem.id}
                      memory={mem}
                      currentUserId={user.uid}
                      viewMode="list"
                      onOpen={onOpenMemory}
                      onToggleFavorite={(m) =>
                        toggleMemoryFavorite(m, user.uid)
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedMemories.map((mem) => (
            <MemoryCard
              key={mem.id}
              memory={mem}
              currentUserId={user.uid}
              viewMode="grid"
              onOpen={onOpenMemory}
              onToggleFavorite={(m) => toggleMemoryFavorite(m, user.uid)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {paginatedMemories.map((mem) => (
            <MemoryCard
              key={mem.id}
              memory={mem}
              currentUserId={user.uid}
              viewMode="list"
              onOpen={onOpenMemory}
              onToggleFavorite={(m) => toggleMemoryFavorite(m, user.uid)}
            />
          ))}
        </div>
      )}

      {/* Incremental Load More Pagination */}
      {filteredAndSortedMemories.length > visibleCount && (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 18)}
            className="px-6 py-2.5 rounded-lg text-xs font-medium border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-powder-blue)] cursor-pointer"
          >
            Load More Memories (
            {filteredAndSortedMemories.length - visibleCount} remaining)
          </button>
        </div>
      )}

      {/* Create / Edit Album Modal */}
      {albumModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <form
            onSubmit={handleSaveAlbum}
            className="w-full max-w-md p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
              <h3 className="text-xl font-serif-editorial font-semibold">
                {editingAlbum ? 'Edit Custom Album' : 'Create Custom Album'}
              </h3>
              <button
                type="button"
                onClick={() => setAlbumModalOpen(false)}
                className="p-1 text-[var(--text-muted)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Album Title
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={albumTitle}
                onChange={(e) => setAlbumTitle(e.target.value)}
                placeholder="e.g., Weekend Getaways, First Anniversary, Cafe Hopping"
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                maxLength={500}
                value={albumDesc}
                onChange={(e) => setAlbumDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Cover Memory (Optional)
              </label>
              <select
                value={albumCoverId}
                onChange={(e) => setAlbumCoverId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
              >
                <option value="">Automatic Cover</option>
                {baseMemories
                  .filter((m) => m.mediaType === 'photo')
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title || m.originalFileName} ({m.memoryDate})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAlbumModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs border border-[var(--border-hairline)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingAlbum}
                className="px-5 py-2 rounded-lg text-xs font-medium bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)] cursor-pointer"
              >
                {savingAlbum ? 'Saving...' : 'Save Album'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Album Confirmation (Clarifying that memories themselves remain safe) */}
      <ConfirmDialog
        open={Boolean(albumToDelete)}
        title={`Delete album "${albumToDelete?.title}"?`}
        description="Deleting this custom album only removes the album grouping. All photos, videos, and audio memories inside will remain safely preserved in your general library."
        confirmLabel="Delete Album Only"
        busy={savingAlbum}
        onConfirm={handleConfirmDeleteAlbum}
        onCancel={() => setAlbumToDelete(null)}
      />
    </div>
  );
};
