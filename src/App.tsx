import React, { useState } from 'react';
import {
  Home,
  FolderHeart,
  Clock,
  Music,
  Smile,
  Mail,
  CheckSquare,
  Settings,
  Upload,
  Menu,
  X,
} from 'lucide-react';
import { CoupleProvider, useCouple } from './context/CoupleContext';
import { AuthScreens } from './components/AuthScreens';
import { ToastRegion } from './components/SharedUI';
import { UploadMemoryModal } from './components/UploadMemoryModal';
import { MediaViewerModal } from './components/MediaViewerModal';
import { SlideshowModal } from './components/SlideshowModal';
import { HomeSection } from './sections/HomeSection';
import { MemoriesSection } from './sections/MemoriesSection';
import { StorySection } from './sections/StorySection';
import { SoundtrackSection } from './sections/SoundtrackSection';
import { LingKongSection } from './sections/LingKongSection';
import { TimeCapsuleSection } from './sections/TimeCapsuleSection';
import { BucketListSection } from './sections/BucketListSection';
import { SettingsSection } from './sections/SettingsSection';
import { MemoryItem, PrimarySection } from './types/models';

const NAV_ITEMS: {
  id: PrimarySection;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'home', label: 'Home', shortLabel: 'Home', icon: Home },
  {
    id: 'memories',
    label: 'Our Memories',
    shortLabel: 'Memories',
    icon: FolderHeart,
  },
  { id: 'story', label: 'Our Story', shortLabel: 'Story', icon: Clock },
  {
    id: 'soundtrack',
    label: 'Our Soundtrack',
    shortLabel: 'Soundtrack',
    icon: Music,
  },
  {
    id: 'ling-kong',
    label: 'Ling & Kong',
    shortLabel: 'Ling & Kong',
    icon: Smile,
  },
  {
    id: 'time-capsule',
    label: 'Time Capsule',
    shortLabel: 'Capsule',
    icon: Mail,
  },
  {
    id: 'bucket-list',
    label: 'Our Bucket List',
    shortLabel: 'Bucket List',
    icon: CheckSquare,
  },
  {
    id: 'settings',
    label: 'Settings',
    shortLabel: 'Settings',
    icon: Settings,
  },
];

const AuthenticatedShell: React.FC = () => {
  const {
    user,
    authLoading,
    isAuthorizedMember,
    coupleConfig,
    memories,
    toasts,
    dismissToast,
  } = useCouple();

  const [activeSection, setActiveSection] = useState<PrimarySection>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Upload Modal State
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadDefaultAlbumId, setUploadDefaultAlbumId] = useState('');
  const [uploadDefaultLingKong, setUploadDefaultLingKong] = useState(false);
  const [uploadDefaultSoundtrack, setUploadDefaultSoundtrack] = useState(false);

  // Media Viewer Lightbox State
  const [viewerMemory, setViewerMemory] = useState<MemoryItem | null>(null);

  // Slideshow Modal State
  const [slideshowMemories, setSlideshowMemories] = useState<
    MemoryItem[] | null
  >(null);

  if (authLoading || !user || !isAuthorizedMember) {
    return <AuthScreens />;
  }

  const activeMemories = memories.filter((m) => m.status === 'active');

  const handleOpenUpload = (options?: {
    albumId?: string;
    lingKong?: boolean;
    soundtrack?: boolean;
  }) => {
    setUploadDefaultAlbumId(options?.albumId || '');
    setUploadDefaultLingKong(Boolean(options?.lingKong));
    setUploadDefaultSoundtrack(Boolean(options?.soundtrack));
    setUploadOpen(true);
  };

  const handleNavigate = (section: PrimarySection) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const topBarLinks: { id: PrimarySection; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'memories', label: 'Memories' },
    { id: 'story', label: 'Our Story' },
    { id: 'time-capsule', label: 'Time Capsule' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen flex flex-col text-[var(--ink)]">
      {/* Variation 14 Scrapbook Top Bar */}
      <header className="sticky top-0 z-30 bg-[var(--bg-canvas)]/95 backdrop-blur-xs border-b-2 border-dashed border-[var(--ink-faint)]">
        <div className="max-w-[1440px] mx-auto px-3.5 sm:px-8 lg:px-10 py-2.5 sm:py-3.5 flex items-center justify-between gap-3 sm:gap-8">
          {/* Zone 1: Gaegu Wordmark */}
          <button
            type="button"
            onClick={() => handleNavigate('home')}
            className="font-gaegu text-3xl sm:text-4xl lg:text-5xl leading-[0.85] tracking-[-0.04em] font-bold text-[var(--ink)] truncate max-w-[190px] sm:max-w-none shrink-0 cursor-pointer text-left"
          >
            {coupleConfig.affectionateLabelOne} &amp;{' '}
            {coupleConfig.affectionateLabelTwo}
          </button>

          {/* Zone 2: Space Mono Navigation Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-6 font-space-mono text-xs uppercase tracking-wider"
          >
            {topBarLinks.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => handleNavigate(link.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeSection === link.id
                    ? 'text-[var(--accent)] font-bold underline underline-offset-8 decoration-2'
                    : 'text-[var(--ink)] opacity-70 hover:opacity-100'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Primary Action + Mobile Drawer Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenUpload()}
              className="scrapbook-btn-primary inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline sm:inline">Upload Memory</span>
              <span className="xs:hidden sm:hidden">Upload</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2 rounded-xl border-2 border-[var(--ink)] bg-[var(--bg-surface)] text-[var(--ink)] cursor-pointer"
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Secondary Section Ribbon for All 8 Scrapbook Tabs */}
      <div className="border-b-2 border-dashed border-[var(--ink-faint)] bg-[var(--bg-surface)]/60">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-8 lg:px-10 py-2 sm:py-2.5 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full font-space-mono text-[10px] sm:text-[11px] uppercase tracking-wider border-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[var(--paper-blue)] text-[var(--ink)] border-[var(--ink)] font-bold'
                      : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--ink)] hover:bg-[var(--bg-surface)]'
                  }`}
                >
                  <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[var(--accent)] shrink-0" />
                  <span className="sm:hidden">{item.shortLabel}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </div>

          <span className="hidden xl:inline font-space-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60 whitespace-nowrap shrink-0">
            {coupleConfig.partnerOneName} &amp; {coupleConfig.partnerTwoName} ·{' '}
            {coupleConfig.funnyLabelOne} &amp; {coupleConfig.funnyLabelTwo}
          </span>
        </div>
      </div>

      {/* Collapsible Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[var(--bg-surface)] border-b-2 border-[var(--ink)] px-3.5 py-3 grid grid-cols-2 gap-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-space-mono text-[11px] uppercase tracking-wider text-left cursor-pointer border-2 ${
                  isActive
                    ? 'bg-[var(--paper-blue)] border-[var(--ink)] font-bold'
                    : 'border-[var(--ink-faint)] text-[var(--text-secondary)] hover:bg-[var(--paper-pink)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                <span className="truncate">{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-3.5 sm:px-8 lg:px-10 py-5 sm:py-8">
        {activeSection === 'home' && (
          <HomeSection
            onNavigate={handleNavigate}
            onOpenUpload={() => handleOpenUpload()}
            onOpenMemory={(mem) => setViewerMemory(mem)}
            onOpenSlideshow={(mems) => setSlideshowMemories(mems)}
          />
        )}

        {activeSection === 'memories' && (
          <MemoriesSection
            onOpenUpload={(albumId) => handleOpenUpload({ albumId })}
            onOpenMemory={(mem) => setViewerMemory(mem)}
            onOpenSlideshow={(mems) => setSlideshowMemories(mems)}
          />
        )}

        {activeSection === 'story' && (
          <StorySection
            onOpenMemory={(mem) => setViewerMemory(mem)}
            onOpenUpload={() => handleOpenUpload()}
          />
        )}

        {activeSection === 'soundtrack' && (
          <SoundtrackSection
            onOpenUploadAudio={() => handleOpenUpload({ soundtrack: true })}
            onOpenMemory={(mem) => setViewerMemory(mem)}
          />
        )}

        {activeSection === 'ling-kong' && (
          <LingKongSection
            onOpenUploadLingKong={() => handleOpenUpload({ lingKong: true })}
            onOpenMemory={(mem) => setViewerMemory(mem)}
          />
        )}

        {activeSection === 'time-capsule' && <TimeCapsuleSection />}

        {activeSection === 'bucket-list' && (
          <BucketListSection onOpenMemory={(mem) => setViewerMemory(mem)} />
        )}

        {activeSection === 'settings' && <SettingsSection />}
      </main>

      {/* Variation 14 Dashed Space Mono Footer */}
      <footer className="w-full border-t-2 border-dashed border-[var(--ink-faint)] mt-8 sm:mt-14">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 font-space-mono text-[0.65rem] uppercase tracking-[0.1em] opacity-60 text-center sm:text-left">
          <div>
            <span>
              {coupleConfig.displayName} · {coupleConfig.partnerOneName} &amp;{' '}
              {coupleConfig.partnerTwoName}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5">
            <button
              type="button"
              onClick={() => handleNavigate('memories')}
              className="hover:text-[var(--accent)] cursor-pointer uppercase"
            >
              Memories
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('time-capsule')}
              className="hover:text-[var(--accent)] cursor-pointer uppercase"
            >
              Time Capsule
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('settings')}
              className="hover:text-[var(--accent)] cursor-pointer uppercase"
            >
              Settings &amp; Backup
            </button>
          </div>
        </div>
      </footer>

      {/* Modals & Overlays */}
      <UploadMemoryModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        defaultAlbumId={uploadDefaultAlbumId}
        defaultIsLingKong={uploadDefaultLingKong}
        defaultIsSoundtrack={uploadDefaultSoundtrack}
      />

      <MediaViewerModal
        memory={
          viewerMemory
            ? memories.find((m) => m.id === viewerMemory.id) || viewerMemory
            : null
        }
        memoriesList={activeMemories}
        onClose={() => setViewerMemory(null)}
        onSelectMemory={(mem) => setViewerMemory(mem)}
      />

      <SlideshowModal
        open={Boolean(slideshowMemories)}
        memories={slideshowMemories || []}
        onClose={() => setSlideshowMemories(null)}
      />

      <ToastRegion toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default function App() {
  return (
    <CoupleProvider>
      <AuthenticatedShell />
    </CoupleProvider>
  );
}
