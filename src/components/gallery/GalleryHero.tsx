import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Boxes, Code2, Compass, Laptop2, Smartphone, Sparkles, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { PortfolioItem } from '@/types';
import { GalleryHeroArt } from './GalleryHeroArt';

export type GalleryChipId = 'all' | 'web' | 'mobile' | 'data' | 'design' | 'other';

interface ChipDef {
  id: GalleryChipId;
  label: string;
  icon: LucideIcon;
  match: (category: string | null | undefined) => boolean;
}

const KNOWN_CATEGORIES = ['Web App', 'Mobile App', 'ML', 'Design / UI'];

export const GALLERY_CHIPS: ChipDef[] = [
  { id: 'all', label: 'All Works', icon: Compass, match: () => true },
  { id: 'web', label: 'Web Apps', icon: Laptop2, match: (c) => c === 'Web App' },
  { id: 'mobile', label: 'Mobile Apps', icon: Smartphone, match: (c) => c === 'Mobile App' },
  { id: 'data', label: 'Data & AI', icon: Boxes, match: (c) => c === 'ML' },
  { id: 'design', label: 'Design & UX', icon: Sparkles, match: (c) => c === 'Design / UI' },
  { id: 'other', label: 'Other', icon: Code2, match: (c) => !c || !KNOWN_CATEGORIES.includes(c) },
];

export function matchesGalleryChip(item: PortfolioItem, chipId: GalleryChipId): boolean {
  const chip = GALLERY_CHIPS.find((c) => c.id === chipId);
  return chip ? chip.match(item.category) : true;
}

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Compass, title: 'Project Showcase', body: 'Browse real student work across different fields.' },
  { icon: Sparkles, title: 'Get Inspired', body: 'Discover ideas, tech stacks, and creative solutions.' },
  { icon: Users, title: 'Support Creators', body: 'Like, save, and connect with student builders.' },
];

interface Props {
  activeChip: GalleryChipId;
  onSelectChip: (id: GalleryChipId) => void;
  items: PortfolioItem[];
  loading: boolean;
  onOpenItem: (item: PortfolioItem) => void;
}

export function GalleryHero({ activeChip, onSelectChip, items, loading, onOpenItem }: Props) {
  const reduce = useReducedMotion();

  const webItem = useMemo(() => items.find((i) => i.category === 'Web App') ?? items[0], [items]);
  const mobileItem = useMemo(() => items.find((i) => i.category === 'Mobile App') ?? items[1] ?? items[0], [items]);
  const dataItem = useMemo(() => items.find((i) => i.category === 'ML') ?? items[2] ?? items[0], [items]);

  return (
    <div className="gal-hero-sec">
      <div className="gal-hero-wrap">
        <motion.div
          className="gal-hero-copy"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="sec-hd" style={{ marginBottom: 0 }}>
            <h1 className="gal-title">Student work <span className="hl">gallery</span></h1>
            <p className="gal-sub">
              A curated showcase of student projects, from web and mobile apps to data, AI, and design —
              explore, get inspired, and support student creators.
            </p>
          </div>

          <motion.div
            className="gal-features"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.08, delayChildren: reduce ? 0 : 0.2 } } }}
          >
            {FEATURES.map((f) => (
              <motion.div
                key={f.title}
                className="gal-feature"
                variants={{
                  hidden: { opacity: 0, y: reduce ? 0 : 12 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
                }}
              >
                <span className="gal-feature-icon"><f.icon size={18} /></span>
                <div>
                  <h4>{f.title}</h4>
                  <p>{f.body}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          className="gal-hero-art-wrap"
          initial={reduce ? false : { opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: reduce ? 0 : 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          {loading ? (
            <div className="hero2d">
              <div className="gal-art-glow" aria-hidden="true" />
            </div>
          ) : (
            <GalleryHeroArt
              webItem={webItem}
              mobileItem={mobileItem}
              dataItem={dataItem}
              reduced={!!reduce}
              onOpen={onOpenItem}
            />
          )}
        </motion.div>
      </div>

      <div className="filter-chip-row" role="group" aria-label="Filter by category">
        {GALLERY_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={cn('filter-chip', activeChip === chip.id && 'on')}
            aria-pressed={activeChip === chip.id}
            onClick={() => onSelectChip(chip.id)}
          >
            <chip.icon size={15} />
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
