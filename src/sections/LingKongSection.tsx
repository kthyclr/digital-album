import React, { useState, useMemo } from 'react';
import { Upload, Smile } from 'lucide-react';
import { useCouple } from '../context/CoupleContext';
import { MemoryItem } from '../types/models';
import {
  SectionHeader,
  MemoryCard,
  EmptyStatePanel,
} from '../components/SharedUI';
import { DEFAULT_LING_KONG_LABELS } from '../config/coupleConfig';
import { toggleMemoryFavorite } from '../services/coupleDataService';

export const LingKongSection: React.FC<{
  onOpenUploadLingKong: () => void;
  onOpenMemory: (mem: MemoryItem) => void;
}> = ({ onOpenUploadLingKong, onOpenMemory }) => {
  const { user, coupleConfig, memories, patchLocalMemory } = useCouple();
  const [selectedLabel, setSelectedLabel] = useState<string>('all');

  if (!user) return null;

  const handleToggleFav = async (m: MemoryItem) => {
    const isFav = m.favoritedBy.includes(user.uid);
    const nextFavs = isFav
      ? m.favoritedBy.filter((id) => id !== user.uid)
      : [...m.favoritedBy, user.uid].slice(0, 5);
    patchLocalMemory(m.id, { favoritedBy: nextFavs });
    try {
      await toggleMemoryFavorite(m, user.uid);
    } catch {
      patchLocalMemory(m.id, { favoritedBy: m.favoritedBy });
    }
  };

  const lingKongMemories = useMemo(
    () =>
      memories.filter(
        (m) =>
          m.status === 'active' &&
          (m.isLingKong ||
            m.tags.some(
              (t) =>
                t.toLowerCase() === 'ling & kong' ||
                t.toLowerCase() === 'funny'
            ))
      ),
    [memories]
  );

  const availableLabels = useMemo(() => {
    const set = new Set<string>(DEFAULT_LING_KONG_LABELS);
    lingKongMemories.forEach((m) => {
      if (m.lingKongLabel) set.add(m.lingKongLabel);
    });
    return Array.from(set);
  }, [lingKongMemories]);

  const filteredItems = useMemo(() => {
    if (selectedLabel === 'all') return lingKongMemories;
    return lingKongMemories.filter((m) => m.lingKongLabel === selectedLabel);
  }, [lingKongMemories, selectedLabel]);

  return (
    <div className="space-y-8">
      <SectionHeader
        kicker={`${coupleConfig.funnyLabelOne} & ${coupleConfig.funnyLabelTwo} · Playful Corner`}
        title="Inside Jokes, Goofy Snapshots & Unfiltered Chaos"
        subtitle={`A playful corner for ${coupleConfig.partnerOneName} (${coupleConfig.funnyLabelOne}) & ${coupleConfig.partnerTwoName} (${coupleConfig.funnyLabelTwo})—silly faces, funny voice notes, and things only the two of us understand.`}
        actions={
          <button
            type="button"
            onClick={onOpenUploadLingKong}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-[var(--accent-pink)] text-white hover:bg-[var(--accent-pink-hover)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            Add {coupleConfig.funnyLabelOne} &amp; {coupleConfig.funnyLabelTwo} Moment
          </button>
        }
      />

      {/* Subcategory Label Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSelectedLabel('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            selectedLabel === 'all'
              ? 'bg-[var(--accent-pink)] text-white border-[var(--accent-pink)]'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:text-[var(--text-primary)]'
          }`}
        >
          All Silly Moments ({lingKongMemories.length})
        </button>

        {availableLabels.map((lbl) => {
          const count = lingKongMemories.filter(
            (m) => m.lingKongLabel === lbl
          ).length;
          return (
            <button
              key={lbl}
              type="button"
              onClick={() =>
                setSelectedLabel(selectedLabel === lbl ? 'all' : lbl)
              }
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                selectedLabel === lbl
                  ? 'bg-[var(--bg-powder-pink)] text-[var(--accent-pink)] border-[var(--accent-pink)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:text-[var(--text-primary)]'
              }`}
            >
              {lbl} ({count})
            </button>
          );
        })}
      </div>

      {filteredItems.length === 0 ? (
        <EmptyStatePanel
          title={`No ${coupleConfig.funnyLabelOne} & ${coupleConfig.funnyLabelTwo} Moments Yet`}
          description="Upload a funny photo, outtake video, or silly voice note—or tag any existing memory in the gallery with 'Include in Ling & Kong'."
          actionLabel={`Upload ${coupleConfig.funnyLabelOne} & ${coupleConfig.funnyLabelTwo} Moment`}
          onAction={onOpenUploadLingKong}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((mem) => (
            <div key={mem.id} className="space-y-1.5">
              {mem.lingKongLabel && (
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent-pink)] px-1">
                  <Smile className="w-3.5 h-3.5" />
                  <span>{mem.lingKongLabel}</span>
                </div>
              )}
              <MemoryCard
                memory={mem}
                currentUserId={user.uid}
                onOpen={onOpenMemory}
                onToggleFavorite={handleToggleFav}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
