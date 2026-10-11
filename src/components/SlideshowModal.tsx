import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  X,
  MessageSquare,
} from 'lucide-react';
import { MemoryItem } from '../types/models';
import { formatReadableDate } from '../utils/dateUtils';
import { useCouple } from '../context/CoupleContext';

export const SlideshowModal: React.FC<{
  open: boolean;
  memories: MemoryItem[];
  onClose: () => void;
}> = ({ open, memories, onClose }) => {
  const { userPrefs } = useCouple();
  const [includeVideoAudio, setIncludeVideoAudio] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [intervalSec, setIntervalSec] = useState(5);
  const [showCaptions, setShowCaptions] = useState(true);

  const prefersReducedMotion =
    userPrefs.reducedMotion ||
    (typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const eligibleSlides = memories.filter((m) =>
    includeVideoAudio ? true : m.mediaType === 'photo'
  );

  useEffect(() => {
    if (!open) {
      setIsPlaying(false);
      setCurrentIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !isPlaying || eligibleSlides.length <= 1) return;
    if (prefersReducedMotion) {
      // Do not force auto-advance if reduced motion is active unless user explicitly triggers next
      return;
    }
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % eligibleSlides.length);
    }, intervalSec * 1000);
    return () => clearInterval(timer);
  }, [open, isPlaying, intervalSec, eligibleSlides.length, prefersReducedMotion]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && eligibleSlides.length > 0) {
        setCurrentIndex((prev) => (prev + 1) % eligibleSlides.length);
      }
      if (e.key === 'ArrowLeft' && eligibleSlides.length > 0) {
        setCurrentIndex(
          (prev) => (prev - 1 + eligibleSlides.length) % eligibleSlides.length
        );
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, eligibleSlides.length, onClose]);

  if (!open) return null;

  const currentSlide =
    eligibleSlides[currentIndex] || eligibleSlides[0] || null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Memory Slideshow"
      className="fixed inset-0 z-50 bg-black/95 text-white flex flex-col justify-between p-4 sm:p-6"
    >
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-serif-editorial font-semibold">
            Memory Slideshow
          </h2>
          {eligibleSlides.length > 0 && (
            <span className="text-xs font-mono-tabular text-white/70">
              {currentIndex + 1} of {eligibleSlides.length}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-white/80 cursor-pointer">
            <input
              type="checkbox"
              checked={includeVideoAudio}
              onChange={(e) => {
                setIncludeVideoAudio(e.target.checked);
                setCurrentIndex(0);
              }}
            />
            <span>Include Video/Audio</span>
          </label>

          <select
            value={intervalSec}
            onChange={(e) => setIntervalSec(Number(e.target.value))}
            aria-label="Slideshow speed"
            className="px-2.5 py-1.5 rounded bg-white/10 text-xs text-white border border-white/20"
          >
            <option value={3} className="text-black">
              3s per slide
            </option>
            <option value={5} className="text-black">
              5s per slide
            </option>
            <option value={8} className="text-black">
              8s per slide
            </option>
          </select>

          <button
            type="button"
            onClick={() => setShowCaptions((c) => !c)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs cursor-pointer ${
              showCaptions
                ? 'bg-[var(--accent-blue)] text-white'
                : 'bg-white/10 text-white/70'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Captions
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Exit slideshow"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Slide Stage */}
      <div className="flex-1 flex flex-col items-center justify-center relative my-4 overflow-hidden">
        {!currentSlide ? (
          <p className="text-sm text-white/70">
            No photos available in the current selection for slideshow.
          </p>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            {currentSlide.mediaType === 'photo' ? (
              <img
                src={currentSlide.mediaUrl || currentSlide.thumbnailUrl}
                alt={currentSlide.altText || currentSlide.title}
                referrerPolicy="no-referrer"
                className="max-h-[68vh] max-w-full object-contain rounded-lg transition-opacity duration-200"
              />
            ) : currentSlide.mediaType === 'video' ? (
              <video
                src={currentSlide.mediaUrl}
                controls
                className="max-h-[68vh] max-w-full rounded-lg"
              />
            ) : (
              <div className="p-8 rounded-2xl bg-white/10 text-center space-y-4 max-w-md">
                <p className="text-lg font-serif-editorial">
                  {currentSlide.title}
                </p>
                {currentSlide.mediaUrl && (
                  <audio src={currentSlide.mediaUrl} controls />
                )}
              </div>
            )}

            {showCaptions && (
              <div className="max-w-2xl text-center px-6 py-3 rounded-xl bg-black/65 backdrop-blur-xs space-y-1">
                <p className="text-base font-serif-editorial font-semibold">
                  {currentSlide.title || 'Untitled Memory'} ·{' '}
                  <span className="text-xs font-mono-tabular text-white/75">
                    {formatReadableDate(currentSlide.memoryDate)}
                  </span>
                </p>
                {currentSlide.caption && (
                  <p className="text-xs text-white/85 line-clamp-2">
                    {currentSlide.caption}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-center gap-4 pt-3 border-t border-white/15">
        <button
          type="button"
          disabled={eligibleSlides.length <= 1}
          onClick={() =>
            setCurrentIndex(
              (prev) =>
                (prev - 1 + eligibleSlides.length) % eligibleSlides.length
            )
          }
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <button
          type="button"
          disabled={eligibleSlides.length <= 1 || prefersReducedMotion}
          onClick={() => setIsPlaying((p) => !p)}
          className="px-5 py-2 rounded-lg bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-xs font-medium inline-flex items-center gap-2 cursor-pointer disabled:opacity-40"
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              {prefersReducedMotion ? 'Auto-Play Disabled (Reduced Motion)' : 'Play'}
            </>
          )}
        </button>

        <button
          type="button"
          disabled={eligibleSlides.length <= 1}
          onClick={() =>
            setCurrentIndex((prev) => (prev + 1) % eligibleSlides.length)
          }
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
