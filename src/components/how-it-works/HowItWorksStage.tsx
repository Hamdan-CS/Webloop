import { useEffect } from 'react';
import { Users, Building2, GraduationCap } from 'lucide-react';
import { startHowItWorksStage } from './howItWorksEngine';

/**
 * Fixed full-screen 3D canvas + tab/HUD overlay for the How It Works page.
 * HowItWorksPage.tsx renders the matching .how-set sections the engine scroll-drives.
 */
export function HowItWorksStage() {
  useEffect(() => startHowItWorksStage(), []);

  return (
    <>
      <canvas id="howgl" aria-hidden="true" />
      <div className="how-veil" aria-hidden="true" />

      <div
        className="how-tabs fixed left-1/2 z-[4] flex -translate-x-1/2 gap-1 rounded-full border border-white/10 bg-ink-900/80 p-1.5 shadow-card backdrop-blur-md"
        role="tablist"
        aria-label="Choose your story"
      >
        <button type="button" role="tab" aria-selected="true" data-mode="student" className="how-tab">
          <Users size={15} /> Student
        </button>
        <button type="button" role="tab" aria-selected="false" data-mode="company" className="how-tab">
          <Building2 size={15} /> Company
        </button>
        <button type="button" role="tab" aria-selected="false" data-mode="university" className="how-tab">
          <GraduationCap size={15} /> University
        </button>
      </div>

      <div
        className="how-hud fixed z-[3] flex flex-wrap justify-end gap-2.5"
        aria-live="polite"
      >
        <span className="rounded-full border border-white/10 bg-ink-900/80 px-3.5 py-2 text-sm font-semibold text-white shadow-card backdrop-blur-md">
          <span id="howHudLabel">Verified tasks</span>: <b id="howCount" className="text-accent-300">0</b>
        </span>
        <span id="howState" className="rounded-full border border-white/10 bg-ink-900/80 px-3.5 py-2 text-sm font-semibold text-slate-300 shadow-card backdrop-blur-md">
          Scroll to begin
        </span>
      </div>
    </>
  );
}
