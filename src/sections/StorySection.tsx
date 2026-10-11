import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
} from 'lucide-react';
import { useCouple } from '../context/CoupleContext';
import { MemoryItem, StoryMilestone } from '../types/models';
import {
  SectionHeader,
  EmptyStatePanel,
  MemoryCard,
  ConfirmDialog,
} from '../components/SharedUI';
import { formatReadableDate, getTodayIsoString } from '../utils/dateUtils';
import {
  createStoryMilestone,
  updateStoryMilestone,
  deleteStoryMilestone,
  toggleMemoryFavorite,
} from '../services/coupleDataService';

export const StorySection: React.FC<{
  onOpenMemory: (mem: MemoryItem) => void;
  onOpenUpload: () => void;
}> = ({ onOpenMemory, onOpenUpload }) => {
  const { user, coupleConfig, memories, milestones, addToast } = useCouple();

  const [mode, setMode] = useState<'timeline' | 'calendar'>('timeline');
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [selectedDayIso, setSelectedDayIso] = useState<string>('');

  // Milestone Modal State
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] =
    useState<StoryMilestone | null>(null);
  const [mTitle, setMTitle] = useState('');
  const [mDate, setMDate] = useState(getTodayIsoString());
  const [mCategory, setMCategory] = useState('Milestone');
  const [mDesc, setMDesc] = useState('');
  const [mLinkedIds, setMLinkedIds] = useState<string[]>([]);
  const [savingMilestone, setSavingMilestone] = useState(false);
  const [milestoneToDelete, setMilestoneToDelete] =
    useState<StoryMilestone | null>(null);

  if (!user) return null;

  const activeMemories = useMemo(
    () => memories.filter((m) => m.status === 'active'),
    [memories]
  );

  // Combine Memories and Manual Milestones chronologically by date
  const timelineGroups = useMemo(() => {
    const dateMap = new Map<
      string,
      {
        dateIso: string;
        milestones: StoryMilestone[];
        memories: MemoryItem[];
      }
    >();

    for (const ms of milestones) {
      const key = ms.eventDate;
      if (!dateMap.has(key)) {
        dateMap.set(key, { dateIso: key, milestones: [], memories: [] });
      }
      dateMap.get(key)!.milestones.push(ms);
    }

    for (const mem of activeMemories) {
      const key = mem.memoryDate;
      if (!dateMap.has(key)) {
        dateMap.set(key, { dateIso: key, milestones: [], memories: [] });
      }
      dateMap.get(key)!.memories.push(mem);
    }

    return Array.from(dateMap.values()).sort((a, b) =>
      b.dateIso.localeCompare(a.dateIso)
    );
  }, [milestones, activeMemories]);

  // Calendar grid calculation
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: {
      dayNum: number | null;
      isoDate: string;
      memories: MemoryItem[];
      milestones: StoryMilestone[];
    }[] = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ dayNum: null, isoDate: '', memories: [], milestones: [] });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(
        d
      ).padStart(2, '0')}`;
      const dayMemories = activeMemories.filter((m) => m.memoryDate === iso);
      const dayMilestones = milestones.filter((ms) => ms.eventDate === iso);
      cells.push({
        dayNum: d,
        isoDate: iso,
        memories: dayMemories,
        milestones: dayMilestones,
      });
    }

    return cells;
  }, [calendarMonth, activeMemories, milestones]);

  const selectedDayEntries = useMemo(() => {
    if (!selectedDayIso) return { memories: [], milestones: [] };
    return {
      memories: activeMemories.filter((m) => m.memoryDate === selectedDayIso),
      milestones: milestones.filter((ms) => ms.eventDate === selectedDayIso),
    };
  }, [selectedDayIso, activeMemories, milestones]);

  const handleOpenMilestoneModal = (ms?: StoryMilestone) => {
    if (ms) {
      setEditingMilestone(ms);
      setMTitle(ms.title);
      setMDate(ms.eventDate);
      setMCategory(ms.category || 'Milestone');
      setMDesc(ms.description);
      setMLinkedIds(ms.memoryIds || []);
    } else {
      setEditingMilestone(null);
      setMTitle('');
      setMDate(coupleConfig.relationshipStartDate || getTodayIsoString());
      setMCategory('Milestone');
      setMDesc('');
      setMLinkedIds([]);
    }
    setMilestoneModalOpen(true);
  };

  const handleSaveMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mTitle.trim() || !mDate) {
      addToast('Milestone title and date are required', 'error');
      return;
    }
    setSavingMilestone(true);
    try {
      if (editingMilestone) {
        await updateStoryMilestone(editingMilestone, {
          title: mTitle,
          eventDate: mDate,
          category: mCategory,
          description: mDesc,
          memoryIds: mLinkedIds,
        });
        addToast('Milestone updated', 'success');
      } else {
        await createStoryMilestone({
          title: mTitle,
          eventDate: mDate,
          category: mCategory,
          description: mDesc,
          memoryIds: mLinkedIds,
        });
        addToast('Milestone added to Our Story', 'success');
      }
      setMilestoneModalOpen(false);
    } catch (err) {
      addToast(
        'Failed to save milestone',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setSavingMilestone(false);
    }
  };

  const handleConfirmDeleteMilestone = async () => {
    if (!milestoneToDelete) return;
    setSavingMilestone(true);
    try {
      await deleteStoryMilestone(milestoneToDelete.id);
      setMilestoneToDelete(null);
      addToast('Milestone removed', 'info');
    } catch (err) {
      addToast(
        'Failed to delete milestone',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setSavingMilestone(false);
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        kicker={`Our Story · Since ${formatReadableDate(
          coupleConfig.relationshipStartDate
        )}`}
        title="Chronological Timeline & Calendar"
        subtitle="Explore our journey by memory date (never upload date) and record genuine relationship milestones."
        actions={
          <>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
              <button
                type="button"
                onClick={() => setMode('timeline')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 ${
                  mode === 'timeline'
                    ? 'bg-[var(--accent-blue)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Timeline
              </button>
              <button
                type="button"
                onClick={() => setMode('calendar')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 ${
                  mode === 'calendar'
                    ? 'bg-[var(--accent-blue)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                Calendar
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleOpenMilestoneModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Milestone
            </button>
          </>
        }
      />

      {mode === 'timeline' ? (
        timelineGroups.length === 0 ? (
          <EmptyStatePanel
            title="Our Timeline Starts Here"
            description="We never fabricate past events. Add your first real relationship milestone or upload a memory to populate your chronological timeline."
            actionLabel="Add First Milestone"
            onAction={() => handleOpenMilestoneModal()}
            secondaryLabel="Upload a Memory"
            onSecondaryAction={onOpenUpload}
          />
        ) : (
          <div className="space-y-10">
            {timelineGroups.map((group) => (
              <div
                key={group.dateIso}
                className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border-hairline)]">
                  <h2 className="text-2xl font-serif-editorial font-semibold text-[var(--text-primary)]">
                    {formatReadableDate(group.dateIso)}
                  </h2>
                  <span className="text-xs text-[var(--text-muted)] font-mono-tabular">
                    {group.milestones.length > 0 &&
                      `${group.milestones.length} milestone${
                        group.milestones.length > 1 ? 's' : ''
                      }`}
                    {group.milestones.length > 0 &&
                      group.memories.length > 0 &&
                      ' · '}
                    {group.memories.length > 0 &&
                      `${group.memories.length} memor${
                        group.memories.length > 1 ? 'ies' : 'y'
                      }`}
                  </span>
                </div>

                {/* Manual Milestones on this date */}
                {group.milestones.map((ms) => {
                  const linkedMemories = activeMemories.filter((m) =>
                    ms.memoryIds?.includes(m.id)
                  );
                  return (
                    <div
                      key={ms.id}
                      className="p-5 rounded-xl bg-[var(--bg-powder-pink)]/45 border border-[var(--border-hairline)] space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-pink)]">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{ms.category || 'Milestone'}</span>
                          </span>
                          <h3 className="text-xl font-serif-editorial font-semibold text-[var(--text-primary)]">
                            {ms.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenMilestoneModal(ms)}
                            aria-label={`Edit milestone ${ms.title}`}
                            className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setMilestoneToDelete(ms)}
                            aria-label={`Delete milestone ${ms.title}`}
                            className="p-1.5 rounded text-[var(--text-secondary)] hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {ms.description && (
                        <p className="text-sm text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                          {ms.description}
                        </p>
                      )}

                      {linkedMemories.length > 0 && (
                        <div className="pt-2 space-y-2">
                          <p className="text-xs font-medium text-[var(--text-muted)]">
                            Linked Memories:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {linkedMemories.map((lm) => (
                              <button
                                key={lm.id}
                                type="button"
                                onClick={() => onOpenMemory(lm)}
                                className="px-3 py-1.5 rounded-lg text-xs bg-[var(--bg-surface)] border border-[var(--border-hairline)] hover:border-[var(--accent-blue)] cursor-pointer"
                              >
                                Open: {lm.title || lm.originalFileName}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Memories on this date */}
                {group.memories.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {group.memories.map((mem) => (
                      <MemoryCard
                        key={mem.id}
                        memory={mem}
                        currentUserId={user.uid}
                        onOpen={onOpenMemory}
                        onToggleFavorite={(m) =>
                          toggleMemoryFavorite(m, user.uid)
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        /* Calendar View */
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif-editorial font-semibold">
                {calendarMonth.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCalendarMonth(
                      new Date(
                        calendarMonth.getFullYear(),
                        calendarMonth.getMonth() - 1,
                        1
                      )
                    )
                  }
                  aria-label="Previous month"
                  className="p-2 rounded-lg border border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarMonth(new Date())}
                  className="px-3 py-1.5 rounded-lg text-xs border border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCalendarMonth(
                      new Date(
                        calendarMonth.getFullYear(),
                        calendarMonth.getMonth() + 1,
                        1
                      )
                    )
                  }
                  aria-label="Next month"
                  className="p-2 rounded-lg border border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-[var(--text-muted)]">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((cell, idx) => {
                if (cell.dayNum === null) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="h-20 rounded-xl bg-[var(--bg-subtle)]/30"
                    />
                  );
                }
                const hasItems =
                  cell.memories.length > 0 || cell.milestones.length > 0;
                const isSelected = selectedDayIso === cell.isoDate;

                return (
                  <button
                    key={cell.isoDate}
                    type="button"
                    onClick={() =>
                      setSelectedDayIso(isSelected ? '' : cell.isoDate)
                    }
                    className={`h-20 p-2 rounded-xl border text-left flex flex-col justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-[var(--accent-blue)] bg-[var(--bg-powder-blue)]'
                        : hasItems
                          ? 'border-[var(--border-strong)] bg-[var(--bg-powder-pink)]/40 hover:bg-[var(--bg-powder-pink)]/70'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <span className="text-xs font-mono-tabular font-semibold">
                      {cell.dayNum}
                    </span>
                    {hasItems && (
                      <div className="text-[10px] text-[var(--accent-blue)] font-medium truncate">
                        {cell.memories.length > 0 &&
                          `${cell.memories.length} mem`}
                        {cell.memories.length > 0 &&
                          cell.milestones.length > 0 &&
                          ' · '}
                        {cell.milestones.length > 0 &&
                          `${cell.milestones.length} ms`}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDayIso && (
            <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-serif-editorial font-semibold">
                  Entries on {formatReadableDate(selectedDayIso)}
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedDayIso('')}
                  className="text-xs text-[var(--text-secondary)] hover:underline cursor-pointer"
                >
                  Close Day View
                </button>
              </div>

              {selectedDayEntries.milestones.length === 0 &&
              selectedDayEntries.memories.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">
                  No memories or milestones saved on this date.
                </p>
              ) : (
                <div className="space-y-4">
                  {selectedDayEntries.milestones.map((ms) => (
                    <div
                      key={ms.id}
                      className="p-4 rounded-xl bg-[var(--bg-powder-pink)]/45 border border-[var(--border-hairline)]"
                    >
                      <p className="text-xs font-semibold text-[var(--accent-pink)]">
                        {ms.category}
                      </p>
                      <p className="text-base font-serif-editorial font-semibold">
                        {ms.title}
                      </p>
                      {ms.description && (
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          {ms.description}
                        </p>
                      )}
                    </div>
                  ))}

                  {selectedDayEntries.memories.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {selectedDayEntries.memories.map((mem) => (
                        <MemoryCard
                          key={mem.id}
                          memory={mem}
                          currentUserId={user.uid}
                          onOpen={onOpenMemory}
                          onToggleFavorite={(m) =>
                            toggleMemoryFavorite(m, user.uid)
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Milestone Modal */}
      {milestoneModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <form
            onSubmit={handleSaveMilestone}
            className="w-full max-w-lg p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
              <h3 className="text-xl font-serif-editorial font-semibold">
                {editingMilestone ? 'Edit Milestone' : 'Add Story Milestone'}
              </h3>
              <button
                type="button"
                onClick={() => setMilestoneModalOpen(false)}
                className="p-1 text-[var(--text-muted)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Milestone Title
              </label>
              <input
                type="text"
                required
                maxLength={140}
                value={mTitle}
                onChange={(e) => setMTitle(e.target.value)}
                placeholder="e.g., Official Day One, First Trip Together"
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Event Date
                </label>
                <input
                  type="date"
                  required
                  value={mDate}
                  onChange={(e) => setMDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)] font-mono-tabular"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Category
                </label>
                <input
                  type="text"
                  maxLength={60}
                  value={mCategory}
                  onChange={(e) => setMCategory(e.target.value)}
                  placeholder="Milestone, Anniversary, Firsts..."
                  className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Story / Description
              </label>
              <textarea
                rows={3}
                maxLength={1500}
                value={mDesc}
                onChange={(e) => setMDesc(e.target.value)}
                placeholder="Write what made this day unforgettable..."
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
              />
            </div>

            {activeMemories.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Link Existing Memories (Optional)
                </label>
                <div className="max-h-32 overflow-y-auto p-2 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)] space-y-1">
                  {activeMemories.slice(0, 30).map((mem) => {
                    const checked = mLinkedIds.includes(mem.id);
                    return (
                      <label
                        key={mem.id}
                        className="flex items-center gap-2 text-xs cursor-pointer py-0.5"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setMLinkedIds((prev) =>
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
                onClick={() => setMilestoneModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs border border-[var(--border-hairline)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingMilestone}
                className="px-5 py-2 rounded-lg text-xs font-medium bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)] cursor-pointer"
              >
                {savingMilestone ? 'Saving...' : 'Save Milestone'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(milestoneToDelete)}
        title={`Delete milestone "${milestoneToDelete?.title}"?`}
        description="This removes the milestone entry from Our Story timeline. Any linked memories remain untouched in your gallery."
        confirmLabel="Delete Milestone"
        busy={savingMilestone}
        onConfirm={handleConfirmDeleteMilestone}
        onCancel={() => setMilestoneToDelete(null)}
      />
    </div>
  );
};
