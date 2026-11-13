import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, ChevronDown, Settings2, UserRound } from 'lucide-react';
import type { Task } from '@/types';
import { WAvatar } from '@/components/app/ui';
import { useReducedMotion } from '@/design-system/motion/useReducedMotion';
import { cn } from '@/utils/cn';

/*
 * The project's task board (workspace look): three columns sized to their
 * cards, a coloured status dot and count per column, and cards you can open
 * to read the details. Team members can take open tasks; owners get a link
 * to the Manage tab. Display only: every action goes through the callbacks
 * the page already had (claim_task, Manage tab).
 */
const COLS = [
  { key: 'todo', label: 'To do', tone: '#9aa3ae', test: (t: Task) => t.status === 'open' },
  { key: 'doing', label: 'In progress', tone: 'var(--iris)', test: (t: Task) => ['in_progress', 'submitted', 'changes_requested'].includes(t.status) },
  { key: 'done', label: 'Done', tone: '#12996a', test: (t: Task) => t.status === 'approved' },
] as const;

const STATE: Partial<Record<Task['status'], [string, string]>> = {
  submitted: ['In review', 'w-tb-review'],
  changes_requested: ['Changes requested', 'w-tb-changes'],
  approved: ['Verified', 'w-tb-ok'],
};

const SIZE: Record<string, string> = { small: 'S', medium: 'M', large: 'L' };

function due(d: string | null) {
  if (!d) return null;
  const date = new Date(d + 'T00:00:00');
  const days = Math.round((date.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
  const label = date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  return { label, late: days < 0, soon: days >= 0 && days <= 2 };
}

export function TaskBoard({
  tasks,
  limit,
  canClaim,
  claimingId,
  onClaim,
  onManage,
}: {
  tasks: Task[];
  /** cards per column (the Overview shows a short preview) */
  limit?: number;
  canClaim?: boolean;
  claimingId?: string | null;
  onClaim?: (t: Task) => void;
  /** owner only: open the Manage tab */
  onManage?: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const reduced = useReducedMotion();

  return (
    <div className="w-tb">
      {COLS.map((c) => {
        const list = tasks.filter(c.test);
        const shown = limit ? list.slice(0, limit) : list;
        return (
          <section key={c.key} className="w-tb-col" aria-label={`${c.label}, ${list.length} task${list.length !== 1 ? 's' : ''}`}>
            <header>
              <i style={{ background: c.tone }} />
              <span>{c.label}</span>
              <em>{list.length}</em>
            </header>
            {shown.length === 0 ? (
              <p className="w-tb-empty">{c.key === 'todo' ? 'Nothing waiting' : c.key === 'doing' ? 'No work in progress' : 'Nothing verified yet'}</p>
            ) : (
              <ul>
                {shown.map((t) => {
                  const open = openId === t.id;
                  const state = STATE[t.status];
                  const d = due(t.due_date);
                  const unassigned = !t.assignee_id && t.status === 'open';
                  return (
                    <li key={t.id} className={cn('w-tb-card', open && 'is-open')} style={{ ['--tone' as string]: c.tone }}>
                      <button type="button" className="w-tb-head" aria-expanded={open} onClick={() => setOpenId(open ? null : t.id)}>
                        <b>{t.title}</b>
                        <ChevronDown size={15} className="w-tb-chev" />
                      </button>
                      <div className="w-tb-meta">
                        {state ? <span className={cn('w-tb-tag', state[1])}>{state[0]}</span> : unassigned ? <span className="w-tb-tag w-tb-open">Open to the team</span> : t.tag ? <span className="w-tb-tag">{t.tag}</span> : null}
                        {t.size && SIZE[t.size] && <span className="w-tb-size" title={`${t.size} task`}>{SIZE[t.size]}</span>}
                        {d && <span className={cn('w-tb-due', d.late && 'late', d.soon && 'soon')}><CalendarDays size={12} />{d.label}</span>}
                        <span className="w-tb-who">
                          {t.assignee ? <WAvatar name={t.assignee.display_name} src={t.assignee.avatar_url} size={22} /> : <span className="w-tb-nobody" title="Unassigned"><UserRound size={12} /></span>}
                        </span>
                      </div>
                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div
                            key="body"
                            className="w-tb-body"
                            initial={reduced ? false : { height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                            transition={{ duration: reduced ? 0 : 0.28, ease: [0.2, 0.8, 0.2, 1] }}
                          >
                            <div className="w-tb-body-in">
                              <p>{t.description || 'No description yet.'}</p>
                              {t.acceptance_criteria && (<><small>Done when</small><p>{t.acceptance_criteria}</p></>)}
                              <small>Assigned to</small>
                              <p>{t.assignee?.display_name ?? 'Nobody yet: open to the team'}</p>
                              {onManage && <button type="button" className="w-btn-l w-btn-sm" onClick={onManage}><Settings2 size={14} /> Manage tasks</button>}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {canClaim && unassigned && onClaim && (
                        <button type="button" className="w-btn-d w-btn-sm w-tb-take" disabled={claimingId === t.id} onClick={() => onClaim(t)}>
                          {claimingId === t.id ? 'Taking…' : 'Take task'}
                        </button>
                      )}
                    </li>
                  );
                })}
                {limit && list.length > limit && <li className="w-tb-more">+{list.length - limit} more</li>}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
