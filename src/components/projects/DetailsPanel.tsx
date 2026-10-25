import { Link } from 'react-router-dom';
import {
  Users,
  MapPin,
  Clock,
  Calendar,
  CheckCircle2,
  Target,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import type { Project } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Rating, NoRating } from '@/components/ui/Rating';
import { useAuthPrompt } from '@/components/auth/AuthPrompt';
import {
  statusLabel,
  statusTone,
  projectTypeLabel,
  compensationLabel,
  compensationTone,
  difficultyLabel,
  creatorTypeLabel,
  relativeDate,
} from '@/lib/labels';

interface DetailsPanelProps {
  project: Project;
  avgRating?: number;
  reviewCount?: number;
}

export function DetailsPanel({ project, avgRating, reviewCount }: DetailsPanelProps) {
  const { prompt } = useAuthPrompt();
  const owner = project.owner;
  const isRecruiting = project.status === 'recruiting';
  const openRoles = project.roles?.filter((r) => r.is_open) ?? [];

  const handleJoin = () => {
    prompt({
      title: 'Join this project',
      reason:
        'Applying to join a project requires a free WebLoop account so the project owner can review your profile and contributions. Guests can browse everything — an account is only needed to apply, contribute, or contact teams.',
      cta: 'Create a free account to apply',
    });
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge tone={statusTone[project.status]}>{statusLabel[project.status]}</Badge>
            {project.difficulty && <Badge>{difficultyLabel[project.difficulty]}</Badge>}
            {project.compensation && (
              <Badge tone={compensationTone[project.compensation]}>
                {compensationLabel[project.compensation]}
              </Badge>
            )}
            {project.is_beginner_friendly && <Badge tone="accent">Beginner-friendly</Badge>}
          </div>
          <h3 className="font-display text-xl font-bold text-white leading-tight">{project.title}</h3>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            {project.summary}
          </p>
        </div>

        {/* Creator card */}
        {owner && (
          <Link
            to={`/creators/${owner.handle}`}
            className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 hover:border-accent-400/30 hover:bg-white/[0.06] transition-all group"
          >
            <Avatar src={owner.avatar_url} name={owner.display_name} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate font-semibold text-white text-sm">{owner.display_name}</p>
                {owner.verified && <CheckCircle2 size={14} className="text-accent-400 shrink-0" />}
              </div>
              <p className="text-xs text-slate-400">{creatorTypeLabel[owner.creator_type]}</p>
              <div className="mt-1">
                {reviewCount && reviewCount > 0 ? (
                  <Rating value={avgRating ?? 0} count={reviewCount} />
                ) : (
                  <NoRating label="New creator" />
                )}
              </div>
            </div>
            <ArrowRight size={16} className="text-slate-500 group-hover:text-accent-300 transition-colors" />
          </Link>
        )}

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <MetaItem icon={<Target size={14} />} label="Type" value={projectTypeLabel[project.project_type]} />
          <MetaItem
            icon={<Users size={14} />}
            label="Team size"
            value={project.team_size > 0 ? `${project.team_size} members` : 'Solo / forming'}
          />
          {project.duration_weeks && (
            <MetaItem icon={<Calendar size={14} />} label="Duration" value={`${project.duration_weeks} weeks`} />
          )}
          {project.time_commitment_hours && (
            <MetaItem icon={<Clock size={14} />} label="Commitment" value={project.time_commitment_hours} />
          )}
          <MetaItem
            icon={<MapPin size={14} />}
            label="Location"
            value={project.is_remote ? 'Remote' : project.location ?? '—'}
          />
          <MetaItem icon={<Calendar size={14} />} label="Published" value={relativeDate(project.published_at)} />
        </div>

        {/* Overview */}
        {project.overview && (
          <div>
            <h4 className="label-overline mb-2">Overview</h4>
            <p className="text-sm leading-relaxed text-slate-300 line-clamp-6">{project.overview}</p>
          </div>
        )}

        {/* Problem */}
        {project.problem && (
          <div>
            <h4 className="label-overline mb-2">Problem</h4>
            <p className="text-sm leading-relaxed text-slate-400 line-clamp-3">{project.problem}</p>
          </div>
        )}

        {/* Skills */}
        {project.skills && project.skills.length > 0 && (
          <div>
            <h4 className="label-overline mb-2.5">Technologies</h4>
            <div className="flex flex-wrap gap-1.5">
              {project.skills.map((s) => (
                <Link
                  key={s.id}
                  to={`/explore?technology=${encodeURIComponent(s.name)}`}
                  className="chip hover:border-accent-400/40 hover:text-accent-200 transition-colors"
                >
                  {s.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Open roles */}
        {openRoles.length > 0 && (
          <div>
            <h4 className="label-overline mb-2.5">Open roles ({openRoles.length})</h4>
            <ul className="space-y-2">
              {openRoles.slice(0, 4).map((r) => (
                <li key={r.id} className="rounded-lg border border-white/8 bg-white/[0.03] p-2.5">
                  <p className="text-sm font-medium text-slate-200">{r.title}</p>
                  {r.description && (
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{r.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Demo banner */}
        {project.is_demo && (
          <div className="rounded-lg border border-signal-amber/20 bg-signal-amber/5 px-3 py-2 text-xs text-signal-amber/90">
            Demo content — sample project for platform preview.
          </div>
        )}
      </div>

      {/* Sticky action footer */}
      <div className="mt-auto border-t border-white/8 bg-ink-900/80 backdrop-blur-sm p-4 space-y-2">
        <Link to={`/projects/${project.slug}`} className="btn-secondary w-full">
          View full project <ArrowRight size={15} />
        </Link>
        {isRecruiting && (
          <Button className="w-full" onClick={handleJoin}>
            <Sparkles size={15} /> {openRoles.length > 0 ? `Apply to Join (${openRoles.length} roles)` : 'Apply to Join'}
          </Button>
        )}
      </div>
    </div>
  );
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-sm font-medium text-slate-200 truncate">{value}</p>
    </div>
  );
}
