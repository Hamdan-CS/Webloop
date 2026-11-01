import { useEffect } from 'react';
import { startParticleStage } from './particleEngine';
import { INF_PATH } from '@/components/layout/Wordmark';

/**
 * Fixed full-screen particle canvas + its HTML overlay (loop labels, the
 * orbiting role beads + centre text). The finale "WebL[loop]p" wordmark is
 * drawn entirely on the canvas itself (particles + a solid canvas-texture
 * reveal) — there is no separate DOM copy of it.
 * The home page provides the anchor elements it reads (#heroSec,
 * #anchorHero, #anchorHeroMobile, #anchorBuild, #anchorVerify,
 * #anchorFound, #anchorLogo).
 */
export function ParticleStage() {
  useEffect(() => startParticleStage(), []);

  return (
    <>
      <div id="particleGlow" aria-hidden="true" />
      <canvas id="particles" aria-hidden="true" />
      <div className="stage-overlay" aria-hidden="true">
        <div className="stage-core" id="core">
          <svg className="core-inf" viewBox="0 0 64 30" aria-hidden="true">
            <defs>
              <linearGradient id="gCore" x1="0" x2="1">
                <stop offset="0" stopColor="#00827C" />
                <stop offset=".45" stopColor="#CBFFFC" />
                <stop offset="1" stopColor="#FAD1FF" />
              </linearGradient>
            </defs>
            <path stroke="url(#gCore)" pathLength={100} d={INF_PATH} />
            <path className="spark" pathLength={100} d={INF_PATH} />
          </svg>
          <span className="who" id="coreWho">People</span>
          <span className="verb" id="coreVerb">build</span>
          <span className="tag" id="coreTag">real projects</span>
        </div>
      </div>
      {/* Loop labels + role beads are real buttons (not aria-hidden) so clicking or
          tabbing to one pins the centre text to that role — keyboard-reachable. */}
      <button type="button" className="loop-chip" id="chipP" aria-label="Focus on People">People</button>
      <button type="button" className="loop-chip" id="chipC" aria-label="Focus on Companies">Companies</button>
      <button type="button" className="loop-chip" id="chipU" aria-label="Focus on Universities">Universities</button>
      <button type="button" className="bead" aria-label="Focus on People">People</button>
      <button type="button" className="bead" aria-label="Focus on Companies">Companies</button>
      <button type="button" className="bead" aria-label="Focus on Universities">Universities</button>
    </>
  );
}
