import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { fetchProjects, fetchCompanies } from '@/services/api';
import { getDashboardPath } from '@/utils/roles';
import type { Profile, Project } from '@/types';
import { useTabs } from './tabs/tabsContext';
import { tabMeta } from './tabs/tabMeta';
import { useWorkspace, projectDot } from './workspaceContext';
import { WIcon, type IconName } from './icons';
import { WAvatar } from './ui';

type Hit = { key: string; label: string; sub: string; to: string; icon?: IconName; dot?: string; avatar?: { name: string; src?: string | null } };

/**
 * New tab (brief §4): a large soft card with a sparkle and one big input that
 * searches pages, projects and people and opens the result in this tab;
 * grid/list toggle; quick links, recently closed (click to reopen) and your
 * projects below. People search uses what the app already loads (companies
 * plus owners/members of matching projects) — there is no people query yet.
 */
export function NewTabPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { closed, reopenClosed } = useTabs();
  const { projects, openMessages } = useWorkspace();
  const [q, setQ] = useState('');
  const [view, setView] = useState<'grid' | 'list'>(() => { try { return (localStorage.getItem('wl_newtab_view') as 'grid' | 'list') || 'grid'; } catch { return 'grid'; } });
  const [found, setFound] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Profile[]>([]);
  const inRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inRef.current?.focus(); fetchCompanies().then(setCompanies).catch(() => {}); }, []);
  useEffect(() => { try { localStorage.setItem('wl_newtab_view', view); } catch { /* ignore */ } }, [view]);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setFound([]); return; }
    const id = window.setTimeout(() => { fetchProjects({ search: term }).then((r) => setFound(r.slice(0, 8))).catch(() => setFound([])); }, 220);
    return () => window.clearTimeout(id);
  }, [q]);

  const home = profile ? getDashboardPath(profile.creator_type) : '/feed';
  const quick: Hit[] = [
    { key: 'home', label: 'Home', sub: 'Your dashboard', to: home, icon: 'home' },
    { key: 'feed', label: 'Feed', sub: 'What people are building', to: '/feed', icon: 'feed' },
    { key: 'proj', label: 'Projects', sub: 'Yours and joined', to: '/my-projects', icon: 'proj' },
    { key: 'expl', label: 'Explore', sub: 'Briefs and student projects', to: '/explore', icon: 'expl' },
    { key: 'msg', label: 'Messages', sub: 'Conversations', to: '#messages', icon: 'msg' },
    { key: 'port', label: 'Portfolio', sub: 'Your verified work', to: profile ? `/creators/${profile.handle}` : '/settings', icon: 'port' },
  ];
  const pages: Hit[] = [
    ...quick,
    { key: 'gal', label: 'Student work', sub: 'Gallery', to: '/gallery', icon: 'expl' },
    { key: 'cos', label: 'Companies', sub: 'Who posts briefs', to: '/companies', icon: 'expl' },
    { key: 'pub', label: 'Publish a project', sub: 'New brief or project', to: '/publish', icon: 'plus' },
    { key: 'app', label: 'Applications', sub: 'Where you applied', to: '/my-applications', icon: 'proj' },
    { key: 'inv', label: 'Invitations', sub: 'Teams that invited you', to: '/my-invitations', icon: 'msg' },
    { key: 'set', label: 'Settings', sub: 'Account and profile', to: '/settings', icon: 'gear' },
  ];

  const results = useMemo<Hit[]>(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    const pageHits = pages.filter((p) => `${p.label} ${p.sub}`.toLowerCase().includes(t));
    const mine = projects.filter((p) => p.title.toLowerCase().includes(t));
    const projHits = [...mine, ...found.filter((f) => !mine.some((m) => m.id === f.id))].slice(0, 8)
      .map((p) => ({ key: `p-${p.id}`, label: p.title, sub: `Project · ${p.category ?? String(p.project_type)}`, to: `/projects/${p.slug}`, dot: projectDot(p.slug) }));
    const people = new Map<string, Hit>();
    const addPerson = (pr?: Partial<Profile> | null, role?: string) => {
      if (!pr?.handle || !pr.display_name || people.has(pr.handle)) return;
      if (!`${pr.display_name} ${pr.handle}`.toLowerCase().includes(t)) return;
      people.set(pr.handle, { key: `u-${pr.handle}`, label: pr.display_name, sub: role ?? 'Person', to: `/creators/${pr.handle}`, avatar: { name: pr.display_name, src: pr.avatar_url } });
    };
    companies.forEach((c) => addPerson(c, 'Company'));
    [...found, ...projects].forEach((p) => {
      const x = p as unknown as { owner?: Profile; members?: { profile?: Profile }[] };
      addPerson(x.owner, 'Project owner');
      x.members?.forEach((m) => addPerson(m.profile, 'Member'));
    });
    return [...pageHits, ...projHits, ...[...people.values()].slice(0, 6)];
    // pages are rebuilt each render from stable inputs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, found, projects, companies]);

  const go = (h: Hit) => { if (h.to === '#messages') { openMessages(); return; } navigate(h.to); };
  const Item = ({ h }: { h: Hit }) => (
    <button type="button" className="w-nt-item" onClick={() => go(h)}>
      <span className="w-nt-ic">{h.avatar ? <WAvatar name={h.avatar.name} src={h.avatar.src} size={28} /> : h.dot ? <i className="w-ws-dot" style={{ background: h.dot }} /> : h.icon ? <WIcon name={h.icon} size={18} /> : null}</span>
      <span className="w-nt-tx"><b>{h.label}</b><small>{h.sub}</small></span>
    </button>
  );

  return (
    <div className="w-view w-nt">
      <div className="w-nt-card">
        <div className="w-nt-tools" role="group" aria-label="Layout">
          <button type="button" className={view === 'grid' ? 'w-on' : ''} aria-pressed={view === 'grid'} aria-label="Grid" onClick={() => setView('grid')}><WIcon name="grid" size={16} /></button>
          <button type="button" className={view === 'list' ? 'w-on' : ''} aria-pressed={view === 'list'} aria-label="List" onClick={() => setView('list')}><WIcon name="list" size={16} /></button>
        </div>
        <span className="w-nt-spark" aria-hidden="true"><WIcon name="spark" size={26} /></span>
        <input
          ref={inRef}
          className="w-nt-in"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && results[0]) go(results[0]); }}
          placeholder="Search projects, people, or type a page…"
          aria-label="Search projects, people, or type a page"
        />
        {q.trim() && (
          <div className={`w-nt-res is-${view}`}>
            {results.length ? results.map((h) => <Item key={h.key} h={h} />) : <p className="w-nt-empty">Nothing yet for “{q}”. Try a project name or a page like “Feed”.</p>}
          </div>
        )}
      </div>

      <section className="w-nt-sec">
        <h2>Quick links</h2>
        <div className={`w-nt-grid is-${view}`}>{quick.map((h) => <Item key={h.key} h={h} />)}</div>
      </section>

      {!!closed.length && (
        <section className="w-nt-sec">
          <h2>Recently closed</h2>
          <div className={`w-nt-grid is-${view}`}>
            {closed.map((p) => { const m = tabMeta(p, projects, profile?.handle); return (
              <button key={p} type="button" className="w-nt-item" onClick={() => reopenClosed(p)}>
                <span className="w-nt-ic">{m.dot ? <i className="w-ws-dot" style={{ background: m.dot }} /> : <WIcon name="clock" size={18} />}</span>
                <span className="w-nt-tx"><b>{m.title}</b><small>{p}</small></span>
              </button>
            ); })}
          </div>
        </section>
      )}

      {!!projects.length && (
        <section className="w-nt-sec">
          <h2>Your projects</h2>
          <div className={`w-nt-grid is-${view}`}>{projects.slice(0, 8).map((p) => <Item key={p.id} h={{ key: p.id, label: p.title, sub: String(p.status ?? '').replace(/_/g, ' ') || 'Project', to: `/projects/${p.slug}`, dot: projectDot(p.slug) }} />)}</div>
        </section>
      )}
    </div>
  );
}
