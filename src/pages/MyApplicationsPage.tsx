import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, ArrowRight, Clock, CheckCircle2, XCircle, Briefcase } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { fetchMyApplications } from '@/services/api';
import type { Application } from '@/types';
import { statusLabel } from '@/utils/labels';
import { cn } from '@/utils/cn';
import type { ProjectStatus } from '@/types';

const appBadge: Record<Application['status'], string> = { pending: 'rb-prog', accepted: 'rb-rec', declined: 'rb-bad' };
const FILTERS = ['all', 'pending', 'accepted', 'declined'] as const;
const ago = (d: string) => {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
};

export function MyApplicationsPage() {
  const { user, profile } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');

  useEffect(() => {
    if (!profile) return;
    fetchMyApplications(profile.id)
      .then(setApps)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile]);

  if (!user || !profile) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Sign in to view applications</h1>
        <Link to="/signin" className="mt-4 inline-block link-accent">Sign In</Link>
      </div>
    );
  }

  const count = (st: Application['status']) => apps.filter((a) => a.status === st).length;
  const shown = filter === 'all' ? apps : apps.filter((a) => a.status === filter);

  return (
    <div className="container-page pf py-8 max-w-4xl">
      <div className="mb-6">
        <span className="label-overline">Applications</span>
        <h1 className="mt-2 font-display text-3xl font-bold pf-name">Your project applications</h1>
        <p className="mt-2 text-slate-400">Track the status of projects you've applied to join.</p>
      </div>

      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <LoopLoader size={28} />
        </div>
      ) : apps.length === 0 ? (
        <div className="surface pf-card app-empty">
          <span className="pf-ic"><Inbox size={22} /></span>
          <h3 className="pf-h4">No applications yet</h3>
          <p>Find a project you like and apply to join its team. Your applications and their status will show up here.</p>
          <Link to="/explore" className="btn btn-primary">Explore projects <ArrowRight size={14} /></Link>
        </div>
      ) : (
        <>
          <div className="pf-kpis mb-5">
            <div className="pf-kpi"><b>{apps.length}</b><span>Total</span></div>
            <div className="pf-kpi"><b>{count('pending')}</b><span>Pending</span></div>
            <div className="pf-kpi"><b className="c1">{count('accepted')}</b><span>Accepted</span></div>
            <div className="pf-kpi"><b>{count('declined')}</b><span>Declined</span></div>
          </div>
          <div className="pills mb-4">
            {FILTERS.map((f) => (
              <button key={f} type="button" className={cn('pill', filter === f && 'on')} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                <span className="app-n">{f === 'all' ? apps.length : count(f)}</span>
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <div className="surface pf-card app-empty"><p>No {filter} applications.</p></div>
          ) : (
            <ul className="app-list">
              {shown.map((app) => {
                const Icon = app.status === 'accepted' ? CheckCircle2 : app.status === 'declined' ? XCircle : Clock;
                return (
                  <li key={app.id} className="surface pf-card app-row">
                    <span className={cn('app-ic', app.status)}><Icon size={18} /></span>
                    <div className="app-main">
                      {app.project ? (
                        <Link to={`/projects/${app.project.slug}`} className="app-title">{app.project.title}</Link>
                      ) : <span className="app-title">Project</span>}
                      <div className="app-sub">
                        {app.role_title && <span><Briefcase size={12} /> {app.role_title}</span>}
                        {app.project && <span>{statusLabel[app.project.status as ProjectStatus]}</span>}
                        {app.created_at && <span>Applied {ago(app.created_at)}</span>}
                      </div>
                      {app.message && <p className="app-msg">{app.message}</p>}
                    </div>
                    <div className="app-side">
                      <span className={cn('ref-badge', appBadge[app.status])}>{app.status.charAt(0).toUpperCase() + app.status.slice(1)}</span>
                      {app.project && <Link to={`/projects/${app.project.slug}`} className="sd-link">View project <ArrowRight size={12} /></Link>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
