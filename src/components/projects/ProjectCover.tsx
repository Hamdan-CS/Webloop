import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Play, ExternalLink, GitBranch, ChevronLeft, ChevronRight, MousePointerClick } from 'lucide-react';
import type { Project } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { statusLabel, statusTone, projectTypeLabel } from '@/lib/labels';

interface ProjectCoverProps {
  project: Project;
  onPrev?: () => void;
  onNext?: () => void;
  index: number;
  total: number;
}

export function ProjectCover({ project, onPrev, onNext, index, total }: ProjectCoverProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-ink-900"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Layered animated gradient backdrop */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-radial-glow opacity-70" />
        <motion.div
          className="absolute -inset-20 opacity-30"
          style={{
            background:
              'conic-gradient(from 0deg at 50% 50%, rgba(34,211,238,0.25), transparent 30%, rgba(167,139,250,0.2), transparent 60%, rgba(34,211,238,0.25))',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Cover image */}
      <AnimatePresence mode="wait">
        <motion.div
          key={project.id}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          {project.cover_image_url ? (
            <img
              src={project.cover_image_url}
              alt={project.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-ink-700 to-ink-850" />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Gradient scrims for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/30 to-ink-950/40" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink-950/60 via-transparent to-transparent" />

      {/* Top overlay: category + interactive hint */}
      <div className="absolute left-5 top-5 right-5 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusTone[project.status]}>{statusLabel[project.status]}</Badge>
          <span className="rounded-full bg-ink-950/70 px-3 py-1 text-xs font-medium text-slate-200 backdrop-blur-sm border border-white/10">
            {projectTypeLabel[project.project_type]}
          </span>
          {project.category && (
            <span className="rounded-full bg-ink-950/70 px-3 py-1 text-xs font-medium text-slate-300 backdrop-blur-sm border border-white/10">
              {project.category}
            </span>
          )}
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-ink-950/70 px-3 py-1.5 text-[11px] text-slate-400 backdrop-blur-sm border border-white/10">
          <MousePointerClick size={12} /> Interactive preview
        </span>
      </div>

      {/* Bottom overlay: title + actions */}
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
        <AnimatePresence mode="wait">
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight max-w-2xl">
              {project.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm sm:text-base text-slate-300 leading-relaxed line-clamp-2">
              {project.summary}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              {project.demo_url && (
                <a
                  href={project.demo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  <Play size={15} /> Visit Demo
                </a>
              )}
              {project.repo_url && (
                <a
                  href={project.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  <GitBranch size={15} /> Repository
                </a>
              )}
              <Link
                to={`/projects/${project.slug}`}
                className="btn-ghost"
              >
                View Project <ExternalLink size={14} />
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Prev / Next nav */}
      {onPrev && (
        <button
          onClick={onPrev}
          className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-ink-950/70 border border-white/10 text-slate-200 backdrop-blur-sm hover:bg-accent-500 hover:text-ink-950 transition-all opacity-0 group-hover:opacity-100"
          style={{ opacity: hovered ? 1 : 0 }}
          aria-label="Previous project"
        >
          <ChevronLeft size={18} />
        </button>
      )}
      {onNext && (
        <button
          onClick={onNext}
          className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-ink-950/70 border border-white/10 text-slate-200 backdrop-blur-sm hover:bg-accent-500 hover:text-ink-950 transition-all"
          style={{ opacity: hovered ? 1 : 0 }}
          aria-label="Next project"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* Counter */}
      <div className="absolute right-5 top-1/2 -translate-y-1/2 hidden lg:flex flex-col items-center gap-1 text-slate-400">
        <span className="font-mono text-xs text-accent-300">{String(index + 1).padStart(2, '0')}</span>
        <span className="h-12 w-px bg-white/15" />
        <span className="font-mono text-xs">{String(total).padStart(2, '0')}</span>
      </div>
    </div>
  );
}
