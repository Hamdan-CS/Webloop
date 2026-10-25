import { Link } from 'react-router-dom';
import { Users, GitBranch, MapPin, ArrowUpRight } from 'lucide-react';
import type { Project } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import {
  statusLabel,
  statusTone,
  projectTypeLabel,
  compensationLabel,
  compensationTone,
  difficultyLabel,
} from '@/lib/labels';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: Project;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export function ProjectCard({ project, selected, onClick, compact }: ProjectCardProps) {
  const owner = project.owner;
  const isLink = !onClick;
  const inner = (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-ink-900/60 transition-all duration-300',
        selected
          ? 'border-accent-400/50 shadow-glow'
          : 'border-white/8 hover:border-white/15 hover:bg-ink-850/70',
        onClick && 'cursor-pointer',
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        {project.cover_image_url ? (
          <img
            src={project.cover_image_url}
            alt={project.title}
            className={cn(
              'h-full w-full object-cover transition-transform duration-500',
              'group-hover:scale-[1.04]',
            )}
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-ink-700 to-ink-850" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/20 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge tone={statusTone[project.status]}>{statusLabel[project.status]}</Badge>
          {project.is_beginner_friendly && <Badge tone="accent">Beginner-friendly</Badge>}
        </div>
        <div className="absolute right-3 top-3">
          <span className="rounded-full bg-ink-950/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-300 backdrop-blur-sm">
            {projectTypeLabel[project.project_type]}
          </span>
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-display text-base font-semibold text-white leading-tight line-clamp-2">
            {project.title}
          </h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className={cn('text-sm text-slate-400 leading-relaxed', compact ? 'line-clamp-2' : 'line-clamp-3')}>
          {project.summary}
        </p>

        {project.skills && project.skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {project.skills.slice(0, 4).map((s) => (
              <span key={s.id} className="chip">
                {s.name}
              </span>
            ))}
            {project.skills.length > 4 && (
              <span className="chip">+{project.skills.length - 4}</span>
            )}
          </div>
        )}

        <div className="mt-auto pt-4 flex items-center justify-between gap-2 border-t border-white/5">
          <div className="flex items-center gap-2 min-w-0">
            {owner && (
              <>
                <Avatar src={owner.avatar_url} name={owner.display_name} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-200">{owner.display_name}</p>
                  <p className="text-[10px] text-slate-500">{projectTypeLabel[project.project_type].replace(' Project', '')}</p>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500 shrink-0">
            {project.team_size > 0 && (
              <span className="inline-flex items-center gap-1">
                <Users size={12} /> {project.team_size}
              </span>
            )}
            {!project.is_remote && project.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} />
              </span>
            )}
            {isLink && (
              <ArrowUpRight size={14} className="text-slate-500 group-hover:text-accent-300 transition-colors" />
            )}
          </div>
        </div>

        {!compact && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {project.difficulty && <Badge>{difficultyLabel[project.difficulty]}</Badge>}
            {project.compensation && (
              <Badge tone={compensationTone[project.compensation]}>
                {compensationLabel[project.compensation]}
              </Badge>
            )}
            {project.repo_url && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <GitBranch size={11} /> repo
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );

  if (isLink) {
    return (
      <Link to={`/projects/${project.slug}`} className="block">
        {inner}
      </Link>
    );
  }
  return <div onClick={onClick}>{inner}</div>;
}
