import { Link } from 'react-router-dom';
import { Users, Star } from 'lucide-react';
import type { Project, ProjectStatus } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { statusLabel, projectTypeLabel } from '@/lib/labels';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: Project;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

const statusClass: Partial<Record<ProjectStatus, string>> = {
  recruiting: 'rb-rec',
  published: 'rb-rec',
  in_progress: 'rb-prog',
  completed: 'rb-done',
};

const ownerRole = (t: Project['project_type']) =>
  t === 'company' ? 'Company' : t === 'university' ? 'University' : t === 'open_source' ? 'Open source' : 'Student';

export function ProjectCard({ project, selected, onClick }: ProjectCardProps) {
  const owner = project.owner;
  const isLink = !onClick;
  const summary = project.summary.length > 96 ? `${project.summary.slice(0, 93)}…` : project.summary;
  const members = project.members?.length ?? 0;
  const contributors = Math.max(members, project.team_size ?? 0);

  const inner = (
    <article
      className={cn('pc gal-card-hover', onClick && 'cursor-pointer', selected && 'pc-selected')}
      tabIndex={0}
      aria-label={project.title}
    >
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
