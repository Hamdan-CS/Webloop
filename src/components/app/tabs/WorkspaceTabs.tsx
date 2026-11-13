import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTabs, MAX_TABS_BEFORE_SHRINK } from './tabsContext';
import { tabMeta } from './tabMeta';
import { useWorkspace } from '../workspaceContext';
import { WIcon } from '../icons';

/**
 * The demo's .ws-tabs strip as real browser tabs: active tab is the white
 * raised pill, others flat grey; × on hover (always on the active tab);
 * middle-click closes; drag to reorder; "+" opens a New tab; past 12 tabs
 * they shrink, then the strip scrolls. "← Back to site" stays at the end.
 */
export function WorkspaceTabs() {
  const { tabs, activeId, switchTo, close, reorder, newTab } = useTabs();
  const { projects, backToSite } = useWorkspace();
  const { profile } = useAuth();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  // keep the active tab in view when the strip scrolls
  useEffect(() => {
    stripRef.current?.querySelector<HTMLElement>('.w-ws-tab.w-on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeId]);

  return (
    <div className={`w-ws-tabs${tabs.length > MAX_TABS_BEFORE_SHRINK ? ' is-many' : ''}`} role="tablist" aria-label="Open pages">
      <div ref={stripRef} className="w-ws-strip">
        {tabs.map((t) => {
          const m = tabMeta(t.path, projects, profile?.handle);
          const on = t.id === activeId;
          return (
            <div
              key={t.id}
              role="tab"
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              title={m.title}
              draggable
              className={`w-ws-tab${on ? ' w-on' : ''}${overId === t.id && dragId !== t.id ? ' is-over' : ''}${dragId === t.id ? ' is-drag' : ''}`}
              onClick={() => switchTo(t.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); switchTo(t.id); } }}
              onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); close(t.id); } }}
              onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }}
              onDragStart={(e) => { setDragId(t.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', t.id); }}
              onDragOver={(e) => { e.preventDefault(); setOverId(t.id); }}
              onDragLeave={() => setOverId((o) => (o === t.id ? null : o))}
              onDrop={(e) => { e.preventDefault(); if (dragId) reorder(dragId, t.id); setDragId(null); setOverId(null); }}
              onDragEnd={() => { setDragId(null); setOverId(null); }}
            >
              {m.dot ? <i className="w-ws-dot" style={{ background: m.dot }} /> : m.icon ? <WIcon name={m.icon} size={14} /> : null}
              <span className="w-ws-t">{m.title}</span>
              <button type="button" className="w-ws-x" aria-label={`Close ${m.title}`} onClick={(e) => { e.stopPropagation(); close(t.id); }}>
                <WIcon name="close" size={12} />
              </button>
            </div>
          );
        })}
        <button type="button" className="w-ws-plus" aria-label="New tab (⌘T)" title="New tab (⌘T / Alt+T)" onClick={newTab}><WIcon name="plus" size={15} /></button>
      </div>
      <span className="w-sp" />
      <a className="w-ws-back" href="/explore" onClick={(e) => { e.preventDefault(); backToSite(); }}>← Back to site</a>
    </div>
  );
}
