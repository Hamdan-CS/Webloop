import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import type { Project } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { statusLabel, statusTone } from '@/lib/labels';

const CARD_LAYOUTS = [
  { wrap: 'left-0 top-6 w-[58%]', tilt: 'rotateY(-14deg) rotateX(6deg)', anim: 'webloopFloat1' },
  { wrap: 'right-0 top-0 w-[54%]', tilt: 'rotateY(14deg) rotateX(6deg)', anim: 'webloopFloat2' },
  { wrap: 'left-[18%] bottom-0 w-[54%]', tilt: 'rotateY(-6deg) rotateX(10deg)', anim: 'webloopFloat3' },
];

export function HeroShowcase({ projects }: { projects: Project[] }) {
  const cards = projects.slice(0, 3);
  if (cards.length === 0) return null;

  return (
    <div className="relative mx-auto h-[280px] max-w-xl [perspective:900px] sm:h-[320px]">
      {cards.map((project, i) => {
        const layout = CARD_LAYOUTS[i % CARD_LAYOUTS.length];
        const filled = project.members?.length ?? 0;
        const target = project.team_size || Math.max(filled, 1);
        const pct = Math.min(100, Math.round((filled / target) * 100));
        return (
          <Link
            key={project.id}
            to={`/projects/${project.slug}`}
            style={{ transform: layout.tilt, animation: `${layout.anim} 6s ease-in-out infinite` }}
            className={`webloop-hero-card absolute ${layout.wrap} rounded-2xl border border-white/10 bg-ink-900/90 p-4 shadow-glow backdrop-blur-sm transition-colors hover:border-accent-400/30`}
          >
            <Badge tone={statusTone[project.status]} className="mb-2">
              {statusLabel[project.status]}
            </Badge>
            <p className="font-display text-sm font-semibold text-white line-clamp-1">{project.title}</p>
            <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-1">
              {project.owner?.display_name}
              {project.skills && project.skills.length > 0
                ? ` · ${project.skills.slice(0, 2).map((s) => s.name).join(', ')}`
                : ''}
            </p>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <span className="block h-full rounded-full bg-accent-400" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-500">
              <Users size={10} /> {filled} of {target} spots filled
            </p>
          </Link>
        );
      })}
      <style>{`
        @keyframes webloopFloat1 { 50% { transform: rotateY(-14deg) rotateX(6deg) translateY(-8px); } }
        @keyframes webloopFloat2 { 50% { transform: rotateY(14deg) rotateX(6deg) translateY(-10px); } }
        @keyframes webloopFloat3 { 50% { transform: rotateY(-6deg) rotateX(10deg) translateY(-6px); } }
        @media (prefers-reduced-motion: reduce) {
          .webloop-hero-card { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
