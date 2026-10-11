import React, { useState, useEffect } from 'react';
import {
  Upload,
  FolderHeart,
  Mail,
  CheckSquare,
  CalendarHeart,
  Sparkles,
  Play,
  Shuffle,
  Cake,
  Gift,
} from 'lucide-react';
import { useCouple } from '../context/CoupleContext';
import {
  calculateRelationshipDuration,
  formatReadableDate,
  isSameMonthAndDayFromEarlierYear,
  getUpcomingBirthdays,
} from '../utils/dateUtils';
import { MemoryItem, PrimarySection } from '../types/models';
import { MemoryCard, EmptyStatePanel } from '../components/SharedUI';
import {
  toggleMemoryFavorite,
  updateCoupleConfiguration,
} from '../services/coupleDataService';
import { PARTNER_PROFILES } from '../config/coupleConfig';

export const HomeSection: React.FC<{
  onNavigate: (section: PrimarySection) => void;
  onOpenUpload: () => void;
  onOpenMemory: (mem: MemoryItem) => void;
  onOpenSlideshow: (mems: MemoryItem[]) => void;
}> = ({ onNavigate, onOpenUpload, onOpenMemory, onOpenSlideshow }) => {
  const {
    user,
    coupleConfig,
    memories,
    letters,
    bucketItems,
    addToast,
    patchLocalMemory,
    patchLocalCoupleConfig,
  } = useCouple();

  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!user) return null;

  const activeMemories = memories.filter((m) => m.status === 'active');
  const favoriteMemories = activeMemories.filter((m) =>
    m.favoritedBy.includes(user.uid)
  );
  const recentUploads = [...activeMemories].slice(0, 6);
  const onThisDayMemories = activeMemories.filter((m) =>
    isSameMonthAndDayFromEarlierYear(m.memoryDate, now)
  );

  const explicitFeatured = activeMemories.find(
    (m) => m.id === coupleConfig.featuredMemoryId
  );
  const featuredMemory =
    explicitFeatured ||
    favoriteMemories.find((m) => m.mediaType === 'photo') ||
    activeMemories.find((m) => m.mediaType === 'photo') ||
    activeMemories[0] ||
    null;

  const duration = calculateRelationshipDuration(
    coupleConfig.relationshipStartDate,
    now
  );

  const partnerProfile =
    PARTNER_PROFILES[(user.email || '').toLowerCase()] || {
      name: user.displayName || 'Love',
      affectionate: 'Moly',
      funny: 'Ling',
    };

  const handleCycleFeatured = async () => {
    if (activeMemories.length <= 1) return;
    const candidates = activeMemories.filter(
      (m) => m.id !== featuredMemory?.id
    );
    const next =
      candidates[Math.floor(Math.random() * candidates.length)] ||
      activeMemories[0];
    const prevFeaturedId = coupleConfig.featuredMemoryId;
    patchLocalCoupleConfig({ featuredMemoryId: next.id });
    try {
      await updateCoupleConfiguration(coupleConfig, {
        featuredMemoryId: next.id,
      });
      addToast('Updated Featured Memory ⭐', 'info', next.title);
    } catch (err) {
      patchLocalCoupleConfig({ featuredMemoryId: prevFeaturedId });
      addToast(
        'Could not change featured memory',
        'error',
        err instanceof Error ? err.message : undefined
      );
    }
  };

  const handleToggleFavorite = async (mem: MemoryItem) => {
    const isFav = mem.favoritedBy.includes(user.uid);
    const nextFavs = isFav
      ? mem.favoritedBy.filter((id) => id !== user.uid)
      : [...mem.favoritedBy, user.uid].slice(0, 5);
    patchLocalMemory(mem.id, { favoritedBy: nextFavs });
    try {
      await toggleMemoryFavorite(mem, user.uid);
    } catch (err) {
      patchLocalMemory(mem.id, { favoritedBy: mem.favoritedBy });
      addToast(
        'Could not update favorite',
        'error',
        err instanceof Error ? err.message : undefined
      );
    }
  };

  const readyLettersCount = letters.filter((l) => {
    const unlockDate = new Date(l.unlockDateIso);
    return (
      !isNaN(unlockDate.getTime()) &&
      unlockDate.getTime() <= now.getTime() &&
      !l.readBy.includes(user.uid)
    );
  }).length;

  const upcomingBirthdays = getUpcomingBirthdays(coupleConfig, now);
  const todayBirthdays = upcomingBirthdays.filter((b) => b.isToday);

  return (
    <div className="space-y-12">
      {/* Birthday Celebration Banner when today is either partner's birthday */}
      {todayBirthdays.length > 0 && (
        <section className="space-y-4">
          {todayBirthdays.map((b) => (
            <div
              key={b.partnerKey}
              className="p-6 md:p-8 rounded-[36px] bg-[var(--paper-pink)] border-3 border-[var(--ink)] shadow-[10px_10px_0_var(--ink-faint)] relative overflow-hidden space-y-4"
            >
              <span
                aria-hidden="true"
                className="absolute top-4 right-6 text-4xl select-none"
              >
                🎉
              </span>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--bg-surface)] border-3 border-[var(--ink)] flex items-center justify-center text-3xl shrink-0 shadow-sm">
                    🎂
                  </div>
                  <div className="space-y-1.5">
                    <div className="scrapbook-pill">
                      <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span>Today is {b.partnerName}'s Birthday!</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-gaegu font-bold leading-none text-[var(--ink)]">
                      Happy Birthday, {b.partnerName}! ({b.affectionateName} · {b.funnyName}) 🥳
                    </h2>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-2xl leading-relaxed">
                      {b.turningAge
                        ? `Celebrating ${b.turningAge} incredible years of you! May today bring all the sweetness, laughter, and warm memories in our little universe.`
                        : 'Wishing you the sweetest, warmest year full of love, laughter, and unforgettable moments together!'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onNavigate('time-capsule')}
                    className="scrapbook-btn-primary inline-flex items-center gap-2 px-5 py-3 text-xs cursor-pointer whitespace-nowrap"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>Write Birthday Letter</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenUpload}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-semibold border-2 border-[var(--ink)] bg-[var(--bg-surface)] text-[var(--ink)] hover:bg-[var(--paper-blue)] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Birthday Memory</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Variation 14 Split-Screen Scrapbook Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 items-stretch">
        {/* Left Main Scrapbook Card */}
        <div className="scrapbook-card p-8 md:p-12 flex flex-col justify-between space-y-8 relative">
          <span
            aria-hidden="true"
            className="absolute top-6 right-8 text-3xl text-[var(--accent)] select-none"
          >
            ★
          </span>

          <div className="space-y-4">
            <div className="scrapbook-pill">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="var(--accent)"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span>
                Welcome home, {partnerProfile.name} ·{' '}
                {coupleConfig.affectionateLabelOne} &amp;{' '}
                {coupleConfig.affectionateLabelTwo} ·{' '}
                {coupleConfig.funnyLabelOne} &amp; {coupleConfig.funnyLabelTwo}
              </span>
            </div>

            <h1 className="font-gaegu text-[clamp(3.2rem,6vw,5.4rem)] leading-[0.88] font-bold text-[var(--ink)]">
              {coupleConfig.displayName}
            </h1>

            <p className="text-base md:text-lg text-[var(--text-secondary)] max-w-xl leading-relaxed">
              {coupleConfig.subtitle}
            </p>
          </div>

          {/* Live Relationship Counter / Countdown Card */}
          <div className="p-6 rounded-[30px] bg-[var(--paper-blue)] border-2 border-[var(--ink)] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 font-space-mono text-xs uppercase tracking-wider">
              <span className="font-bold text-[var(--ink)]">
                {duration.isFutureStart
                  ? `Our Story Begins On ${duration.startDateFormatted}`
                  : `Together Since ${duration.startDateFormatted}`}
              </span>
              <span className="text-[var(--accent)] font-bold">
                {duration.isFutureStart
                  ? 'Countdown to Day One'
                  : `${duration.totalDays} Total Days`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border-2 border-[var(--ink)]">
                <p className="text-4xl font-gaegu font-bold leading-none text-[var(--ink)]">
                  {duration.years > 0 ? duration.years : duration.months}
                </p>
                <p className="text-[11px] font-space-mono uppercase text-[var(--text-muted)] mt-1">
                  {duration.years > 0 ? 'Years' : 'Months'}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border-2 border-[var(--ink)]">
                <p className="text-4xl font-gaegu font-bold leading-none text-[var(--ink)]">
                  {duration.years > 0 ? duration.months : duration.days}
                </p>
                <p className="text-[11px] font-space-mono uppercase text-[var(--text-muted)] mt-1">
                  {duration.years > 0 ? 'Months' : 'Days'}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border-2 border-[var(--ink)]">
                <p className="text-4xl font-gaegu font-bold leading-none text-[var(--ink)]">
                  {String(duration.hours).padStart(2, '0')}h :{' '}
                  {String(duration.minutes).padStart(2, '0')}m
                </p>
                <p className="text-[11px] font-space-mono uppercase text-[var(--text-muted)] mt-1">
                  Hours &amp; Mins
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--paper-pink)] border-2 border-[var(--ink)]">
                <p className="text-4xl font-gaegu font-bold leading-none text-[var(--accent)]">
                  {String(duration.seconds).padStart(2, '0')}s
                </p>
                <p className="text-[11px] font-space-mono uppercase text-[var(--text-muted)] mt-1">
                  Seconds
                </p>
              </div>
            </div>

            {/* Upcoming Anniversary / In-App Reminder */}
            <div className="pt-3 border-t border-[var(--ink-faint)] flex flex-wrap items-center justify-between gap-2 text-xs font-space-mono">
              <span className="inline-flex items-center gap-1.5">
                <CalendarHeart className="w-4 h-4 text-[var(--accent)]" />
                <span>
                  Next: <strong>{duration.nextMilestoneTitle}</strong> (
                  {duration.nextMilestoneDateFormatted})
                </span>
              </span>
              <span className="text-[var(--accent)] font-bold">
                {duration.daysUntilNextMilestone === 0
                  ? 'Today!'
                  : `In ${duration.daysUntilNextMilestone}d`}
              </span>
            </div>

            {/* Upcoming Birthdays Tracker */}
            {upcomingBirthdays.length > 0 && (
              <div className="pt-3 border-t border-dashed border-[var(--ink-faint)] space-y-2.5">
                <div className="flex items-center justify-between text-xs font-space-mono">
                  <span className="font-bold text-[var(--ink)] inline-flex items-center gap-1.5">
                    <Cake className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Birthday Countdowns</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('settings')}
                    className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] underline cursor-pointer"
                  >
                    Settings
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {upcomingBirthdays.map((b) => (
                    <div
                      key={b.partnerKey}
                      className={`p-3 rounded-2xl border-2 border-[var(--ink)] flex items-center justify-between gap-2.5 transition-colors ${
                        b.isToday
                          ? 'bg-[var(--paper-pink)] shadow-sm'
                          : 'bg-[var(--bg-surface)]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm shrink-0" role="img" aria-label="birthday cake">
                            🎂
                          </span>
                          <p className="font-bold text-xs text-[var(--ink)] truncate">
                            {b.partnerName} ({b.affectionateName})
                          </p>
                        </div>
                        <p className="text-[10px] font-space-mono text-[var(--text-secondary)] pl-5">
                          {b.formattedBirthday}
                          {b.turningAge ? ` · Turning ${b.turningAge}` : ''}
                        </p>
                      </div>

                      <span
                        className={`font-space-mono text-[11px] px-2.5 py-1 rounded-full border border-[var(--ink)] shrink-0 font-bold ${
                          b.isToday
                            ? 'bg-[var(--accent)] text-white'
                            : b.isTomorrow
                            ? 'bg-[var(--paper-pink)] text-[var(--accent)]'
                            : 'bg-[var(--paper-blue)] text-[var(--ink)]'
                        }`}
                      >
                        {b.isToday
                          ? 'Today! 🥳'
                          : b.isTomorrow
                          ? 'Tomorrow!'
                          : `In ${b.daysUntil}d`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onOpenUpload}
              className="scrapbook-btn-primary inline-flex items-center gap-2 px-6 py-3.5 text-xs cursor-pointer whitespace-nowrap shrink-0"
            >
              <Upload className="w-4 h-4" />
              Upload Memory
            </button>
            <button
              type="button"
              onClick={() => onNavigate('memories')}
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl text-xs font-semibold border-2 border-[var(--ink)] bg-[var(--paper-blue)] text-[var(--ink)] hover:bg-[var(--accent)] hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <FolderHeart className="w-4 h-4" />
              Browse Memories
            </button>
            <button
              type="button"
              onClick={() => onNavigate('time-capsule')}
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl text-xs font-semibold border-2 border-[var(--ink)] bg-[var(--paper-pink)] text-[var(--ink)] hover:bg-[var(--accent)] hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Mail className="w-4 h-4" />
              Write a Letter
              {readyLettersCount > 0 && (
                <span className="font-space-mono text-[var(--accent)] font-bold">
                  ({readyLettersCount})
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('bucket-list')}
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl text-xs font-semibold border-2 border-[var(--ink)] bg-[var(--bg-surface)] text-[var(--ink)] hover:bg-[var(--paper-blue)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <CheckSquare className="w-4 h-4" />
              Bucket List
            </button>
          </div>
        </div>

        {/* Right Sidebar Tilted Scrapbook Cards */}
        <div className="grid grid-rows-[1fr_auto] gap-8">
          {/* Featured Memory Card */}
          <div className="bg-[var(--paper-pink)] border-3 border-[var(--ink)] rounded-[40px] p-7 flex flex-col justify-between space-y-4 lg:rotate-1 shadow-[10px_10px_0_var(--ink-faint)]">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-space-mono text-[0.65rem] uppercase tracking-wider text-[var(--accent)] font-bold block">
                  Featured Memory
                </span>
                <h2 className="text-3xl font-gaegu font-bold leading-none text-[var(--ink)]">
                  Album Spotlight
                </h2>
              </div>

              <div className="flex items-center gap-1.5">
                {activeMemories.length > 1 && (
                  <button
                    type="button"
                    onClick={handleCycleFeatured}
                    title="Shuffle featured memory"
                    className="p-2 rounded-xl border-2 border-[var(--ink)] bg-[var(--bg-surface)] text-[var(--ink)] hover:bg-[var(--paper-blue)] cursor-pointer"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                  </button>
                )}
                {activeMemories.some((m) => m.mediaType === 'photo') && (
                  <button
                    type="button"
                    onClick={() => onOpenSlideshow(activeMemories)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 border-[var(--ink)] bg-[var(--bg-surface)] text-[var(--ink)] hover:bg-[var(--accent)] hover:text-white cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Slideshow
                  </button>
                )}
              </div>
            </div>

            {featuredMemory ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => onOpenMemory(featuredMemory)}
                  className="w-full aspect-[4/3] rounded-3xl bg-[var(--bg-surface)] border-2 border-[var(--ink)] overflow-hidden flex items-center justify-center cursor-pointer group"
                >
                  {featuredMemory.mediaType === 'photo' &&
                  (featuredMemory.thumbnailUrl || featuredMemory.mediaUrl) ? (
                    <img
                      src={
                        featuredMemory.thumbnailUrl || featuredMemory.mediaUrl
                      }
                      alt={featuredMemory.altText || featuredMemory.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="p-6 text-center space-y-2">
                      <Sparkles className="w-8 h-8 mx-auto text-[var(--accent)]" />
                      <p className="text-xl font-gaegu font-bold">
                        {featuredMemory.title}
                      </p>
                    </div>
                  )}
                </button>

                <div>
                  <p className="font-space-mono text-[0.65rem] uppercase opacity-70">
                    {formatReadableDate(featuredMemory.memoryDate)}
                    {featuredMemory.locationText
                      ? ` · ${featuredMemory.locationText}`
                      : ''}
                  </p>
                  <h3 className="text-2xl font-gaegu font-bold leading-tight">
                    {featuredMemory.title || 'Untitled Memory'}
                  </h3>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 rounded-3xl bg-[var(--bg-surface)] border-2 border-dashed border-[var(--ink)] text-center space-y-3">
                <p className="text-2xl font-gaegu font-bold">
                  Your First Frame Awaits
                </p>
                <p className="text-xs opacity-75">
                  Upload a photo, video, or voice note to pin it here.
                </p>
                <button
                  type="button"
                  onClick={onOpenUpload}
                  className="scrapbook-btn-primary px-4 py-2 text-xs cursor-pointer"
                >
                  Add First Memory
                </button>
              </div>
            )}
          </div>

          {/* Tilted Blue Stats Card */}
          <div className="bg-[var(--paper-blue)] border-3 border-[var(--ink)] rounded-[40px] p-7 lg:-rotate-1 shadow-[8px_8px_0_var(--ink-faint)] grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => onNavigate('memories')}
              className="text-left cursor-pointer"
            >
              <span className="font-space-mono text-[0.6rem] uppercase opacity-70 block">
                Memories
              </span>
              <span className="font-gaegu text-4xl font-bold leading-none">
                {activeMemories.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('ling-kong')}
              className="text-left cursor-pointer"
            >
              <span className="font-space-mono text-[0.6rem] uppercase opacity-70 block">
                {coupleConfig.funnyLabelOne} &amp; {coupleConfig.funnyLabelTwo}
              </span>
              <span className="font-gaegu text-4xl font-bold leading-none text-[var(--accent)]">
                {activeMemories.filter((m) => m.isLingKong).length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('time-capsule')}
              className="text-left cursor-pointer"
            >
              <span className="font-space-mono text-[0.6rem] uppercase opacity-70 block">
                Time Capsule
              </span>
              <span className="font-gaegu text-4xl font-bold leading-none">
                {letters.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('bucket-list')}
              className="text-left cursor-pointer"
            >
              <span className="font-space-mono text-[0.6rem] uppercase opacity-70 block">
                Bucket List
              </span>
              <span className="font-gaegu text-4xl font-bold leading-none">
                {bucketItems.filter((b) => b.status === 'completed').length}/
                {bucketItems.length}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* First-Use Onboarding Empty State */}
      {activeMemories.length === 0 ? (
        <EmptyStatePanel
          title={`Welcome to ${coupleConfig.affectionateLabelOne} & ${coupleConfig.affectionateLabelTwo}'s Little Universe`}
          description="Your private Firebase sanctuary is ready and locked exclusively to Kathy and Austin. Start by uploading your favorite photos, voice notes, or sealing a future letter in the Time Capsule."
          actionLabel="Upload Your First Memory"
          onAction={onOpenUpload}
          secondaryLabel="Write a Time Capsule Letter"
          onSecondaryAction={() => onNavigate('time-capsule')}
        />
      ) : (
        <>
          {/* On This Day Section */}
          {onThisDayMemories.length > 0 ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b-2 border-dashed border-[var(--ink-faint)] pb-3">
                <div>
                  <span className="font-space-mono text-xs uppercase text-[var(--accent)] font-bold">
                    On This Day
                  </span>
                  <h2 className="text-4xl font-gaegu font-bold">
                    Memories from{' '}
                    {now.toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                    })}{' '}
                    in Earlier Years
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {onThisDayMemories.map((mem) => (
                  <MemoryCard
                    key={mem.id}
                    memory={mem}
                    currentUserId={user.uid}
                    onOpen={onOpenMemory}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            </section>
          ) : (
            <section className="p-7 rounded-[32px] bg-[var(--paper-pink)] border-2 border-[var(--ink)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[8px_8px_0_var(--ink-faint)]">
              <div className="space-y-1">
                <p className="font-space-mono text-xs uppercase font-bold text-[var(--accent)]">
                  On This Day ·{' '}
                  {now.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-sm text-[var(--ink)]">
                  We are in our first chapters—no memories from earlier years on{' '}
                  {now.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                  })}{' '}
                  yet. Everything you save today will resurface here next year.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenUpload}
                className="scrapbook-btn-primary px-5 py-2.5 text-xs cursor-pointer whitespace-nowrap shrink-0"
              >
                Save a Memory for Today
              </button>
            </section>
          )}

          {/* Recent Uploads */}
          <section className="space-y-5">
            <div className="flex items-center justify-between border-b-2 border-dashed border-[var(--ink-faint)] pb-3">
              <div>
                <span className="font-space-mono text-xs uppercase opacity-70">
                  Freshly Added
                </span>
                <h2 className="text-4xl font-gaegu font-bold leading-none">
                  Recent Memories
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('memories')}
                className="font-space-mono text-xs uppercase font-bold text-[var(--accent)] hover:underline cursor-pointer"
              >
                View Full Library ({activeMemories.length}) →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentUploads.map((mem) => (
                <MemoryCard
                  key={mem.id}
                  memory={mem}
                  currentUserId={user.uid}
                  onOpen={onOpenMemory}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          </section>

          {/* Favorite Memories */}
          {favoriteMemories.length > 0 && (
            <section className="space-y-5">
              <div className="flex items-center justify-between border-b-2 border-dashed border-[var(--ink-faint)] pb-3">
                <div>
                  <span className="font-space-mono text-xs uppercase text-[var(--accent)] font-bold">
                    Treasured Highlights
                  </span>
                  <h2 className="text-4xl font-gaegu font-bold leading-none">
                    Your Favorited Memories
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteMemories.slice(0, 6).map((mem) => (
                  <MemoryCard
                    key={mem.id}
                    memory={mem}
                    currentUserId={user.uid}
                    onOpen={onOpenMemory}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
