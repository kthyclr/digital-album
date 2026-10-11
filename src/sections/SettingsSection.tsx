import React, { useState, useEffect } from 'react';
import {
  Download,
  ShieldCheck,
  Sun,
  Moon,
  Monitor,
  LogOut,
  Save,
  Cake,
  Upload,
  ImageIcon,
  Loader2,
} from 'lucide-react';
import { useCouple } from '../context/CoupleContext';
import { SectionHeader } from '../components/SharedUI';
import {
  updateCoupleConfiguration,
  updateUserPreferences,
} from '../services/coupleDataService';
import { AUTHORIZED_EMAILS } from '../config/coupleConfig';
import { calculateBirthdayInfo } from '../utils/dateUtils';
import { supabase, supabaseBucket, isSupabaseStorageConfigured } from '../lib/supabase';

export const SettingsSection: React.FC = () => {
  const {
    user,
    coupleConfig,
    userPrefs,
    members,
    memories,
    albums,
    milestones,
    letters,
    bucketItems,
    addToast,
    signOutUser,
    patchLocalCoupleConfig,
    patchLocalUserPrefs,
  } = useCouple();

  const [displayName, setDisplayName] = useState(coupleConfig.displayName);
  const [subtitle, setSubtitle] = useState(coupleConfig.subtitle);
  const [partnerOneName, setPartnerOneName] = useState(
    coupleConfig.partnerOneName
  );
  const [partnerTwoName, setPartnerTwoName] = useState(
    coupleConfig.partnerTwoName
  );
  const [affectionateOne, setAffectionateOne] = useState(
    coupleConfig.affectionateLabelOne
  );
  const [affectionateTwo, setAffectionateTwo] = useState(
    coupleConfig.affectionateLabelTwo
  );
  const [funnyOne, setFunnyOne] = useState(coupleConfig.funnyLabelOne);
  const [funnyTwo, setFunnyTwo] = useState(coupleConfig.funnyLabelTwo);
  const [startDate, setStartDate] = useState(
    coupleConfig.relationshipStartDate
  );
  const [partnerOneBirthday, setPartnerOneBirthday] = useState(
    coupleConfig.partnerOneBirthday || ''
  );
  const [partnerTwoBirthday, setPartnerTwoBirthday] = useState(
    coupleConfig.partnerTwoBirthday || ''
  );
  const [timezone, setTimezone] = useState(coupleConfig.timezone);
  const [logoUrl, setLogoUrl] = useState(coupleConfig.logoUrl || '');
  const [maxFileSizeMB, setMaxFileSizeMB] = useState(
    coupleConfig.maxFileSizeMB
  );
  const [trashRetentionDays, setTrashRetentionDays] = useState(
    coupleConfig.trashRetentionDays
  );
  const [savingConfig, setSavingConfig] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('Please select a valid image file (JPEG, PNG, WebP)', 'error');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      addToast('Image file size must be less than 15MB', 'error');
      return;
    }

    if (!isSupabaseStorageConfigured() || !supabase) {
      addToast('Supabase Storage is not configured.', 'error');
      return;
    }

    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
      const storagePath = `couples/kathy-austin-space/branding/logo_${Date.now()}_${cleanName}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(supabaseBucket)
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: pubData } = supabase.storage
        .from(supabaseBucket)
        .getPublicUrl(storagePath);

      const publicUrl = pubData.publicUrl;
      setLogoUrl(publicUrl);
      patchLocalCoupleConfig({ logoUrl: publicUrl });

      // Save to Firestore
      await updateCoupleConfiguration(coupleConfig, { logoUrl: publicUrl });
      addToast('Logo successfully uploaded to Supabase Storage & updated!', 'success');
    } catch (err) {
      console.error('Logo upload error:', err);
      addToast(
        'Failed to upload logo to Supabase',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  useEffect(() => {
    setDisplayName(coupleConfig.displayName);
    setSubtitle(coupleConfig.subtitle);
    setPartnerOneName(coupleConfig.partnerOneName);
    setPartnerTwoName(coupleConfig.partnerTwoName);
    setAffectionateOne(coupleConfig.affectionateLabelOne);
    setAffectionateTwo(coupleConfig.affectionateLabelTwo);
    setFunnyOne(coupleConfig.funnyLabelOne);
    setFunnyTwo(coupleConfig.funnyLabelTwo);
    setStartDate(coupleConfig.relationshipStartDate);
    setPartnerOneBirthday(coupleConfig.partnerOneBirthday || '');
    setPartnerTwoBirthday(coupleConfig.partnerTwoBirthday || '');
    setTimezone(coupleConfig.timezone);
    setLogoUrl(coupleConfig.logoUrl || '');
    setMaxFileSizeMB(coupleConfig.maxFileSizeMB);
    setTrashRetentionDays(coupleConfig.trashRetentionDays);
  }, [coupleConfig]);

  if (!user) return null;

  const p1BirthdayInfo = calculateBirthdayInfo(
    partnerOneBirthday,
    'partnerOne',
    partnerOneName,
    affectionateOne,
    funnyOne
  );

  const p2BirthdayInfo = calculateBirthdayInfo(
    partnerTwoBirthday,
    'partnerTwo',
    partnerTwoName,
    affectionateTwo,
    funnyTwo
  );

  const handleSaveCoupleConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    const nextConfigUpdates = {
      displayName,
      subtitle,
      partnerOneName,
      partnerTwoName,
      affectionateLabelOne: affectionateOne,
      affectionateLabelTwo: affectionateTwo,
      funnyLabelOne: funnyOne,
      funnyLabelTwo: funnyTwo,
      relationshipStartDate: startDate,
      partnerOneBirthday,
      partnerTwoBirthday,
      timezone,
      logoUrl,
      maxFileSizeMB,
      trashRetentionDays,
    };

    // Instant UI update
    patchLocalCoupleConfig(nextConfigUpdates);

    try {
      await updateCoupleConfiguration(coupleConfig, nextConfigUpdates);
      addToast('Saved shared couple configuration & birthdays', 'success');
    } catch (err) {
      addToast(
        'Failed to update settings',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setSavingConfig(false);
    }
  };

  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    const prevTheme = userPrefs.theme;
    // Instant UI theme switch
    patchLocalUserPrefs({ theme });
    try {
      await updateUserPreferences(userPrefs, { theme });
      addToast(`Theme set to ${theme}`, 'info');
    } catch (err) {
      patchLocalUserPrefs({ theme: prevTheme });
      addToast(
        'Failed to save theme preference',
        'error',
        err instanceof Error ? err.message : undefined
      );
    }
  };

  const handleReducedMotionToggle = async (reducedMotion: boolean) => {
    const prevReduced = userPrefs.reducedMotion;
    // Instant UI motion switch
    patchLocalUserPrefs({ reducedMotion });
    try {
      await updateUserPreferences(userPrefs, { reducedMotion });
      addToast(
        reducedMotion
          ? 'Reduced motion enabled'
          : 'Standard restrained motion enabled',
        'info'
      );
    } catch (err) {
      patchLocalUserPrefs({ reducedMotion: prevReduced });
      addToast(
        'Failed to save motion preference',
        'error',
        err instanceof Error ? err.message : undefined
      );
    }
  };

  const handleExportJson = () => {
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      exportedBy: user.email,
      coupleSpace: coupleConfig,
      counts: {
        memories: memories.length,
        albums: albums.length,
        milestones: milestones.length,
        lettersEnvelopeMetadataOnly: letters.length,
        bucketItems: bucketItems.length,
      },
      memories: memories.map((m) => ({
        id: m.id,
        title: m.title,
        caption: m.caption,
        memoryDate: m.memoryDate,
        mediaType: m.mediaType,
        originalFileName: m.originalFileName,
        contentType: m.contentType,
        sizeBytes: m.sizeBytes,
        locationText: m.locationText,
        tags: m.tags,
        albumIds: m.albumIds,
        isLingKong: m.isLingKong,
        lingKongLabel: m.lingKongLabel,
        isSoundtrack: m.isSoundtrack,
        externalSongUrl: m.externalSongUrl,
        soundtrackNotes: m.soundtrackNotes,
        status: m.status,
      })),
      albums,
      milestones,
      // Never leak locked letter bodies in metadata export
      letters: letters.map((l) => ({
        id: l.id,
        title: l.title,
        recipient: l.recipient,
        occasionNote: l.occasionNote,
        unlockDateIso: l.unlockDateIso,
        creatorName: l.creatorName,
      })),
      bucketItems,
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moly-and-love-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addToast(
      'JSON backup file downloaded',
      'success',
      'Contains all memory metadata, albums, milestones, and bucket list items.'
    );
  };

  const handleExportCsv = () => {
    const headers = [
      'ID',
      'Title',
      'MemoryDate',
      'MediaType',
      'Location',
      'Tags',
      'LingKong',
      'Soundtrack',
      'OriginalFileName',
      'SizeBytes',
      'Caption',
    ];
    const escapeCsv = (val: string) =>
      `"${String(val || '').replace(/"/g, '""')}"`;

    const rows = memories.map((m) =>
      [
        escapeCsv(m.id),
        escapeCsv(m.title),
        escapeCsv(m.memoryDate),
        escapeCsv(m.mediaType),
        escapeCsv(m.locationText),
        escapeCsv(m.tags.join('; ')),
        escapeCsv(String(m.isLingKong)),
        escapeCsv(String(m.isSoundtrack)),
        escapeCsv(m.originalFileName),
        escapeCsv(String(m.sizeBytes)),
        escapeCsv(m.caption),
      ].join(',')
    );

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moly-and-love-memories-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addToast('CSV spreadsheet downloaded', 'success');
  };

  return (
    <div className="space-y-10">
      <SectionHeader
        kicker="Settings · Preferences, Privacy & Backup"
        title="Couple Space Configuration & Personal Preferences"
        subtitle="Customize relationship labels, start date, dark mode, accessibility, and export backups of your shared library."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Shared Couple Space Settings Form */}
        <form
          onSubmit={handleSaveCoupleConfig}
          className="lg:col-span-7 p-6 md:p-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-6"
        >
          <div className="border-b border-[var(--border-hairline)] pb-3">
            <h2 className="text-2xl font-serif-editorial font-semibold">
              Shared Couple Space Settings
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Changes here update the shared space for both Kathy and Austin in
              real time.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Album Title
              </label>
              <input
                type="text"
                required
                maxLength={120}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Relationship Subtitle / Welcome Copy
              </label>
              <input
                type="text"
                maxLength={200}
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Partner 1 Name
              </label>
              <input
                type="text"
                required
                maxLength={60}
                value={partnerOneName}
                onChange={(e) => setPartnerOneName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Partner 2 Name
              </label>
              <input
                type="text"
                required
                maxLength={60}
                value={partnerTwoName}
                onChange={(e) => setPartnerTwoName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Affectionate Endearment 1
              </label>
              <input
                type="text"
                required
                maxLength={40}
                value={affectionateOne}
                onChange={(e) => setAffectionateOne(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Affectionate Endearment 2
              </label>
              <input
                type="text"
                required
                maxLength={40}
                value={affectionateTwo}
                onChange={(e) => setAffectionateTwo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Funny Endearment 1
              </label>
              <input
                type="text"
                required
                maxLength={40}
                value={funnyOne}
                onChange={(e) => setFunnyOne(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Funny Endearment 2
              </label>
              <input
                type="text"
                required
                maxLength={40}
                value={funnyTwo}
                onChange={(e) => setFunnyTwo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Relationship Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)] font-mono-tabular"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Couple Timezone
              </label>
              <input
                type="text"
                required
                maxLength={80}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)] font-mono-tabular"
              />
            </div>

            {/* Couple Logo Upload & Preview Section */}
            <div className="sm:col-span-2 p-4 rounded-2xl bg-[var(--paper-pink)]/60 border-2 border-dashed border-[var(--ink)] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[var(--accent)]" />
                  <label className="text-xs font-bold text-[var(--ink)]">
                    Website Couple Logo (Hosted on Supabase Storage)
                  </label>
                </div>
                {logoUrl && (
                  <span className="text-[10px] font-space-mono text-[var(--ink)] font-bold uppercase bg-[var(--paper-yellow)] px-2 py-0.5 rounded-full border border-[var(--ink)]">
                    Active Logo
                  </span>
                )}
              </div>

              <p className="text-[11px] text-[var(--text-secondary)]">
                The round logo displayed on the top navigation bar and scrapbook header. Upload your picture directly to Supabase Storage (<code className="font-mono text-[10px]">digital-album</code> bucket) to make it your permanent logo.
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-1">
                {/* Circular Logo Preview */}
                <div className="relative group shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-[var(--ink)] bg-[var(--paper-pink)] overflow-hidden shadow-xs flex items-center justify-center">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Couple Logo Preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="font-space-mono text-sm font-bold text-[var(--ink)]">M&amp;L</span>
                    )}
                  </div>
                </div>

                {/* Upload & Actions */}
                <div className="flex-1 space-y-2 w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border-2 border-[var(--ink)] shadow-xs transition-all cursor-pointer ${
                        uploadingLogo
                          ? 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] cursor-not-allowed'
                          : 'bg-[var(--paper-yellow)] hover:bg-[var(--paper-pink)] active:translate-y-0.5'
                      }`}
                    >
                      {uploadingLogo ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading to Supabase...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Picture as Logo</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingLogo}
                        onChange={handleLogoFileUpload}
                        className="sr-only"
                      />
                    </label>

                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          const fallbackUrl =
                            'https://ecxdhqmalqtgywsclkqu.supabase.co/storage/v1/object/public/digital-album/couples/kathy-austin-space/branding/couple_logo_1791742767554.jpg';
                          setLogoUrl(fallbackUrl);
                          patchLocalCoupleConfig({ logoUrl: fallbackUrl });
                          updateCoupleConfiguration(coupleConfig, { logoUrl: fallbackUrl });
                          addToast('Reset logo to default picture', 'info');
                        }}
                        className="px-2.5 py-1.5 text-[11px] font-space-mono text-[var(--text-secondary)] hover:text-[var(--ink)] underline cursor-pointer"
                      >
                        Reset Default
                      </button>
                    )}
                  </div>

                  {/* Direct URL Input */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      maxLength={500}
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://... or Supabase public URL"
                      className="w-full px-3 py-1.5 rounded-lg text-[11px] bg-[var(--bg-canvas)] border border-[var(--ink-faint)] font-mono-tabular"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Dedicated Birthdays & Celebrations Block */}
            <div className="sm:col-span-2 pt-4 border-t border-dashed border-[var(--ink-faint)] space-y-3">
              <div className="flex items-center gap-2">
                <Cake className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--ink)]">
                  Birthdays &amp; Celebrations
                </h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Keep track of countdowns, turning ages, and celebration reminders across Home and Our Story.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="p-4 rounded-2xl bg-[var(--paper-pink)] border-2 border-[var(--ink)] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-xs font-bold text-[var(--ink)]">
                      {partnerOneName} ({affectionateOne || 'Moly'})'s Birthday
                    </label>
                    <span className="text-[10px] font-space-mono text-[var(--accent)] font-bold uppercase">
                      Partner 1
                    </span>
                  </div>
                  <input
                    type="date"
                    value={partnerOneBirthday}
                    onChange={(e) => setPartnerOneBirthday(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--bg-surface)] border-2 border-[var(--ink)] font-mono-tabular"
                  />
                  {p1BirthdayInfo ? (
                    <div className="text-[11px] font-space-mono text-[var(--ink)] pt-1 flex items-center justify-between">
                      <span className="font-semibold">
                        {p1BirthdayInfo.isToday ? '🎉 Today is their birthday!' : `In ${p1BirthdayInfo.daysUntil} days`}
                      </span>
                      <span className="text-[var(--accent)] font-bold">
                        {p1BirthdayInfo.turningAge ? `Turning ${p1BirthdayInfo.turningAge}` : p1BirthdayInfo.nextBirthdayFormatted}
                      </span>
                    </div>
                  ) : (
                    <p className="text-[10px] font-space-mono text-[var(--text-muted)]">
                      Select date to enable birthday countdown
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-[var(--paper-blue)] border-2 border-[var(--ink)] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-xs font-bold text-[var(--ink)]">
                      {partnerTwoName} ({affectionateTwo || 'Love'})'s Birthday
                    </label>
                    <span className="text-[10px] font-space-mono text-[var(--ink)] font-bold uppercase">
                      Partner 2
                    </span>
                  </div>
                  <input
                    type="date"
                    value={partnerTwoBirthday}
                    onChange={(e) => setPartnerTwoBirthday(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--bg-surface)] border-2 border-[var(--ink)] font-mono-tabular"
                  />
                  {p2BirthdayInfo ? (
                    <div className="text-[11px] font-space-mono text-[var(--ink)] pt-1 flex items-center justify-between">
                      <span className="font-semibold">
                        {p2BirthdayInfo.isToday ? '🎉 Today is their birthday!' : `In ${p2BirthdayInfo.daysUntil} days`}
                      </span>
                      <span className="text-[var(--accent)] font-bold">
                        {p2BirthdayInfo.turningAge ? `Turning ${p2BirthdayInfo.turningAge}` : p2BirthdayInfo.nextBirthdayFormatted}
                      </span>
                    </div>
                  ) : (
                    <p className="text-[10px] font-space-mono text-[var(--text-muted)]">
                      Select date to enable birthday countdown
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Max Upload File Size (MB)
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={maxFileSizeMB}
                onChange={(e) => setMaxFileSizeMB(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)] font-mono-tabular"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Trash Retention Period (Days)
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={trashRetentionDays}
                onChange={(e) => setTrashRetentionDays(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-subtle)] border border-[var(--border-hairline)] font-mono-tabular"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingConfig}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-medium bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)] cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {savingConfig ? 'Saving...' : 'Save Couple Configuration'}
            </button>
          </div>
        </form>

        {/* Right Column: Personal Theme, Export Backup & Privacy */}
        <div className="lg:col-span-5 space-y-6">
          {/* Personal Display & Accessibility Preferences */}
          <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-4">
            <h2 className="text-xl font-serif-editorial font-semibold">
              Personal Appearance &amp; Accessibility
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Stored in your personal profile (`users/{user.uid.slice(0, 6)}.../preferences`)
              so your theme choice never overwrites your partner&apos;s.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'light', label: 'Light Editorial', icon: Sun },
                  { id: 'dark', label: 'Dark Mode', icon: Moon },
                  { id: 'system', label: 'System', icon: Monitor },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                const active = userPrefs.theme === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleThemeChange(item.id)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                      active
                        ? 'bg-[var(--bg-powder-blue)] border-[var(--accent-blue)] text-[var(--text-primary)]'
                        : 'bg-[var(--bg-subtle)] border-[var(--border-hairline)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <label className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--border-hairline)] text-xs cursor-pointer">
              <div>
                <p className="font-medium text-[var(--text-primary)]">
                  Reduce Motion &amp; Disable Auto-Slideshow
                </p>
                <p className="text-[var(--text-muted)]">
                  Disables hover lifts and automatic slide transitions.
                </p>
              </div>
              <input
                type="checkbox"
                checked={userPrefs.reducedMotion}
                onChange={(e) => handleReducedMotionToggle(e.target.checked)}
                className="w-4 h-4"
              />
            </label>
          </div>

          {/* Data Export & Backup */}
          <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-4">
            <h2 className="text-xl font-serif-editorial font-semibold">
              Export &amp; Backup Archive
            </h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Export your complete library metadata (memories, captions, tags,
              custom albums, timeline milestones, and bucket list) in JSON or
              CSV format. Because browsers restrict multi-gigabyte ZIP creation
              in memory, download original high-resolution media directly from
              the media viewer alongside your metadata archive.
            </p>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export Full Backup (JSON)
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-powder-pink)] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export Memories (CSV)
              </button>
            </div>
          </div>

          {/* Privacy, Authorized Members & Session */}
          <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-4">
            <div className="flex items-center gap-2 text-[var(--accent-blue)]">
              <ShieldCheck className="w-5 h-5" />
              <h2 className="text-xl font-serif-editorial font-semibold text-[var(--text-primary)]">
                Privacy &amp; Authorized Access
              </h2>
            </div>

            <div className="text-xs text-[var(--text-secondary)] space-y-1.5">
              <p>
                Signed in as:{' '}
                <strong className="font-mono-tabular text-[var(--text-primary)]">
                  {user.email}
                </strong>
              </p>
              <p>
                Allowlisted Couple Emails:{' '}
                <span className="font-mono-tabular">
                  {AUTHORIZED_EMAILS.join(' · ')}
                </span>
              </p>
              {members.length > 0 && (
                <p>
                  Active Joined Members:{' '}
                  {members.map((m) => `${m.displayName} (${m.endearment})`).join(', ')}
                </p>
              )}
              <p className="text-[11px] text-[var(--text-muted)] pt-1">
                Note: Signing out or deleting an individual user session does
                not delete your shared couple space or its memories.
              </p>
            </div>

            <button
              type="button"
              onClick={signOutUser}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border border-[var(--border-hairline)] text-rose-600 hover:bg-rose-500/10 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out of This Device
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
