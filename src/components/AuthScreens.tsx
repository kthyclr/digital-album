import React from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useCouple } from '../context/CoupleContext';
import { AUTHORIZED_EMAILS } from '../config/coupleConfig';

export const AuthScreens: React.FC = () => {
  const {
    user,
    authLoading,
    isAuthorizedMember,
    signInWithGoogle,
    signOutUser,
  } = useCouple();

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-[var(--ink)]">
        <div className="w-full max-w-md p-10 scrapbook-card text-center space-y-4">
          <div className="w-10 h-10 mx-auto rounded-full border-3 border-[var(--ink)] border-t-[var(--accent)] animate-spin" />
          <h1 className="text-4xl font-gaegu font-bold">
            Verifying Private Sanctuary...
          </h1>
          <p className="text-xs font-space-mono uppercase tracking-widest opacity-60">
            Checking session &amp; couple permissions
          </p>
        </div>
      </div>
    );
  }

  // Unauthorized / Access-Denied State
  if (user && !isAuthorizedMember) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-[var(--ink)]">
        <div className="w-full max-w-xl p-8 md:p-12 scrapbook-card space-y-6 relative">
          <div className="scrapbook-pill bg-[var(--paper-pink)]">
            <ShieldAlert className="w-4 h-4 text-[var(--accent)]" />
            <span>Private Couple Sanctuary · Access Restricted</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-5xl font-gaegu font-bold leading-none">
              This memory space belongs exclusively to Kathy &amp; Austin
            </h1>
            <p className="text-base text-[var(--text-secondary)] leading-relaxed">
              You are currently signed in as{' '}
              <span className="font-space-mono font-bold text-[var(--ink)]">
                {user.email || 'an unverified account'}
              </span>
              , which is not on the authorized couple allowlist. No private
              memories, photos, letters, or settings can be viewed from this
              account.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-[var(--paper-blue)] border-2 border-[var(--ink)] text-xs font-space-mono space-y-1.5">
            <p className="font-bold uppercase tracking-wider">
              Authorized Couple Accounts:
            </p>
            <p>Kathy · {AUTHORIZED_EMAILS[0]}</p>
            <p>Austin · {AUTHORIZED_EMAILS[1]}</p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={signOutUser}
              className="scrapbook-btn-primary inline-flex items-center gap-3 px-7 py-4 text-sm cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out &amp; Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated Sign-In Page — Exact Variation 14 Layout & Aesthetic
  return (
    <div className="min-h-screen grid grid-rows-[auto_1fr_auto] text-[var(--ink)]">
      {/* Header */}
      <header className="px-6 sm:px-12 lg:px-16 py-8 flex items-end justify-between gap-4">
        <div className="font-gaegu text-5xl leading-[0.8] tracking-[-0.04em] font-bold">
          Moly &amp; Love
        </div>
        <div className="font-space-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60 text-right">
          Kathy &amp; Austin · Private Access
        </div>
      </header>

      {/* Main Grid */}
      <main className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 px-6 sm:px-12 lg:px-16 pb-12 items-stretch max-w-[1440px] w-full mx-auto">
        {/* Main Hero Card */}
        <div className="bg-[var(--bg-surface)] border-3 border-[var(--ink)] rounded-[40px] p-8 sm:p-14 flex flex-col justify-between shadow-[12px_12px_0_var(--ink-faint)] relative">
          <span
            aria-hidden="true"
            className="absolute top-8 right-10 text-3xl text-[var(--accent)] select-none"
          >
            ★
          </span>

          <div className="space-y-6">
            <div className="scrapbook-pill">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="var(--accent)"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span>Moly &amp; Love · Ling &amp; Kong</span>
            </div>

            <h1 className="font-gaegu text-[clamp(3.5rem,7.5vw,6.2rem)] leading-[0.85] tracking-[-0.02em] font-bold text-[var(--ink)]">
              Kathy &amp; Austin&apos;s Little Universe
            </h1>

            <p className="text-[1.08rem] leading-[1.6] max-w-[520px] text-[var(--text-secondary)]">
              A quiet, private editorial scrapbook preserving our photographs,
              voice notes, future Time Capsule letters, inside jokes, and
              shared plans—from September 15, 2026 onward.
            </p>
          </div>

          <div className="mt-10 pt-4">
            <button
              type="button"
              onClick={signInWithGoogle}
              className="scrapbook-btn-primary inline-flex items-center gap-3 px-8 py-5 text-base cursor-pointer"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Sign In with Authorized Google Account
            </button>
            <p className="font-space-mono text-[0.65rem] mt-4 opacity-55 leading-relaxed">
              Protected by zero-trust Firestore &amp; Storage security rules.
              Only Kathy and Austin&apos;s verified accounts are granted entry.
            </p>
          </div>
        </div>

        {/* Right Sidebar Tilted Cards */}
        <div className="grid grid-rows-[1.2fr_1fr] gap-8">
          <div className="bg-[var(--paper-blue)] border-3 border-[var(--ink)] rounded-[40px] p-9 flex flex-col justify-center lg:rotate-1 shadow-[8px_8px_0_var(--ink-faint)]">
            <span className="font-space-mono text-[0.65rem] uppercase tracking-wider mb-2 block opacity-75">
              Our Story Begins
            </span>
            <div className="font-gaegu text-5xl leading-none font-bold mb-2">
              Sept 15, 2026
            </div>
            <p className="text-sm opacity-75">
              Kathy (Moly · Kong) &amp; Austin (Love · Ling)
            </p>
          </div>

          <div className="bg-[var(--paper-pink)] border-3 border-[var(--ink)] rounded-[40px] p-8 flex flex-col justify-between lg:-rotate-1 shadow-[8px_8px_0_var(--ink-faint)]">
            <div>
              <span className="font-space-mono text-[0.65rem] uppercase tracking-wider mb-2 block text-[var(--accent)] font-bold">
                Privacy &amp; Security Guarantee
              </span>
              <p className="text-sm opacity-80 leading-relaxed">
                No memories, titles, thumbnails, or letters are loaded before
                your identity is verified against our couple allowlist.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--ink-faint)] flex items-center justify-between font-space-mono text-[0.6rem] uppercase opacity-55">
              <span>Blue &amp; Pink Ed.</span>
              <span>Private</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 sm:px-12 lg:px-16 py-6 border-t-2 border-dashed border-[var(--ink-faint)] flex flex-wrap items-center justify-between gap-4 font-space-mono text-[0.65rem] uppercase tracking-[0.1em] opacity-60">
        <span>Moly &amp; Love: Kathy &amp; Austin&apos;s Digital Memory Album</span>
        <span>Private Firebase Sanctuary</span>
      </footer>
    </div>
  );
};
