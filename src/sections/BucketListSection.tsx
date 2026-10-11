import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Edit3,
  Trash2,
  X,
} from 'lucide-react';
import { useCouple } from '../context/CoupleContext';
import {
  BucketListItem,
  BucketStatus,
  BucketPriority,
  MemoryItem,
} from '../types/models';
import {
  SectionHeader,
  EmptyStatePanel,
  ConfirmDialog,
} from '../components/SharedUI';
import { DEFAULT_BUCKET_CATEGORIES } from '../config/coupleConfig';
import { formatReadableDate } from '../utils/dateUtils';
import {
  createBucketListItem,
  updateBucketListItem,
  deleteBucketListItem,
} from '../services/coupleDataService';

export const BucketListSection: React.FC<{
  onOpenMemory: (mem: MemoryItem) => void;
}> = ({ onOpenMemory }) => {
  const {
    user,
    bucketItems,
    memories,
    addToast,
    upsertLocalBucketItem,
    removeLocalBucketItem,
  } = useCouple();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | BucketStatus>(
    'all'
  );

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BucketListItem | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(DEFAULT_BUCKET_CATEGORIES[0]);
  const [priority, setPriority] = useState<BucketPriority>('soon');
  const [targetDate, setTargetDate] = useState('');
  const [linkedMemoryIds, setLinkedMemoryIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<BucketListItem | null>(null);

  const activeMemories = useMemo(
    () => memories.filter((m) => m.status === 'active'),
    [memories]
  );

  const categoriesList = useMemo(() => {
    const set = new Set<string>(DEFAULT_BUCKET_CATEGORIES);
    bucketItems.forEach((b) => {
      if (b.category) set.add(b.category);
    });
    return Array.from(set);
  }, [bucketItems]);

  const filteredItems = useMemo(() => {
    return bucketItems.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory)
        return false;
      if (selectedStatus !== 'all' && item.status !== selectedStatus)
        return false;
      return true;
    });
  }, [bucketItems, selectedCategory, selectedStatus]);

  const completedCount = bucketItems.filter(
    (b) => b.status === 'completed'
  ).length;

  const handleOpenModal = (item?: BucketListItem) => {
    if (item) {
      setEditingItem(item);
      setTitle(item.title);
      setDescription(item.description);
      setCategory(item.category);
      setPriority(item.priority);
      setTargetDate(item.targetDate);
      setLinkedMemoryIds(item.linkedMemoryIds || []);
    } else {
      setEditingItem(null);
      setTitle('');
      setDescription('');
      setCategory(DEFAULT_BUCKET_CATEGORIES[0]);
      setPriority('soon');
      setTargetDate('');
      setLinkedMemoryIds([]);
    }
    setModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      addToast('Goal title is required', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingItem) {
        await updateBucketListItem(editingItem, {
          title,
          description,
          category,
          priority,
          targetDate,
          linkedMemoryIds,
        });
        upsertLocalBucketItem({
          ...editingItem,
          title: title.trim(),
          description: description.trim(),
          category: category.trim(),
          priority,
          targetDate: targetDate.trim(),
          linkedMemoryIds,
          updatedAt: new Date().toISOString(),
        });
        addToast('Updated bucket list plan', 'success');
      } else {
        const newId = await createBucketListItem({
          title,
          description,
          category,
          priority,
          targetDate,
          linkedMemoryIds,
        });
        upsertLocalBucketItem({
          id: newId,
          title: title.trim(),
          description: description.trim(),
          category: category.trim(),
          status: 'planned',
          priority,
          targetDate: targetDate.trim(),
          linkedMemoryIds,
          completedAt: '',
          createdBy: user?.uid || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        addToast('Added to Our Bucket List', 'success');
      }
      setModalOpen(false);
    } catch (err) {
      addToast(
        'Failed to save item',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCycleStatus = async (item: BucketListItem) => {
    const nextStatus: BucketStatus =
      item.status === 'planned'
        ? 'in-progress'
        : item.status === 'in-progress'
          ? 'completed'
          : 'planned';

    const nextCompletedAt =
      nextStatus === 'completed'
        ? new Date().toISOString().slice(0, 10)
        : '';

    // Instant UI update
    upsertLocalBucketItem({
      ...item,
      status: nextStatus,
      completedAt: nextCompletedAt,
    });

    try {
      await updateBucketListItem(item, { status: nextStatus });
      addToast(
        nextStatus === 'completed'
          ? `Celebrated "${item.title}"!`
          : `Updated status to ${nextStatus}`,
        'info'
      );
    } catch (err) {
      upsertLocalBucketItem(item);
      addToast(
        'Failed to update status',
        'error',
        err instanceof Error ? err.message : undefined
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setSaving(true);
    try {
      await deleteBucketListItem(itemToDelete.id);
      removeLocalBucketItem(itemToDelete.id);
      setItemToDelete(null);
      addToast('Removed bucket list item', 'info');
    } catch (err) {
      addToast(
        'Failed to delete item',
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
        kicker="Our Bucket List · Shared Dreams & Plans"
        title="Places to Go, Things to Try & Experiences to Share"
        subtitle="Keep track of dreams we want to experience together and link our favorite memories as they come true."
        actions={
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Dream or Plan
          </button>
        }
      />

      {/* Gentle Progress Summary */}
      {bucketItems.length > 0 && (
        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-[var(--accent-blue)]">
              Shared Adventures Progress
            </p>
            <p className="text-sm text-[var(--text-primary)]">
              We have experienced <strong>{completedCount}</strong> of{' '}
              <strong>{bucketItems.length}</strong> shared plans together—with a
              lifetime ahead for the rest.
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
            {(['all', 'planned', 'in-progress', 'completed'] as const).map(
              (st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStatus(st)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 ${
                    selectedStatus === st
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {st === 'all'
                    ? 'All'
                    : st === 'in-progress'
                      ? 'In Progress'
                      : st.charAt(0).toUpperCase() + st.slice(1)}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Category Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border cursor-pointer whitespace-nowrap shrink-0 ${
            selectedCategory === 'all'
              ? 'bg-[var(--accent-blue)] text-white border-[var(--accent-blue)]'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)]'
          }`}
        >
          All Categories ({bucketItems.length})
        </button>
        {categoriesList.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() =>
              setSelectedCategory(selectedCategory === cat ? 'all' : cat)
            }
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border cursor-pointer whitespace-nowrap shrink-0 ${
              selectedCategory === cat
                ? 'bg-[var(--bg-powder-blue)] text-[var(--accent-blue)] border-[var(--accent-blue)]'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <EmptyStatePanel
          title="No Shared Plans in This View Yet"
          description="Add a place you want to visit, a dish to cook together, a movie marathon, or a milestone you're dreaming up."
          actionLabel="Add First Bucket List Item"
          onAction={() => handleOpenModal()}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredItems.map((item) => {
            const linkedMemories = activeMemories.filter((m) =>
              item.linkedMemoryIds?.includes(m.id)
            );
            return (
              <article
                key={item.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 ${
                  item.status === 'completed'
                    ? 'bg-[var(--bg-powder-blue)]/35 border-[var(--accent-blue)]'
                    : 'bg-[var(--bg-surface)] border-[var(--border-hairline)]'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => handleCycleStatus(item)}
                      className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer text-left"
                    >
                      {item.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : item.status === 'in-progress' ? (
                        <Clock className="w-4 h-4 text-[var(--accent-pink)] shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                      )}
                      <span className="text-[var(--text-muted)]">
                        {item.category} · {item.priority}
                      </span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenModal(item)}
                        aria-label={`Edit ${item.title}`}
                        className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemToDelete(item)}
                        aria-label={`Delete ${item.title}`}
                        className="p-1.5 rounded text-[var(--text-secondary)] hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3
                    className={`text-xl font-serif-editorial font-semibold ${
                      item.status === 'completed'
                        ? 'line-through text-[var(--text-secondary)]'
                        : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {item.title}
                  </h3>

                  {item.description && (
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {linkedMemories.length > 0 && (
                    <div className="pt-2 space-y-1.5">
                      <p className="text-[11px] font-medium text-[var(--text-muted)]">
                        Attached Memories:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {linkedMemories.map((lm) => (
                          <button
                            key={lm.id}
                            type="button"
                            onClick={() => onOpenMemory(lm)}
                            className="px-2.5 py-1 rounded text-xs bg-[var(--bg-surface)] border border-[var(--border-hairline)] hover:border-[var(--accent-blue)] cursor-pointer"
                          >
                            {lm.title || lm.originalFileName}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[var(--border-hairline)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>
                    {item.status === 'completed' && item.completedAt
                      ? `Completed ${formatReadableDate(item.completedAt)}`
                      : item.targetDate
                        ? `Target: ${formatReadableDate(item.targetDate)}`
                        : 'Open timeline'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCycleStatus(item)}
                    className="text-[var(--accent-blue)] font-medium hover:underline cursor-pointer"
                  >
                    {item.status === 'completed'
                      ? 'Reopen Plan'
                      : item.status === 'planned'
                        ? 'Mark In Progress'
                        : 'Mark Completed'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <form
            onSubmit={handleSaveItem}
            className="w-full max-w-lg p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
              <h3 className="text-xl font-serif-editorial font-semibold">
                {editingItem ? 'Edit Shared Plan' : 'Add to Our Bucket List'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-[var(--text-muted)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Goal / Plan Title
              </label>
              <input
                type="text"
                required
                maxLength={140}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Watch the sunrise in Baguio, Cook homemade ramen"
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Category
                </label>
                <input
                  type="text"
                  maxLength={60}
                  list="bucket-categories"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
                />
                <datalist id="bucket-categories">
                  {DEFAULT_BUCKET_CATEGORIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as BucketPriority)
                  }
                  className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
                >
                  <option value="soon">Soon</option>
                  <option value="someday">Someday</option>
                  <option value="dream">Big Dream</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Target Date (Optional)
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)] font-mono-tabular"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Notes / Details
              </label>
              <textarea
                rows={2}
                maxLength={1000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
              />
            </div>

            {activeMemories.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Attach Related Memories (Optional)
                </label>
                <div className="max-h-32 overflow-y-auto p-2 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)] space-y-1">
                  {activeMemories.slice(0, 30).map((mem) => {
                    const checked = linkedMemoryIds.includes(mem.id);
                    return (
                      <label
                        key={mem.id}
                        className="flex items-center gap-2 text-xs cursor-pointer py-0.5"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setLinkedMemoryIds((prev) =>
                              checked
                                ? prev.filter((id) => id !== mem.id)
                                : [...prev, mem.id].slice(0, 10)
                            )
                          }
                        />
                        <span className="truncate">
                          {mem.title || mem.originalFileName} ({mem.memoryDate})
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs border border-[var(--border-hairline)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg text-xs font-medium bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)] cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save Plan'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(itemToDelete)}
        title={`Remove "${itemToDelete?.title}" from Bucket List?`}
        description="This removes the bucket list plan. Any linked memories in your gallery remain safe."
        confirmLabel="Remove Item"
        busy={saving}
        onConfirm={handleConfirmDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
};
