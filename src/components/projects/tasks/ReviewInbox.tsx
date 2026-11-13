import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import type { Project } from '@/types';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { SubmissionReview } from './SubmissionReview';
import { useProjectTasks } from './useProjectTasks';
import './project-page.css';

/*
 * Review inbox (messages drawer + company dashboard): only work that is
 * waiting for your review, across your projects, reviewed in place with the
 * same SubmissionReview form. Creating, assigning and deleting tasks live in
 * each project's Tasks section, linked from every group.
 */
export function ReviewInbox({ projects, profileId, compact, onChange }: { projects: Project[]; profileId: string; compact?: boolean; onChange?: () => void }) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [ready, setReady] = useState<Record<string, boolean>>({});
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const allReady = projects.every((p) => ready[p.id]);
  // a review clears an item: let the page refresh its own counts
  const prev = useRef<number | null>(null);
  useEffect(() => {
    if (!allReady) return;
    if (prev.current !== null && total < prev.current) onChange?.();
    prev.current = total;
  }, [total, allReady, onChange]);

  return (
    <div className={compact ? 'w-ri w-ri-compact' : 'w-ri'}>
      {projects.map((p) => (
        <ProjectReviews
          key={p.id}
          project={p}
          profileId={profileId}
          onCount={(n) => { setCounts((c) => (c[p.id] === n ? c : { ...c, [p.id]: n })); setReady((r) => (r[p.id] ? r : { ...r, [p.id]: true })); }}
        />
      ))}
      {!allReady && <div className="flex justify-center py-8"><LoopLoader size={22} /></div>}
      {allReady && total === 0 && (
        <div className="w-ri-none">
          <CheckCircle2 size={22} />
          <b>Nothing to review</b>
          <span>Submitted work from your teams shows up here. Manage tasks from each project’s Tasks tab.</span>
        </div>
      )}
    </div>
  );
}

function ProjectReviews({ project, profileId, onCount }: { project: Project; profileId: string; onCount: (n: number) => void }) {
  const api = useProjectTasks(project.id, profileId);
  const waiting = api.tasks.filter((t) => t.status === 'submitted');
  useEffect(() => { if (!api.loading) onCount(waiting.length); }, [api.loading, waiting.length, onCount]);
  if (api.loading || waiting.length === 0) return null;

  return (
    <section className="w-ri-group">
      <header>
        <b>{project.title}</b>
        <Link to={`/projects/${project.slug}`} className="w-ri-open">Open project tasks <ArrowRight size={13} /></Link>
      </header>
      {waiting.map((t) => (
        <div key={t.id} className="w-ri-task">
          <b>{t.title}</b>
          {(t.submissions ?? []).filter((s) => s.status === 'pending').map((s) => (
            <SubmissionReview key={s.id} submission={s} taskId={t.id} onReview={api.review} busy={api.reviewing === s.id} />
          ))}
        </div>
      ))}
    </section>
  );
}
