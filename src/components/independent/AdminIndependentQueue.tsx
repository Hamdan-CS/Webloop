import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Check, ExternalLink, Flag, X } from 'lucide-react';
import { GlassCard } from '@/design-system';
import { Button } from '@/components/shared/ui/Button';
import { Avatar } from '@/components/shared/ui/Avatar';
import { relativeDate } from '@/utils/labels';
import { notify } from '@/utils/notify';
import {
  adminListContentReports, adminListIndependentRequests, adminResolveContentReport, adminVerifyIndependent,
  type ContentReport, type IndependentRequest,
} from '@/services/api';

/** Admin: "Verified Independent" requests and reports on Independent projects/profiles. */
export function AdminIndependentQueue() {
  const [requests, setRequests] = useState<IndependentRequest[]>([]);
  const [reports, setReports] = useState<ContentReport[]>([]);

  const load = useCallback(() => {
    adminListIndependentRequests().then(setRequests).catch(() => setRequests([]));
    adminListContentReports().then(setReports).catch(() => setReports([]));
  }, []);
  useEffect(load, [load]);

  const decide = async (r: IndependentRequest, approve: boolean) => {
    try {
      await adminVerifyIndependent(r.profile_id, approve);
      notify.success(approve ? `${r.display_name} is now a Verified Independent` : 'Request declined');
      load();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <>
      <section className="mt-6" aria-labelledby="indep-req-h">
        <h2 id="indep-req-h" className="heading text-lg flex items-center gap-2"><BadgeCheck size={16} /> Independent approval requests</h2>
        <div className="mt-3 flex flex-col gap-2">
          {requests.length === 0 ? <p className="text-sm text-slate-500">No requests waiting.</p> : requests.map((r) => (
            <GlassCard key={r.profile_id} raised className="flex flex-wrap items-start gap-3 p-4">
              <Avatar src={r.avatar_url} name={r.display_name} size="md" />
              <div className="min-w-0 flex-1">
                <Link to={`/creators/${r.handle}`} className="text-sm font-semibold text-white hover:underline">{r.display_name}</Link>
                <p className="text-xs text-slate-500">asked {relativeDate(r.requested_at)}</p>
                {r.note && <p className="mt-1 text-sm text-slate-300">{r.note}</p>}
                <div className="mt-1 flex flex-wrap gap-3 text-xs">
                  {r.linkedin_url && <a href={r.linkedin_url} target="_blank" rel="noopener noreferrer" className="link-accent inline-flex items-center gap-1">LinkedIn <ExternalLink size={11} /></a>}
                  {r.orcid_url && <a href={r.orcid_url} target="_blank" rel="noopener noreferrer" className="link-accent inline-flex items-center gap-1">ORCID <ExternalLink size={11} /></a>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => decide(r, true)}><Check size={13} /> Approve</Button>
                <Button size="sm" variant="secondary" onClick={() => decide(r, false)}><X size={13} /> Decline</Button>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="mt-6" aria-labelledby="content-rep-h">
        <h2 id="content-rep-h" className="heading text-lg flex items-center gap-2"><Flag size={16} /> Reported projects and profiles</h2>
        <div className="mt-3 flex flex-col gap-2">
          {reports.length === 0 ? <p className="text-sm text-slate-500">No open reports.</p> : reports.map((r) => (
            <GlassCard key={r.id} raised className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                {r.project_slug
                  ? <Link to={`/projects/${r.project_slug}`} className="text-sm font-semibold text-white hover:underline">Project: {r.project_title}</Link>
                  : <Link to={`/creators/${r.profile_handle}`} className="text-sm font-semibold text-white hover:underline">Profile: {r.profile_name}</Link>}
                <p className="text-xs text-slate-500">by {r.reporter_name} · {relativeDate(r.created_at)}</p>
                {r.reason && <p className="mt-1 text-sm text-slate-300">{r.reason}</p>}
              </div>
              <Button size="sm" variant="secondary" onClick={() => adminResolveContentReport(r.id).then(load).catch(() => notify.error('Could not resolve'))}>
                <Check size={13} /> Mark resolved
              </Button>
            </GlassCard>
          ))}
        </div>
      </section>
    </>
  );
}
