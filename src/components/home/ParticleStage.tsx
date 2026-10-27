import { useEffect } from 'react';
import { startParticleStage } from './particleEngine';
import { INF_PATH } from '@/components/layout/Wordmark';

/**
 * Fixed full-screen particle canvas + the HTML overlay (loop labels, "WebL∞p" finale).
 * The home page provides the anchor elements it reads (#heroSec, #anchorHero, #anchorHeroMobile,
 * #anchorCV, #anchorLoop, #anchorLogo) and the hero text pieces (.ph, .hstep).
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
          <span className="who" id="coreWho">Students</span>
          <span className="verb" id="coreVerb">build</span>
          <span className="tag" id="coreTag">real projects</span>
        </div>
        <span className="bead">Students</span>
        <span className="bead">Companies</span>
        <span className="bead">Universities</span>
        <div id="vchips" />
        <div className="stage-fw" id="fw" style={{ opacity: 0 }}>
          <span id="fwL">WebL</span>
          <span id="fwR">p</span>
        </div>
      </div>
      <div id="caption" />
    </>
  );
}
