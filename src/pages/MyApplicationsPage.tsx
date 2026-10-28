import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Inbox, ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { fetchMyApplications } from '@/lib/api';
import type { Application } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { statusLabel, statusTone as projectStatusTone } from '@/lib/labels';
import type { ProjectStatus } from '@/lib/types';

const appStatusTone: Record<Application['status'], 'default' | 'green' | 'amber' | 'rose'> = {
  pending: 'amber',
  accepted: 'green',
  declined: 'rose',
};

export function MyApplicationsPage() {
  const { user, profile } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="container-page py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-white">Your project applications</h1>
        <p className="mt-2 text-slate-300">Track the status of projects you've applied to join.</p>
      </div>

      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 size={28} className="animate-spin text-accent-400" />
        </div>
      ) : apps.length === 0 ? (
        <div className="surface p-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-white/5 text-slate-500">
            <Inbox size={24} />
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold text-white">No applications yet</h3>
          <p className="mt-2 text-sm text-slate-400">Find a project and apply to join a team.</p>
          <Link to="/explore" className="mt-4 inline-block link-accent text-sm">
            Explore Projects <ArrowRight size={13} className="inline" />
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {apps.map((app) => (
            <li key={app.id} className="surface p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  {app.project && (
                    <Link to={`/projects/${app.project.slug}`} className="font-display text-base font-semibold text-white hover:text-accent-200 transition-colors">
                      {app.project.title}
                    </Link>
                  )}
                  {app.project && (
                    <div className="mt-1 flex items-center gap-2">
                      <Badge tone={projectStatusTone[app.project.status as ProjectStatus]}>{statusLabel[app.project.status as ProjectStatus]}</Badge>
                      <Link to={`/projects/${app.project.slug}`} className="text-[11px] text-accent-300 hover:text-accent-200 inline-flex items-center gap-1">
                        View project <ArrowRight size={10} />
                      </Link>
                    </div>
                  )}
                  {app.role_title && <p className="mt-0.5 text-sm text-slate-400">Applied for: {app.role_title}</p>}
                  {app.message && <p className="mt-2 text-sm text-slate-500 leading-relaxed">{app.message}</p>}
                </div>
                <Badge tone={appStatusTone[app.status]}>
                  {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
