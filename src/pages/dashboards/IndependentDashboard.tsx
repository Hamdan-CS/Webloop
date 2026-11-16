import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, BadgeCheck, Clock, Inbox, Lightbulb, Loader2, Plus, ThumbsUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { WKpis, WPageHeader } from '@/components/app/ui';
import { useWorkspaceMaybe } from '@/components/app/workspaceContext';
import {
  fetchEndorsementsGiven, fetchProfileProjects, fetchProjectApplicationCount, fetchRecommendationsMade,
  isVerifiedIndependent, requestIndependentVerification,
  type Recommendation, type SkillEndorsement,
} from '@/services/api';
import type { Project } from '@/types';
import { Badge } from '@/components/shared/ui/Badge';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { ToReviewBox } from '@/components/projects/tasks/ToReviewBox';
import { statusLabel, statusTone } from '@/utils/labels';
import { notify } from '@/utils/notify';

const OPEN = ['published', 'recruiting', 'in_progress'];

/** Independent dashboard (Part C): projects, join requests, tasks to review,
 * recommendations and endorsements given, and the "Get verified" card. */
export function IndependentDashboard() {
  const { profile, refreshProfile } = useAuth();
  const ws = useWorkspaceMaybe();
  const [projects, setProjects] = useState<Project[]>([]);
  const [appCounts, setAppCounts] = useState<Record<string, number>>({});
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [endorsed, setEndorsed] = useState<SkillEndorsement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [prs, r, e] = await Promise.all([
        fetchProfileProjects(profile.id, { includeDrafts: true }).catch(() => [] as Project[]),
        fetchRecommendationsMade(profile.id).catch(() => [] as Recommendation[]),
        fetchEndorsementsGiven(profile.id).catch(() => [] as SkillEndorsement[]),
      ]);
      setProjects(prs);
      setRecs(r);
      setEndorsed(e);
      const counts: Record<string, number> = {};
      await Promise.all(prs.map(async (p) => { counts[p.id] = await fetchProjectApplicationCount(p.id).catch(() => 0); }));
      setAppCounts(counts);
      setLoading(false);
    })();
  }, [profile]);

  if (!profile) return null;
  const verified = isVerifiedIndependent(profile);
  const openCount = projects.filter((p) => OPEN.includes(p.status)).length;
  const joinRequests = Object.values(appCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="container-page py-8">
      <WPageHeader
        title={<>{profile.display_name} {verified && <BadgeCheck size={20} className="inline text-accent-400" aria-label="Verified Independent" />}</>}
        subtitle={`${projects.length} project${projects.length !== 1 ? 's' : ''} · ${joinRequests} join request${joinRequests !== 1 ? 's' : ''} · ${recs.length} recommendation${recs.length !== 1 ? 's' : ''}`}
        actions={<>
          {ws && <button type="button" className="w-btn-l" onClick={ws.openPalette}>Search <kbd>⌘K</kbd></button>}
          <Link to={`/creators/${profile.handle}`} className="w-btn-l"><Lightbulb size={15} /> View profile</Link>
          <Link to="/publish" className="w-btn-d"><Plus size={16} /> Publish a project</Link>
        </>}
      />

      <div className="w-grid2">
        <div className="w-col">
          <GetVerifiedCard onRequested={refreshProfile} />
          <ToReviewBox />

          <section className="w-box">
            <div className="w-box-h">
              <b>My projects</b>
              {!verified && <small>{openCount} of 3 open until you're verified</small>}
            </div>
            {loading ? (
              <div className="flex justify-center py-6"><LoopLoader size={24} /></div>
            ) : projects.length === 0 ? (
              <div className="w-inner w-empty">
                <Lightbulb size={22} />
                <span>No projects yet. Share an idea or a research question students can work on.</span>
                <Link to="/publish" className="w-btn-l w-btn-sm"><Plus size={14} /> Publish a project</Link>
              </div>
            ) : (
              <div className="pc-grid grid gap-4 sm:grid-cols-2">
                {projects.map((p) => (
                  <div key={p.id}>
                    <ProjectCard project={p} />
                    <div className="mt-2 flex items-center justify-between gap-2 px-1">
                      <Badge tone={statusTone[p.status]}>{statusLabel[p.status]}</Badge>
                      {appCounts[p.id] > 0 && (
                        <Link to={`/creators/${profile.handle}?tab=applications`} className="sd-link amber">
                          <Inbox size={11} /> {appCounts[p.id]} join request{appCounts[p.id] === 1 ? '' : 's'}
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="w-col">
          <WKpis items={[
            { label: 'Projects', value: projects.length },
            { label: 'Join requests', value: joinRequests },
            { label: 'Recommendations', value: recs.length },
            { label: 'Endorsements', value: endorsed.length },
          ]} />

          <section className="w-box">
            <div className="w-box-h"><b>Recommendations I made</b></div>
            {recs.length === 0 ? (
              <p className="w-muted">Recommend a project to a student from the project page, or a student to a company from their profile.</p>
            ) : (
              <ul className="space-y-2">
                {recs.slice(0, 8).map((r) => (
                  <li key={r.id} className="flex items-start gap-2 text-sm">
                    <ThumbsUp size={14} className="mt-0.5 shrink-0 text-slate-500" />
                    <span className="text-slate-300">
                      {r.kind === 'project_to_student'
                        ? <><b>{r.project?.title ?? 'A project'}</b> to {r.to?.display_name ?? 'a student'}</>
                        : <><b>{r.about?.display_name ?? 'A student'}</b> to {r.to?.display_name ?? 'a company'}</>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="w-box">
            <div className="w-box-h"><b>Endorsements I gave</b></div>
            {endorsed.length === 0 ? (
              <p className="w-muted">Open a student's profile and use “Endorse a skill”.</p>
            ) : (
              <ul className="space-y-2">
                {endorsed.slice(0, 8).map((e) => (
                  <li key={e.id} className="flex items-center gap-2 text-sm text-slate-300">
                    <Award size={14} className="shrink-0 text-slate-500" />
                    <span><b>{e.skill}</b> for {e.to ? <Link to={`/creators/${e.to.handle}`} className="link-accent">{e.to.display_name}</Link> : 'a student'}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/** Approval status: not requested → form; requested → waiting; approved → badge. */
function GetVerifiedCard({ onRequested }: { onRequested: () => Promise<void> | void }) {
  const { profile } = useAuth();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (!profile) return null;

  if (isVerifiedIndependent(profile)) {
    return (
      <section className="w-box">
        <div className="w-box-h"><b className="flex items-center gap-1.5"><BadgeCheck size={16} className="text-accent-400" /> Verified Independent</b></div>
        <p className="w-muted">WebLoop approved your account. Tasks you approve count as verified on students' profiles, and the 3-project limit is gone.</p>
      </section>
    );
  }

  const hasLink = !!(profile.linkedin_url?.trim() || profile.orcid_url?.trim());
  const requested = !!profile.independent_verification_requested_at;

  const send = async () => {
    setBusy(true);
    try {
      await requestIndependentVerification(note);
      notify.success('Request sent. WebLoop will review it.');
      await onRequested();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not send the request');
    }
    setBusy(false);
  };

  return (
    <section className="w-box" aria-labelledby="get-verified-h">
      <div className="w-box-h"><b id="get-verified-h">Get verified</b>{requested && <small className="flex items-center gap-1"><Clock size={12} /> Waiting for review</small>}</div>
      <p className="w-muted">
        Until WebLoop approves you, tasks you approve show on the task but don't count as verified for students, and you can have up to 3 open projects.
      </p>
      {requested ? (
        <p className="mt-2 text-sm text-slate-400">We have your request. You'll get a notification when it's reviewed.</p>
      ) : !hasLink ? (
        <p className="mt-2 text-sm text-signal-amber">
          Add your LinkedIn or ORCID link in <Link to="/settings/profile" className="link-accent">Settings → Profile</Link> first. It's also needed to publish.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          <textarea className="pub-in" rows={3} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Who are you? e.g. Backend engineer, 8 years at a fintech; I mentor students in data engineering." aria-label="Who I am" />
          <button type="button" className="btn btn-primary btn-sm" disabled={busy || note.trim().length < 10} onClick={send}>
            {busy ? <Loader2 size={13} className="animate-spin" /> : <BadgeCheck size={13} />} Ask WebLoop to verify me
          </button>
        </div>
      )}
    </section>
  );
}
