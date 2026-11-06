import { Link } from 'react-router-dom';
import { Users, Star, LayoutDashboard, Trash2, Loader2 } from 'lucide-react';
import type { Project, ProjectStatus } from '@/types';
import { Avatar } from '@/components/shared/ui/Avatar';
import { Button } from '@/components/shared/ui/Button';
import { Select, type SelectOption } from '@/components/shared/ui/Select';
import { statusLabel, projectTypeLabel } from '@/utils/labels';
import { cn } from '@/utils/cn';

export interface ProjectCardManage {
  status: ProjectStatus;
  statusOptions: SelectOption[];
  statusUpdating: boolean;
  onStatusChange: (status: string) => void;
  onDelete: () => void;
  onOverview: () => void;
}

interface ProjectCardProps {
  project: Project;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
  /** When set, renders an owner-management footer (status, overview, delete) inside the card. */
  manage?: ProjectCardManage;
}

const statusClass: Partial<Record<ProjectStatus, string>> = {
  recruiting: 'rb-rec',
  published: 'rb-rec',
  in_progress: 'rb-prog',
  completed: 'rb-done',
};

const ownerRole = (t: Project['project_type']) =>
  t === 'company' ? 'Company' : t === 'university' ? 'University' : t === 'open_source' ? 'Open source' : 'Student';

export function ProjectCard({ project, selected, onClick, manage }: ProjectCardProps) {
  const owner = project.owner;
  const isLink = !onClick;
  const summary = project.summary.length > 96 ? `${project.summary.slice(0, 93)}…` : project.summary;
  const members = project.members?.length ?? 0;
  const contributors = Math.max(members, project.team_size ?? 0);

  const thumbAndBody = (
    <>
      <div className="thumb">
        {project.cover_image_url && (
          <img src={project.cover_image_url} alt="" loading="lazy" width={600} height={400} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        )}
        <div className="corner">
          <div>
            <span className={cn('ref-badge', statusClass[project.status] ?? 'rb-rec')}>{statusLabel[project.status]}</span>
            {project.is_beginner_friendly && <span className="ref-badge rb-rec">Beginner-friendly</span>}
          </div>
          <span className="ref-badge rb-type">{projectTypeLabel[project.project_type].replace(' Project', '')} project</span>
        </div>
      </div>
      <div className="body">
        <h3>{project.title}</h3>
        <p>{summary}</p>
        {project.skills && project.skills.length > 0 && (
          <div className="ref-tags">
            {project.skills.slice(0, 4).map((s) => (
              <span key={s.id} className="ref-tag">{s.name}</span>
            ))}
          </div>
        )}
        <div className="meta">
          <div className="who">
            {owner && <Avatar src={owner.avatar_url} name={owner.display_name} className="!h-[34px] !w-[34px]" />}
            <div>
              {owner?.display_name}
              <small>{ownerRole(project.project_type)}</small>
            </div>
          </div>
          <span title="Contributors"><Users size={15} />{contributors}</span>
          <span className="star" title="Stars"><Star size={15} /><b style={{ color: 'var(--text)', fontWeight: 600 }}>{project.stars_count ?? 0}</b></span>
        </div>
      </div>
    </>
  );

  if (manage) {
    return (
      <article className={cn('pc gal-card-hover', selected && 'pc-selected')} tabIndex={0} aria-label={project.title}>
        <Link to={`/projects/${project.slug}`} className="contents">
          {thumbAndBody}
        </Link>
        <div className="space-y-2.5 border-t border-white/8 px-[18px] pb-[18px] pt-3">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-slate-500">Status</span>
            <Select
              className="flex-1"
              size="sm"
              value={manage.status}
              disabled={manage.statusUpdating}
              onChange={manage.onStatusChange}
              options={manage.statusOptions}
            />
            {manage.statusUpdating && <Loader2 size={12} className="shrink-0 animate-spin text-accent-400" />}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={manage.onOverview}>
              <LayoutDashboard size={13} /> Project overview
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={manage.onDelete} aria-label="Delete project">
              <Trash2 size={13} />
            </Button>
          </div>
        </div>
      </article>
    );
  }

  const inner = (
    <article
      className={cn('pc gal-card-hover', onClick && 'cursor-pointer', selected && 'pc-selected')}
      tabIndex={0}
      aria-label={project.title}
    >
      {thumbAndBody}
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
