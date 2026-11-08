import { useRef } from 'react';
import { Boxes, Code2, Smartphone, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PortfolioItem } from '@/types';
import { cn } from '@/utils/cn';

type CardKind = 'code' | 'mobile' | 'chart';

interface Props {
  webItem: PortfolioItem | undefined;
  mobileItem: PortfolioItem | undefined;
  dataItem: PortfolioItem | undefined;
  reduced: boolean;
  onOpen: (item: PortfolioItem) => void;
}

/** 2D hero illustration — a hand-authored SVG laptop plus three independently
 * floating, clickable project cards (plain HTML/CSS/SVG layers, no images or
 * WebGL). Mouse position drives a subtle parallax via CSS custom properties
 * (--px/--py) set on pointer move; each layer reads them with its own
 * multiplier for a cheap depth illusion. */
export function GalleryHeroArt({ webItem, mobileItem, dataItem, reduced, onOpen }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.PointerEvent) => {
    if (reduced || e.pointerType !== 'mouse' || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    wrapRef.current.style.setProperty('--px', px.toFixed(3));
    wrapRef.current.style.setProperty('--py', py.toFixed(3));
  };
  const resetMove = () => {
    wrapRef.current?.style.setProperty('--px', '0');
    wrapRef.current?.style.setProperty('--py', '0');
  };

  return (
    <div
      ref={wrapRef}
      className={cn('hero2d', reduced && 'reduced')}
      onPointerMove={handleMove}
      onPointerLeave={resetMove}
    >
      <div className="gal-art-glow" aria-hidden="true" />

      <div className="hero2d-laptop">
        <div className="hero2d-laptop-float">
          <LaptopIllustration />
        </div>
      </div>

      <HeroCard pos="a" kind="code" accent="#22d3ee" icon={Code2} item={webItem} onOpen={onOpen} />
      <HeroCard pos="b" kind="mobile" accent="#8b5cf6" icon={Smartphone} item={mobileItem} onOpen={onOpen} />
      <HeroCard pos="c" kind="chart" accent="#3b82f6" icon={Boxes} item={dataItem} onOpen={onOpen} />

      <div className="hero2d-icon-wrap spark">
        <span className="hero2d-icon" aria-hidden="true"><Zap size={14} /></span>
      </div>
    </div>
  );
}

function HeroCard({
  pos,
  kind,
  accent,
  icon: Icon,
  item,
  onOpen,
}: {
  pos: 'a' | 'b' | 'c';
  kind: CardKind;
  accent: string;
  icon: LucideIcon;
  item: PortfolioItem | undefined;
  onOpen: (item: PortfolioItem) => void;
}) {
  return (
    <div className={cn('hero2d-card-wrap', `pos-${pos}`)}>
      <div className="hero2d-card-float">
        <button
          type="button"
          className="hero2d-card"
          onClick={() => item && onOpen(item)}
          disabled={!item}
          aria-label={item ? `Open ${item.title}` : 'No matching project yet'}
        >
          <span className={cn('hero2d-card-face', `k-${kind}`)} aria-hidden="true">
            {kind === 'code' && (
              <>
                <i className="l1" />
                <i className="l2" />
                <i className="l3" />
              </>
            )}
            {kind === 'chart' && (
              <svg viewBox="0 0 100 44" preserveAspectRatio="none">
                <polyline
                  points="0,36 16,26 34,30 52,10 70,18 100,4"
                  fill="none"
                  stroke={accent}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            {kind === 'mobile' && (
              <>
                <span className="ph p1" />
                <span className="ph p2" />
              </>
            )}
          </span>
          <span className="hero2d-card-badge" style={{ background: accent }} aria-hidden="true">
            <Icon size={13} />
          </span>
          {item && <span className="hero2d-card-label">{item.title}</span>}
        </button>
      </div>
    </div>
  );
}

/** Flat 2D laptop — plain SVG shapes (no fake-3D gradients/bevels), crisp at
 * any size, with a small mock "project gallery" UI drawn on the screen. */
function LaptopIllustration() {
  return (
    <svg viewBox="0 0 440 300" className="hero2d-laptop-svg" aria-hidden="true">
      <defs>
        <linearGradient id="hero2dMtn" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="hero2dBase" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e4e9f2" />
          <stop offset="100%" stopColor="#c7cedb" />
        </linearGradient>
      </defs>

      <path d="M48 246 L392 246 L412 272 L28 272 Z" fill="url(#hero2dBase)" />
      <rect x="192" y="248" width="56" height="7" rx="3.5" fill="#9aa5b8" />

      <rect x="86" y="26" width="268" height="190" rx="16" fill="#101728" />
      <rect x="98" y="38" width="244" height="166" rx="8" fill="#eef3ff" />

      <rect x="110" y="50" width="54" height="7" rx="3.5" fill="#c6d0e4" />
      <circle cx="326" cy="53" r="6" fill="#22d3ee" />

      <rect x="110" y="66" width="140" height="92" rx="8" fill="#dde7fb" />
      <polygon points="118,150 150,108 172,132 198,88 242,150" fill="url(#hero2dMtn)" opacity="0.92" />

      <circle cx="264" cy="76" r="6" fill="#c6d0e4" />
      <rect x="258" y="88" width="72" height="6" rx="3" fill="#c6d0e4" />
      <rect x="258" y="100" width="56" height="6" rx="3" fill="#c6d0e4" />
      <rect x="258" y="112" width="64" height="6" rx="3" fill="#c6d0e4" />

      <rect x="110" y="166" width="38" height="28" rx="7" fill="#c7d6ff" />
      <rect x="156" y="166" width="38" height="28" rx="7" fill="#d9c7ff" />
      <rect x="202" y="166" width="38" height="28" rx="7" fill="#c7ecff" />
    </svg>
  );
}
